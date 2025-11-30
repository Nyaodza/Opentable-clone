import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { GroupReservation } from '../models/GroupReservation';
import { sequelize } from '../config/database';
import { Op, Transaction } from 'sequelize';
import { logger } from '../utils/logger';
import { sendEmail } from '../utils/email';
import { sendSMS } from '../utils/sms';
import * as socketIo from 'socket.io';
import Redis from 'ioredis';
import * as crypto from 'crypto';

interface GroupMember {
  userId?: number;
  email: string;
  name: string;
  phone?: string;
  dietaryRestrictions?: string[];
  preferences?: {
    cuisines?: string[];
    priceRange?: number[];
    location?: string;
  };
  rsvpStatus: 'pending' | 'accepted' | 'declined' | 'maybe';
  isOrganizer: boolean;
  canVote: boolean;
  canInvite: boolean;
  paymentResponsibility?: number; // percentage
  amountOwed?: number;
  paymentStatus?: 'pending' | 'paid' | 'partial';
  joinedAt: Date;
}

interface GroupPoll {
  id: string;
  groupId: number;
  type: 'restaurant' | 'date' | 'time' | 'cuisine';
  question: string;
  options: PollOption[];
  createdBy: number;
  endsAt: Date;
  isActive: boolean;
  allowMultipleVotes: boolean;
  isAnonymous: boolean;
  results?: PollResults;
}

interface PollOption {
  id: string;
  value: any;
  metadata?: Record<string, any>;
  votes: number;
  voters: number[];
}

interface PollResults {
  winner: PollOption;
  totalVotes: number;
  participationRate: number;
  breakdown: Record<string, number>;
}

interface GroupCalendar {
  groupId: number;
  availableDates: Date[];
  blackoutDates: Date[];
  memberAvailability: Record<number, {
    available: Date[];
    unavailable: Date[];
    maybe: Date[];
  }>;
  suggestedDates: Date[];
}

interface GroupExpense {
  id: string;
  groupId: number;
  reservationId: number;
  totalAmount: number;
  splitMethod: 'equal' | 'custom' | 'itemized';
  members: {
    userId: number;
    amountOwed: number;
    amountPaid: number;
    items?: any[];
  }[];
  paymentRequests: PaymentRequest[];
  settlementStatus: 'pending' | 'partial' | 'complete';
}

interface PaymentRequest {
  id: string;
  fromUserId: number;
  toUserId: number;
  amount: number;
  status: 'pending' | 'paid' | 'declined';
  method?: 'venmo' | 'paypal' | 'zelle' | 'cash' | 'card';
  requestedAt: Date;
  paidAt?: Date;
  notes?: string;
}

export class GroupCoordinationService {
  private redis: Redis;
  private io: socketIo.Server;
  private activeGroups: Map<number, Set<number>> = new Map(); // groupId -> Set of userIds

  constructor(io: socketIo.Server) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      socket.on('join-group', (groupId: number, userId: number) => {
        socket.join(`group-${groupId}`);
        this.addUserToActiveGroup(groupId, userId);
      });

      socket.on('leave-group', (groupId: number, userId: number) => {
        socket.leave(`group-${groupId}`);
        this.removeUserFromActiveGroup(groupId, userId);
      });

      socket.on('group-message', (data) => {
        this.io.to(`group-${data.groupId}`).emit('new-message', data);
      });

