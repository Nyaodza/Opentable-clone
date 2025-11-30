import { Op } from 'sequelize';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { AuditLog } from '../models/audit-log.model';
import { EncryptionService } from './encryption.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export interface DataRetentionPolicy {
  type: string;
  retentionDays: number;
  archiveEnabled: boolean;
  deleteEnabled: boolean;
}

export interface PrivacyRequest {
  id: string;
  userId: string;
  type: 'access' | 'delete' | 'rectify' | 'portability' | 'restrict';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  completedAt?: Date;
  data?: any;
}

export class ComplianceService {
  private static retentionPolicies: Map<string, DataRetentionPolicy> = new Map([
    ['user_data', { type: 'user_data', retentionDays: 1095, archiveEnabled: true, deleteEnabled: true }], // 3 years
    ['reservations', { type: 'reservations', retentionDays: 730, archiveEnabled: true, deleteEnabled: false }], // 2 years
    ['reviews', { type: 'reviews', retentionDays: 1825, archiveEnabled: false, deleteEnabled: false }], // 5 years
    ['audit_logs', { type: 'audit_logs', retentionDays: 2555, archiveEnabled: true, deleteEnabled: false }], // 7 years
    ['payment_data', { type: 'payment_data', retentionDays: 2555, archiveEnabled: true, deleteEnabled: false }], // 7 years
    ['marketing_data', { type: 'marketing_data', retentionDays: 365, archiveEnabled: false, deleteEnabled: true }], // 1 year
  ]);

  // GDPR - Right to Access
  static async handleDataAccessRequest(userId: string): Promise<any> {
    logger.info(`Processing data access request for user: ${userId}`);

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Collect all user data
    const userData = await this.collectUserData(userId);

    // Log the request
    await AuditLog.create({
      userId,
      action: 'data_access_request',
      category: 'data_access',
      status: 'success',
      details: { dataTypes: Object.keys(userData) },
    });

    return userData;
  }

  // GDPR - Right to Erasure (Right to be Forgotten)
  static async handleDataDeletionRequest(
    userId: string,
    options: {
      reason?: string;
      immediate?: boolean;
      retainForLegal?: boolean;
    } = {}
  ): Promise<void> {
    logger.info(`Processing data deletion request for user: ${userId}`);

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check for legal holds
    if (await this.hasLegalHold(userId)) {
      throw new AppError('Cannot delete data due to legal hold', 403);
    }

    if (options.immediate && !options.retainForLegal) {
      // Immediate deletion
      await this.deleteUserData(userId);
    } else {
      // Schedule for deletion
      await this.anonymizeUserData(userId);
      user.deletionScheduledAt = new Date();
      await user.save();
    }

    // Log the request
    await AuditLog.create({
      userId,
      action: 'data_deletion_request',
      category: 'data_access',
      status: 'success',
      details: {
        reason: options.reason,
        immediate: options.immediate,
        retainForLegal: options.retainForLegal,
      },
    });
  }

  // GDPR - Right to Rectification
  static async handleDataRectificationRequest(
    userId: string,
    updates: any
  ): Promise<void> {
    logger.info(`Processing data rectification request for user: ${userId}`);

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Validate and apply updates
    const allowedFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
    const filteredUpdates: any = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    await user.update(filteredUpdates);

    // Log the request
    await AuditLog.create({
      userId,
      action: 'data_rectification_request',
      category: 'data_access',
      status: 'success',
      details: {
        fields: Object.keys(filteredUpdates),
        previousValues: allowedFields.reduce((acc, field) => {
          if (filteredUpdates[field]) {
            acc[field] = user.getDataValue(field);
          }
          return acc;
        }, {}),
      },
    });
  }

