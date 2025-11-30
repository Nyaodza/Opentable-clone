import { CorporateAccount, AccountStatus, ExpensePolicy } from '../models/CorporateAccount';
import { User } from '../models/User';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { sequelize } from '../config/database';
import { Op, Transaction } from 'sequelize';
import { logger } from '../utils/logger';
import { sendEmail } from '../utils/email';
import * as Excel from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { Queue } from 'bull';
import Redis from 'ioredis';

interface CorporateEmployee {
  userId: number;
  corporateAccountId: number;
  employeeId: string;
  department?: string;
  title?: string;
  manager?: number;
  spendingLimit?: number;
  isActive: boolean;
  joinDate: Date;
}

interface ExpenseReport {
  corporateAccountId: number;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  totalReservations: number;
  byDepartment: Record<string, number>;
  byEmployee: Record<string, number>;
  byRestaurant: Record<string, number>;
  byCuisine: Record<string, number>;
  topExpenses: any[];
  savings: number;
}

interface ApprovalRequest {
  id: number;
  corporateAccountId: number;
  employeeId: number;
  reservationId: number;
  amount: number;
  restaurantName: string;
  dateTime: Date;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  managerId?: number;
  approvedAt?: Date;
  rejectionReason?: string;
}

export class CorporateAccountService {
  private redis: Redis;
  private reportQueue: Queue;
  private approvalQueue: Queue;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    this.reportQueue = new Queue('corporate-reports', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.approvalQueue = new Queue('corporate-approvals', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.setupQueueProcessors();
  }

  private setupQueueProcessors(): void {
    // Process report generation
    this.reportQueue.process('generate-report', async (job) => {
      const { accountId, type, startDate, endDate } = job.data;
      await this.generateReport(accountId, type, startDate, endDate);
    });

    // Process approval requests
    this.approvalQueue.process('approval-request', async (job) => {
      const { requestId } = job.data;
      await this.processApprovalRequest(requestId);
    });
  }

  // Account Management
  async createAccount(data: Partial<CorporateAccount>): Promise<CorporateAccount> {
    const transaction = await sequelize.transaction();

    try {
      // Generate unique company code if not provided
      if (!data.companyCode) {
        data.companyCode = await this.generateCompanyCode(data.companyName!);
      }

      // Create the corporate account
      const account = await CorporateAccount.create(data as any, { transaction });

      // Create welcome package
      await this.createWelcomePackage(account, transaction);

      // Send welcome email
      await this.sendWelcomeEmail(account);

      // Schedule onboarding call
      await this.scheduleOnboardingCall(account);

      await transaction.commit();

      logger.info(`Corporate account created: ${account.companyName} (${account.companyCode})`);
      return account;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating corporate account:', error);
      throw error;
    }
  }

  async updateAccount(id: number, updates: Partial<CorporateAccount>): Promise<CorporateAccount> {
    const account = await CorporateAccount.findByPk(id);
    if (!account) throw new Error('Corporate account not found');

    await account.update(updates);

    // Clear cache
    await this.redis.del(`corporate:account:${id}`);

    return account;
  }

  async suspendAccount(id: number, reason: string): Promise<void> {
    const account = await CorporateAccount.findByPk(id);
    if (!account) throw new Error('Corporate account not found');

    await account.update({
      status: AccountStatus.SUSPENDED,
      metadata: { ...account.metadata, suspensionReason: reason, suspendedAt: new Date() }
    });

    // Notify all employees
    await this.notifyEmployees(id, 'Account suspended', reason);
  }

  // Employee Management
  async addEmployee(accountId: number, userData: any): Promise<CorporateEmployee> {
    const account = await CorporateAccount.findByPk(accountId);
    if (!account) throw new Error('Corporate account not found');

    // Check employee limit
    if (account.maxEmployees && account.currentEmployees >= account.maxEmployees) {
      throw new Error('Employee limit reached');
    }

    const transaction = await sequelize.transaction();

    try {
      // Create or find user
      let user = await User.findOne({ where: { email: userData.email } });
      if (!user) {
        user = await User.create({
          ...userData,
          corporateAccountId: accountId,
        }, { transaction });
      } else {
        await user.update({ corporateAccountId: accountId }, { transaction });
      }

      // Create employee record
      const employee: CorporateEmployee = {
        userId: user.id,
        corporateAccountId: accountId,
        employeeId: userData.employeeId || `EMP-${user.id}`,
        department: userData.department,
        title: userData.title,
        manager: userData.managerId,
        spendingLimit: userData.spendingLimit || account.maxPerMealAmount,
        isActive: true,
        joinDate: new Date(),
      };

      // Store in Redis for fast access
      await this.redis.set(
        `corporate:employee:${accountId}:${user.id}`,
        JSON.stringify(employee),
        'EX',
        86400
      );

      // Update employee count
      await account.increment('currentEmployees', { transaction });

      await transaction.commit();

      // Send welcome email to employee
      await this.sendEmployeeWelcomeEmail(employee, account);

      return employee;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async removeEmployee(accountId: number, userId: number): Promise<void> {
    const account = await CorporateAccount.findByPk(accountId);
    if (!account) throw new Error('Corporate account not found');

    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    await user.update({ corporateAccountId: null });
    await account.decrement('currentEmployees');

    // Remove from cache
    await this.redis.del(`corporate:employee:${accountId}:${userId}`);
  }

  async getEmployees(accountId: number): Promise<CorporateEmployee[]> {
    const users = await User.findAll({
      where: { corporateAccountId: accountId },
    });

    const employees: CorporateEmployee[] = [];
    for (const user of users) {
      // Try to get from cache first
      const cached = await this.redis.get(`corporate:employee:${accountId}:${user.id}`);
      if (cached) {
        employees.push(JSON.parse(cached));
      } else {
        // Build employee object
        const employee: CorporateEmployee = {
          userId: user.id,
          corporateAccountId: accountId,
          employeeId: `EMP-${user.id}`,
          isActive: true,
          joinDate: user.createdAt,
        };
        employees.push(employee);
      }
    }

    return employees;
  }

  // Expense Management
  async trackExpense(reservationId: number): Promise<void> {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [User, Restaurant],
    });

    if (!reservation) throw new Error('Reservation not found');

    const user = reservation.User;
    if (!user?.corporateAccountId) return;

    const account = await CorporateAccount.findByPk(user.corporateAccountId);
    if (!account) return;

    // Check if expense needs approval
    if (account.requiresApproval(reservation.totalAmount)) {
      await this.createApprovalRequest(account, user, reservation);
      return;
    }

    // Track the expense
    await this.recordExpense(account, reservation);
  }

  private async recordExpense(account: CorporateAccount, reservation: any): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      // Update account balance
      await account.increment('currentBalance', {
        by: reservation.totalAmount,
        transaction
      });

      // Store expense record
      const expense = {
        corporateAccountId: account.id,
        reservationId: reservation.id,
        userId: reservation.userId,
        restaurantId: reservation.restaurantId,
        amount: reservation.totalAmount,
        date: reservation.dateTime,
        status: 'completed',
      };

      await this.redis.lpush(
        `corporate:expenses:${account.id}`,
        JSON.stringify(expense)
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async createApprovalRequest(
    account: CorporateAccount,
    user: User,
    reservation: any
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: Date.now(),
      corporateAccountId: account.id,
      employeeId: user.id,
      reservationId: reservation.id,
      amount: reservation.totalAmount,
      restaurantName: reservation.Restaurant.name,
      dateTime: reservation.dateTime,
      status: 'pending',
      requestedAt: new Date(),
    };

    // Store in Redis
    await this.redis.set(
      `corporate:approval:${request.id}`,
      JSON.stringify(request),
      'EX',
      604800 // 7 days
    );

    // Add to approval queue
    await this.approvalQueue.add('approval-request', { requestId: request.id });

    // Notify manager
    await this.notifyManager(account, request);

    return request;
  }

  private async processApprovalRequest(requestId: number): Promise<void> {
    const requestData = await this.redis.get(`corporate:approval:${requestId}`);
    if (!requestData) return;

    const request: ApprovalRequest = JSON.parse(requestData);

    // Auto-approve if within auto-approval limit
    const account = await CorporateAccount.findByPk(request.corporateAccountId);
    if (account?.autoApprovalLimit && request.amount <= account.autoApprovalLimit) {
      request.status = 'approved';
      request.approvedAt = new Date();

      await this.redis.set(
        `corporate:approval:${requestId}`,
        JSON.stringify(request),
        'EX',
        604800
      );

      // Process the expense
      const reservation = await Reservation.findByPk(request.reservationId);
      if (reservation) {
        await this.recordExpense(account, reservation);
      }
    }
  }

  // Reporting
  async generateReport(
    accountId: number,
    type: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExpenseReport> {
    const account = await CorporateAccount.findByPk(accountId);
    if (!account) throw new Error('Corporate account not found');

    // Get all expenses for the period
    const reservations = await Reservation.findAll({
      include: [
        {
          model: User,
          where: { corporateAccountId: accountId },
          required: true,
        },
        Restaurant,
      ],
      where: {
        dateTime: {
          [Op.between]: [startDate, endDate],
        },
        status: 'completed',
      },
    });

    // Calculate metrics
    const report: ExpenseReport = {
      corporateAccountId: accountId,
      startDate,
      endDate,
      totalAmount: 0,
      totalReservations: reservations.length,
      byDepartment: {},
      byEmployee: {},
      byRestaurant: {},
      byCuisine: {},
      topExpenses: [],
      savings: 0,
    };

    for (const reservation of reservations) {
      report.totalAmount += reservation.totalAmount;

      // Group by employee
      const employeeName = `${reservation.User.firstName} ${reservation.User.lastName}`;
      report.byEmployee[employeeName] = (report.byEmployee[employeeName] || 0) + reservation.totalAmount;

      // Group by restaurant
      const restaurantName = reservation.Restaurant.name;
      report.byRestaurant[restaurantName] = (report.byRestaurant[restaurantName] || 0) + reservation.totalAmount;

      // Track top expenses
      if (reservation.totalAmount > 100) {
        report.topExpenses.push({
          date: reservation.dateTime,
          amount: reservation.totalAmount,
          restaurant: restaurantName,
          employee: employeeName,
        });
      }
    }

    // Calculate savings with corporate discount
    if (account.discountRate) {
      report.savings = report.totalAmount * (account.discountRate / 100);
    }

    // Sort top expenses
    report.topExpenses.sort((a, b) => b.amount - a.amount);
    report.topExpenses = report.topExpenses.slice(0, 10);

    // Cache the report
    await this.redis.set(
      `corporate:report:${accountId}:${type}:${startDate.getTime()}`,
      JSON.stringify(report),
      'EX',
      3600
    );

    return report;
  }

  async generateExcelReport(accountId: number, startDate: Date, endDate: Date): Promise<Buffer> {
    const report = await this.generateReport(accountId, 'excel', startDate, endDate);

    const workbook = new Excel.Workbook();
    const sheet = workbook.addWorksheet('Expense Report');

    // Add headers
    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Employee', key: 'employee', width: 25 },
      { header: 'Restaurant', key: 'restaurant', width: 30 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    // Add data (simplified for example)
    for (const expense of report.topExpenses) {
      sheet.addRow({
        date: expense.date,
        employee: expense.employee,
        restaurant: expense.restaurant,
        amount: expense.amount,
        status: 'Completed',
      });
    }

    // Add summary
    sheet.addRow({});
    sheet.addRow({ employee: 'Total', amount: report.totalAmount });
    sheet.addRow({ employee: 'Savings', amount: report.savings });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }

  // Helper Methods
  private async generateCompanyCode(companyName: string): Promise<string> {
    const prefix = companyName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);

    const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${suffix}`;
  }

  private async createWelcomePackage(account: CorporateAccount, transaction: Transaction): Promise<void> {
    // Create onboarding checklist
    const checklist = {
      addEmployees: false,
      configurePolicies: false,
      setupBilling: false,
      scheduleTraining: false,
      firstReservation: false,
    };

    await account.update({
      metadata: { ...account.metadata, onboardingChecklist: checklist }
    }, { transaction });
  }

  private async sendWelcomeEmail(account: CorporateAccount): Promise<void> {
    await sendEmail({
      to: account.primaryContactEmail,
      subject: `Welcome to OpenTable for Business - ${account.companyName}`,
      template: 'corporate-welcome',
      data: {
        companyName: account.companyName,
        companyCode: account.companyCode,
        contactName: account.primaryContactName,
        creditLimit: account.creditLimit,
      },
    });
  }

  private async sendEmployeeWelcomeEmail(employee: CorporateEmployee, account: CorporateAccount): Promise<void> {
    const user = await User.findByPk(employee.userId);
    if (!user) return;

    await sendEmail({
      to: user.email,
      subject: `You've been added to ${account.companyName}'s OpenTable for Business`,
      template: 'employee-welcome',
      data: {
        employeeName: `${user.firstName} ${user.lastName}`,
        companyName: account.companyName,
        spendingLimit: employee.spendingLimit,
        policies: account.expensePolicy,
      },
    });
  }

  private async scheduleOnboardingCall(account: CorporateAccount): Promise<void> {
    // Schedule a call with the account manager
    logger.info(`Scheduling onboarding call for ${account.companyName}`);
  }

  private async notifyEmployees(accountId: number, subject: string, message: string): Promise<void> {
    const employees = await this.getEmployees(accountId);

    for (const employee of employees) {
      const user = await User.findByPk(employee.userId);
      if (user) {
        await sendEmail({
          to: user.email,
          subject,
          text: message,
        });
      }
    }
  }

  private async notifyManager(account: CorporateAccount, request: ApprovalRequest): Promise<void> {
    if (!account.accountManagerId) return;

    const manager = await User.findByPk(account.accountManagerId);
    if (manager) {
      await sendEmail({
        to: manager.email,
        subject: 'Expense Approval Required',
        template: 'approval-request',
        data: request,
      });
    }
  }
}

export default new CorporateAccountService();