      socket.on('vote', async (data) => {
        await this.castVote(data.pollId, data.userId, data.optionId);
      });
    });
  }

  // Group Management
  async createGroup(organizerId: number, data: any): Promise<GroupReservation> {
    const transaction = await sequelize.transaction();

    try {
      // Create the group reservation
      const group = await GroupReservation.create({
        organizerId,
        name: data.name,
        description: data.description,
        targetDate: data.targetDate,
        targetTime: data.targetTime,
        partySize: data.partySize || 2,
        status: 'planning',
        preferences: data.preferences || {},
        metadata: {
          createdAt: new Date(),
          inviteCode: this.generateInviteCode(),
          settings: {
            allowGuestInvites: data.allowGuestInvites || false,
            requireRsvp: data.requireRsvp || true,
            autoSelectWinner: data.autoSelectWinner || false,
            splitBillMethod: data.splitBillMethod || 'equal',
          },
        },
      }, { transaction });

      // Add organizer as first member
      await this.addMember(group.id, {
        userId: organizerId,
        email: '',
        name: 'Organizer',
        isOrganizer: true,
        canVote: true,
        canInvite: true,
        rsvpStatus: 'accepted',
        joinedAt: new Date(),
      }, transaction);

      // Send initial invitations if provided
      if (data.invites && data.invites.length > 0) {
        await this.sendInvitations(group.id, data.invites, organizerId);
      }

      await transaction.commit();

      // Create group calendar
      await this.initializeGroupCalendar(group.id);

      // Notify real-time clients
      this.broadcastToGroup(group.id, 'group-created', { group });

      logger.info(`Group created: ${group.name} by user ${organizerId}`);
      return group;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating group:', error);
      throw error;
    }
  }

  async addMember(
    groupId: number,
    member: GroupMember,
    transaction?: Transaction
  ): Promise<void> {
    // Store member in Redis for fast access
    const memberKey = `group:${groupId}:member:${member.email}`;
    await this.redis.set(memberKey, JSON.stringify(member), 'EX', 604800); // 7 days

    // Update group member list
    await this.redis.sadd(`group:${groupId}:members`, member.email);

    // If user exists, update their group associations
    if (member.userId) {
      await this.redis.sadd(`user:${member.userId}:groups`, groupId.toString());
    }
  }

  async sendInvitations(groupId: number, invites: any[], inviterId: number): Promise<void> {
    const group = await GroupReservation.findByPk(groupId);
    if (!group) throw new Error('Group not found');

    const inviter = await User.findByPk(inviterId);
    const inviteCode = group.metadata?.inviteCode || this.generateInviteCode();

    for (const invite of invites) {
      // Generate unique invitation token
      const token = crypto.randomBytes(32).toString('hex');

      // Store invitation
      await this.redis.set(
        `invite:${token}`,
        JSON.stringify({
          groupId,
          email: invite.email,
          name: invite.name,
          invitedBy: inviterId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }),
        'EX',
        604800 // 7 days
      );

      // Send invitation email
      await sendEmail({
        to: invite.email,
        subject: `${inviter?.firstName} invited you to plan a group dinner`,
        template: 'group-invitation',
        data: {
          inviterName: `${inviter?.firstName} ${inviter?.lastName}`,
          groupName: group.name,
          targetDate: group.targetDate,
          inviteLink: `${process.env.FRONTEND_URL}/group/join/${token}`,
          inviteCode,
        },
      });

      // Send SMS if phone provided
      if (invite.phone) {
        await sendSMS({
          to: invite.phone,
          message: `${inviter?.firstName} invited you to plan a group dinner "${group.name}". Join at: ${process.env.FRONTEND_URL}/group/join/${token}`,
        });
      }
    }
  }

  // Polling & Voting
  async createPoll(groupId: number, creatorId: number, pollData: any): Promise<GroupPoll> {
    const poll: GroupPoll = {
      id: crypto.randomUUID(),
      groupId,
      type: pollData.type,
      question: pollData.question,
      options: pollData.options.map((opt: any) => ({
        id: crypto.randomUUID(),
        value: opt.value,
        metadata: opt.metadata,
        votes: 0,
        voters: [],
      })),
      createdBy: creatorId,
      endsAt: new Date(pollData.endsAt),
      isActive: true,
      allowMultipleVotes: pollData.allowMultipleVotes || false,
      isAnonymous: pollData.isAnonymous || false,
    };

    // Store poll in Redis
    await this.redis.set(
      `group:${groupId}:poll:${poll.id}`,
      JSON.stringify(poll),
      'EX',
      86400 * 7 // 7 days
    );

    // Add to active polls list
    await this.redis.sadd(`group:${groupId}:polls:active`, poll.id);

    // Notify group members
    this.broadcastToGroup(groupId, 'new-poll', { poll });

    // Send notifications
    await this.notifyGroupMembers(groupId, 'New Poll', `Vote on: ${poll.question}`);

    return poll;
  }

  async castVote(pollId: string, userId: number, optionIds: string[]): Promise<void> {
    const pollKey = await this.redis.keys(`group:*:poll:${pollId}`);
    if (pollKey.length === 0) throw new Error('Poll not found');

    const pollData = await this.redis.get(pollKey[0]);
    if (!pollData) throw new Error('Poll not found');

    const poll: GroupPoll = JSON.parse(pollData);

    // Check if poll is still active
    if (!poll.isActive || new Date() > new Date(poll.endsAt)) {
      throw new Error('Poll has ended');
    }

    // Check if user already voted (if not allowing multiple votes)
    if (!poll.allowMultipleVotes) {
      const hasVoted = poll.options.some(opt => opt.voters.includes(userId));
      if (hasVoted) {
        throw new Error('You have already voted');
      }
    }

    // Cast votes
    for (const optionId of optionIds) {
      const option = poll.options.find(opt => opt.id === optionId);
      if (option) {
        option.votes++;
        if (!poll.isAnonymous) {
          option.voters.push(userId);
        }
      }
    }

    // Save updated poll
    await this.redis.set(
      pollKey[0],
      JSON.stringify(poll),
      'EX',
      86400 * 7
    );

    // Broadcast update
    this.broadcastToGroup(poll.groupId, 'poll-update', { poll });

    // Check if poll should end (all members voted)
    await this.checkPollCompletion(poll);
  }

  private async checkPollCompletion(poll: GroupPoll): Promise<void> {
    const members = await this.redis.smembers(`group:${poll.groupId}:members`);
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voters.length, 0);

    if (totalVotes >= members.length) {
      await this.endPoll(poll.id);
    }
  }

  async endPoll(pollId: string): Promise<PollResults> {
    const pollKey = await this.redis.keys(`group:*:poll:${pollId}`);
    if (pollKey.length === 0) throw new Error('Poll not found');

    const pollData = await this.redis.get(pollKey[0]);
    if (!pollData) throw new Error('Poll not found');

    const poll: GroupPoll = JSON.parse(pollData);
    poll.isActive = false;

    // Calculate results
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    const winner = poll.options.reduce((max, opt) =>
      opt.votes > max.votes ? opt : max
    );

    const members = await this.redis.smembers(`group:${poll.groupId}:members`);
    const participationRate = (totalVotes / members.length) * 100;

    const results: PollResults = {
      winner,
      totalVotes,
      participationRate,
      breakdown: poll.options.reduce((acc, opt) => {
        acc[opt.value] = opt.votes;
        return acc;
      }, {} as Record<string, number>),
    };

    poll.results = results;

    // Save final poll state
    await this.redis.set(pollKey[0], JSON.stringify(poll));

    // Remove from active polls
    await this.redis.srem(`group:${poll.groupId}:polls:active`, pollId);

    // Notify group
    this.broadcastToGroup(poll.groupId, 'poll-ended', { poll, results });

    // Auto-select restaurant if configured
    if (poll.type === 'restaurant') {
      await this.autoSelectRestaurant(poll.groupId, winner.value);
    }

    return results;
  }

  // Calendar & Availability
  async initializeGroupCalendar(groupId: number): Promise<void> {
    const calendar: GroupCalendar = {
      groupId,
      availableDates: [],
      blackoutDates: [],
      memberAvailability: {},
      suggestedDates: [],
    };

    await this.redis.set(
      `group:${groupId}:calendar`,
      JSON.stringify(calendar),
      'EX',
      604800
    );
  }

  async updateAvailability(
    groupId: number,
    userId: number,
    availability: {
      available: Date[];
      unavailable: Date[];
      maybe: Date[];
    }
  ): Promise<void> {
    const calendarKey = `group:${groupId}:calendar`;
    const calendarData = await this.redis.get(calendarKey);

    if (!calendarData) {
      await this.initializeGroupCalendar(groupId);
      return this.updateAvailability(groupId, userId, availability);
    }

    const calendar: GroupCalendar = JSON.parse(calendarData);
    calendar.memberAvailability[userId] = availability;

    // Calculate best dates based on member availability
    calendar.suggestedDates = this.calculateBestDates(calendar);

    await this.redis.set(calendarKey, JSON.stringify(calendar), 'EX', 604800);

    // Notify group of availability update
    this.broadcastToGroup(groupId, 'availability-update', {
      userId,
      availability,
      suggestedDates: calendar.suggestedDates,
    });
  }

  private calculateBestDates(calendar: GroupCalendar): Date[] {
    const dateScores = new Map<string, number>();

    // Score each date based on member availability
    Object.values(calendar.memberAvailability).forEach(memberAvail => {
      memberAvail.available.forEach(date => {
        const key = date.toString();
        dateScores.set(key, (dateScores.get(key) || 0) + 2);
      });
      memberAvail.maybe.forEach(date => {
        const key = date.toString();
        dateScores.set(key, (dateScores.get(key) || 0) + 1);
      });
    });

    // Sort dates by score
    const sortedDates = Array.from(dateScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([date]) => new Date(date));

    return sortedDates;
  }

  // Expense Splitting
  async createExpenseSplit(
    groupId: number,
    reservationId: number,
    totalAmount: number,
    splitMethod: 'equal' | 'custom' | 'itemized',
    customSplits?: Record<number, number>
  ): Promise<GroupExpense> {
    const members = await this.redis.smembers(`group:${groupId}:members`);
    const memberCount = members.length;

    const expense: GroupExpense = {
      id: crypto.randomUUID(),
      groupId,
      reservationId,
      totalAmount,
      splitMethod,
      members: [],
      paymentRequests: [],
      settlementStatus: 'pending',
    };

    // Calculate individual amounts
    if (splitMethod === 'equal') {
      const amountPerPerson = totalAmount / memberCount;
      for (const memberEmail of members) {
        const memberData = await this.redis.get(`group:${groupId}:member:${memberEmail}`);
        if (memberData) {
          const member: GroupMember = JSON.parse(memberData);
          if (member.userId) {
            expense.members.push({
              userId: member.userId,
              amountOwed: amountPerPerson,
              amountPaid: 0,
            });
          }
        }
      }
    } else if (splitMethod === 'custom' && customSplits) {
      for (const [userId, amount] of Object.entries(customSplits)) {
        expense.members.push({
          userId: parseInt(userId),
          amountOwed: amount,
          amountPaid: 0,
        });
      }
    }

    // Save expense
    await this.redis.set(
      `group:${groupId}:expense:${expense.id}`,
      JSON.stringify(expense),
      'EX',
      2592000 // 30 days
    );

    // Create payment requests
    await this.createPaymentRequests(expense);

    return expense;
  }

  private async createPaymentRequests(expense: GroupExpense): Promise<void> {
    // Find the organizer (who typically pays initially)
    const group = await GroupReservation.findByPk(expense.groupId);
    if (!group) return;

    const organizerId = group.organizerId;

    for (const member of expense.members) {
      if (member.userId !== organizerId && member.amountOwed > 0) {
        const request: PaymentRequest = {
          id: crypto.randomUUID(),
          fromUserId: member.userId,
          toUserId: organizerId,
          amount: member.amountOwed,
          status: 'pending',
          requestedAt: new Date(),
        };

        expense.paymentRequests.push(request);

        // Send payment request notification
        await this.sendPaymentRequest(request);
      }
    }

    // Update expense with payment requests
    await this.redis.set(
      `group:${expense.groupId}:expense:${expense.id}`,
      JSON.stringify(expense),
      'EX',
      2592000
    );
  }

  private async sendPaymentRequest(request: PaymentRequest): Promise<void> {
    const fromUser = await User.findByPk(request.fromUserId);
    const toUser = await User.findByPk(request.toUserId);

    if (!fromUser || !toUser) return;

    // Send email notification
    await sendEmail({
      to: fromUser.email,
      subject: 'Payment Request for Group Dinner',
      template: 'payment-request',
      data: {
        fromName: `${fromUser.firstName} ${fromUser.lastName}`,
        toName: `${toUser.firstName} ${toUser.lastName}`,
        amount: request.amount,
        paymentLinks: {
          venmo: `venmo://paycharge?txn=pay&recipients=${toUser.email}&amount=${request.amount}`,
          paypal: `https://www.paypal.com/paypalme/${toUser.email}/${request.amount}`,
        },
      },
    });

    // Send push notification if available
    this.io.to(`user-${request.fromUserId}`).emit('payment-request', request);
  }

  // Helper Methods
  private generateInviteCode(): string {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  private addUserToActiveGroup(groupId: number, userId: number): void {
    if (!this.activeGroups.has(groupId)) {
      this.activeGroups.set(groupId, new Set());
    }
    this.activeGroups.get(groupId)?.add(userId);
  }

  private removeUserFromActiveGroup(groupId: number, userId: number): void {
    this.activeGroups.get(groupId)?.delete(userId);
  }

  private broadcastToGroup(groupId: number, event: string, data: any): void {
    this.io.to(`group-${groupId}`).emit(event, data);
  }

  private async notifyGroupMembers(groupId: number, subject: string, message: string): Promise<void> {
    const members = await this.redis.smembers(`group:${groupId}:members`);

    for (const memberEmail of members) {
      const memberData = await this.redis.get(`group:${groupId}:member:${memberEmail}`);
      if (memberData) {
        const member: GroupMember = JSON.parse(memberData);

        if (member.userId) {
          // Real-time notification
          this.io.to(`user-${member.userId}`).emit('notification', {
            subject,
            message,
            groupId,
          });
        }

        // Email notification
        await sendEmail({
          to: member.email || memberEmail,
          subject,
          text: message,
        });
      }
    }
  }

  private async autoSelectRestaurant(groupId: number, restaurantId: number): Promise<void> {
    const group = await GroupReservation.findByPk(groupId);
    if (!group) return;

    await group.update({
      restaurantId,
      status: 'pending_confirmation',
    });

    await this.notifyGroupMembers(
      groupId,
      'Restaurant Selected',
      `The group has selected a restaurant based on voting results.`
    );
  }
}

export default GroupCoordinationService;