  // GDPR - Right to Data Portability
  static async handleDataPortabilityRequest(
    userId: string,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<{ data: string; format: string; filename: string }> {
    logger.info(`Processing data portability request for user: ${userId}`);

    const userData = await this.collectUserData(userId);
    let data: string;
    let filename: string;

    switch (format) {
      case 'json':
        data = JSON.stringify(userData, null, 2);
        filename = `user_data_${userId}_${Date.now()}.json`;
        break;
      case 'csv':
        data = await this.convertToCSV(userData);
        filename = `user_data_${userId}_${Date.now()}.csv`;
        break;
      case 'xml':
        data = await this.convertToXML(userData);
        filename = `user_data_${userId}_${Date.now()}.xml`;
        break;
      default:
        throw new AppError('Unsupported format', 400);
    }

    // Log the request
    await AuditLog.create({
      userId,
      action: 'data_portability_request',
      category: 'data_access',
      status: 'success',
      details: { format },
    });

    return { data, format, filename };
  }

  // GDPR - Right to Restriction of Processing
  static async handleProcessingRestriction(
    userId: string,
    restrictions: {
      marketing?: boolean;
      profiling?: boolean;
      analytics?: boolean;
      thirdPartySharing?: boolean;
    }
  ): Promise<void> {
    logger.info(`Processing restriction request for user: ${userId}`);

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update user preferences
    user.privacySettings = {
      ...user.privacySettings,
      ...restrictions,
    };
    await user.save();

    // Log the request
    await AuditLog.create({
      userId,
      action: 'processing_restriction_request',
      category: 'data_access',
      status: 'success',
      details: restrictions,
    });
  }

  // Data collection methods
  private static async collectUserData(userId: string): Promise<any> {
    const [
      user,
      reservations,
      reviews,
      auditLogs,
      preferences,
    ] = await Promise.all([
      User.findByPk(userId, {
        attributes: { exclude: ['password', 'twoFactorSecret'] },
      }),
      Reservation.findAll({
        where: { userId },
        include: [Restaurant],
      }),
      this.getUserReviews(userId),
      this.getUserAuditLogs(userId),
      this.getUserPreferences(userId),
    ]);

    return {
      personalData: user,
      reservations,
      reviews,
      activityLogs: auditLogs,
      preferences,
      exportedAt: new Date(),
    };
  }

  private static async deleteUserData(userId: string): Promise<void> {
    // Delete in correct order to respect foreign key constraints
    await Promise.all([
      this.deleteUserReviews(userId),
      this.deleteUserReservations(userId),
      this.deleteUserPreferences(userId),
    ]);

    // Finally delete the user
    await User.destroy({ where: { id: userId } });
  }

  private static async anonymizeUserData(userId: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) return;

    // Anonymize personal data
    user.email = `deleted_${userId}@example.com`;
    user.firstName = 'Deleted';
    user.lastName = 'User';
    user.phone = null;
    user.profileImage = null;
    user.isActive = false;
    user.anonymizedAt = new Date();

    await user.save();

    // Anonymize related data
    await this.anonymizeUserReservations(userId);
    await this.anonymizeUserReviews(userId);
  }

  // Data retention and cleanup
  static async enforceDataRetention(): Promise<void> {
    logger.info('Enforcing data retention policies');

    for (const [type, policy] of this.retentionPolicies) {
      await this.enforceRetentionPolicy(type, policy);
    }
  }

  private static async enforceRetentionPolicy(
    type: string,
    policy: DataRetentionPolicy
  ): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    switch (type) {
      case 'user_data':
        await this.cleanupUserData(cutoffDate, policy);
        break;
      case 'reservations':
        await this.cleanupReservations(cutoffDate, policy);
        break;
      case 'audit_logs':
        await this.cleanupAuditLogs(cutoffDate, policy);
        break;
      // Add more cases as needed
    }
  }

  private static async cleanupUserData(
    cutoffDate: Date,
    policy: DataRetentionPolicy
  ): Promise<void> {
    const usersToCleanup = await User.findAll({
      where: {
        [Op.or]: [
          { deletionScheduledAt: { [Op.lt]: cutoffDate } },
          {
            [Op.and]: [
              { lastActiveAt: { [Op.lt]: cutoffDate } },
              { isActive: false },
            ],
          },
        ],
      },
    });

    for (const user of usersToCleanup) {
      if (policy.archiveEnabled) {
        await this.archiveUserData(user);
      }
      if (policy.deleteEnabled) {
        await this.deleteUserData(user.id);
      }
    }
  }

  // Consent management
  static async updateConsent(
    userId: string,
    consents: {
      marketing?: boolean;
      analytics?: boolean;
      thirdPartySharing?: boolean;
      cookies?: {
        necessary: boolean;
        functional: boolean;
        analytics: boolean;
        marketing: boolean;
      };
    }
  ): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.consents = {
      ...user.consents,
      ...consents,
      updatedAt: new Date(),
    };

    await user.save();

    // Log consent update
    await AuditLog.create({
      userId,
      action: 'consent_update',
      category: 'data_access',
      status: 'success',
      details: consents,
    });
  }

  static async getConsentHistory(userId: string): Promise<any[]> {
    return AuditLog.findAll({
      where: {
        userId,
        action: 'consent_update',
      },
      order: [['createdAt', 'DESC']],
    });
  }

  // PCI DSS Compliance
  static async handlePaymentDataCompliance(paymentData: any): Promise<any> {
    // Tokenize sensitive payment data
    const cardToken = await EncryptionService.tokenize(
      paymentData.cardNumber,
      'creditcard'
    );

    // Store only tokenized data
    return {
      cardToken,
      last4: paymentData.cardNumber.slice(-4),
      expiryMonth: paymentData.expiryMonth,
      expiryYear: paymentData.expiryYear,
      brand: this.detectCardBrand(paymentData.cardNumber),
    };
  }

  // CCPA Compliance
  static async handleCCPARequest(
    userId: string,
    requestType: 'opt-out' | 'access' | 'delete'
  ): Promise<any> {
    switch (requestType) {
      case 'opt-out':
        return this.handleCCPAOptOut(userId);
      case 'access':
        return this.handleDataAccessRequest(userId);
      case 'delete':
        return this.handleDataDeletionRequest(userId);
      default:
        throw new AppError('Invalid request type', 400);
    }
  }

  private static async handleCCPAOptOut(userId: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.ccpaOptOut = {
      saleOfPersonalInfo: true,
      sharingWithThirdParties: true,
      targetedAdvertising: true,
      optOutDate: new Date(),
    };

    await user.save();

    await AuditLog.create({
      userId,
      action: 'ccpa_opt_out',
      category: 'data_access',
      status: 'success',
      details: user.ccpaOptOut,
    });
  }

  // Helper methods
  private static async hasLegalHold(userId: string): Promise<boolean> {
    // Check if user data is under legal hold
    // This would check against a legal hold database/service
    return false; // Simplified
  }

  private static detectCardBrand(cardNumber: string): string {
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
    };

    for (const [brand, pattern] of Object.entries(patterns)) {
      if (pattern.test(cardNumber)) {
        return brand;
      }
    }

    return 'unknown';
  }

  private static async convertToCSV(data: any): Promise<string> {
    // Implement CSV conversion
    // This is a simplified example
    const rows: string[] = [];
    
    // Add headers
    rows.push('Type,Field,Value');
    
    // Add data
    for (const [type, values] of Object.entries(data)) {
      if (Array.isArray(values)) {
        values.forEach((item, index) => {
          for (const [field, value] of Object.entries(item)) {
            rows.push(`${type}[${index}],${field},"${value}"`);
          }
        });
      } else if (typeof values === 'object') {
        for (const [field, value] of Object.entries(values)) {
          rows.push(`${type},${field},"${value}"`);
        }
      }
    }

    return rows.join('\n');
  }

  private static async convertToXML(data: any): Promise<string> {
    // Implement XML conversion
    // This is a simplified example
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<userData>\n';
    
    const convertToXMLRecursive = (obj: any, indent: string = '  '): string => {
      let result = '';
      
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
          value.forEach(item => {
            result += `${indent}<${key}>\n`;
            result += convertToXMLRecursive(item, indent + '  ');
            result += `${indent}</${key}>\n`;
          });
        } else if (typeof value === 'object' && value !== null) {
          result += `${indent}<${key}>\n`;
          result += convertToXMLRecursive(value, indent + '  ');
          result += `${indent}</${key}>\n`;
        } else {
          result += `${indent}<${key}>${value}</${key}>\n`;
        }
      }
      
      return result;
    };
    
    xml += convertToXMLRecursive(data);
    xml += '</userData>';
    
    return xml;
  }

  // Placeholder methods
  private static async getUserReviews(userId: string): Promise<any[]> {
    // Implement based on your review model
    return [];
  }

  private static async getUserAuditLogs(userId: string): Promise<any[]> {
    return AuditLog.getUserActivity(userId, { limit: 1000 });
  }

  private static async getUserPreferences(userId: string): Promise<any> {
    // Implement based on your preferences model
    return {};
  }

  private static async deleteUserReviews(userId: string): Promise<void> {
    // Implement based on your review model
  }

  private static async deleteUserReservations(userId: string): Promise<void> {
    await Reservation.destroy({ where: { userId } });
  }

  private static async deleteUserPreferences(userId: string): Promise<void> {
    // Implement based on your preferences model
  }

  private static async anonymizeUserReservations(userId: string): Promise<void> {
    await Reservation.update(
      { specialRequests: null, notes: null },
      { where: { userId } }
    );
  }

  private static async anonymizeUserReviews(userId: string): Promise<void> {
    // Implement based on your review model
  }

  private static async archiveUserData(user: User): Promise<void> {
    // Implement archival logic (e.g., move to cold storage)
  }

  private static async cleanupReservations(
    cutoffDate: Date,
    policy: DataRetentionPolicy
  ): Promise<void> {
    // Implement reservation cleanup
  }

  private static async cleanupAuditLogs(
    cutoffDate: Date,
    policy: DataRetentionPolicy
  ): Promise<void> {
    await AuditLog.archiveOldLogs(policy.retentionDays);
  }
}