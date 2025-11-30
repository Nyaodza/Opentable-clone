import { Op } from 'sequelize';
import { SocialDiningGroup } from '../models/SocialDiningGroup';
import { GroupMembership, MembershipRole, MembershipStatus } from '../models/GroupMembership';
import { GroupReservation, GroupReservationStatus, BillSplitType } from '../models/GroupReservation';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { NotificationService } from './notification.service';
import { ReservationService } from './reservation.service';
import { EmailService } from './email.service';
import { redisClient } from '../config/redis';
import { pubsub, EVENTS } from '../config/pubsub';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { logInfo, logError } from '../utils/logger';

interface CreateGroupData {
  name: string;
  description?: string;
  isPrivate: boolean;
  maxMembers?: number;
  preferences?: {
    cuisineTypes: string[];
    priceRanges: string[];
    dietaryRestrictions: string[];
    preferredTimes: string[];
    maxDistance: number;
  };
  settings?: {
    allowMemberInvites: boolean;
    requireApproval: boolean;
    autoSplitBills: boolean;
    shareReservations: boolean;
  };
}

interface CreateGroupReservationData {
  restaurantId: string;
  proposedDate: Date;
  proposedTime: string;
  partySize: number;
  billSplitType: BillSplitType;
  specialRequests?: string;
  votingDeadline?: Date;
  alternativeOptions?: Array<{
    restaurantId: string;
    date: Date;
    time: string;
  }>;
}

interface GroupInvitationData {
  userIds: string[];
  message?: string;
}

export class SocialDiningService {
  /**
   * Create a new social dining group
   */
  static async createGroup(creatorId: string, data: CreateGroupData): Promise<SocialDiningGroup> {
    try {
      // Create the group
      const group = await SocialDiningGroup.create({
        ...data,
        creatorId,
        preferences: data.preferences || {
          cuisineTypes: [],
          priceRanges: [],
          dietaryRestrictions: [],
          preferredTimes: [],
          maxDistance: 25,
        },
        settings: data.settings || {
          allowMemberInvites: true,
          requireApproval: false,
          autoSplitBills: true,
          shareReservations: true,
        },
      });

      // Add creator as admin member
      await GroupMembership.create({
        groupId: group.id,
        userId: creatorId,
        role: MembershipRole.CREATOR,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
      });

      logInfo('Social dining group created', { groupId: group.id, creatorId });

      // Publish event
      pubsub.publish(EVENTS.RESTAURANT_UPDATED, {
        type: 'GROUP_CREATED',
        groupId: group.id,
        creatorId,
      });

      return group;
    } catch (error) {
      logError('Error creating social dining group:', error);
      throw error;
    }
  }

  /**
   * Get user's groups
   */
  static async getUserGroups(userId: string): Promise<SocialDiningGroup[]> {
    const memberships = await GroupMembership.findAll({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
      },
      include: [{
        model: SocialDiningGroup,
        as: 'group',
        where: { isActive: true },
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'profileImage'],
        }],
      }],
    });

    return memberships.map(m => m.group).filter(Boolean);
  }

  /**
   * Get group details with members
   */
  static async getGroupDetails(groupId: string, userId: string): Promise<SocialDiningGroup> {
    const group = await SocialDiningGroup.findByPk(groupId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'profileImage'],
        },
        {
          model: GroupMembership,
          as: 'members',
          where: { status: MembershipStatus.ACTIVE },
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'profileImage'],
          }],
        },
      ],
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Check if user has access to this group
    const membership = await GroupMembership.findOne({
      where: {
        groupId,
        userId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership && group.isPrivate) {
      throw new ForbiddenError('Access denied to private group');
    }

    return group;
  }

  /**
   * Invite users to group
   */
  static async inviteUsers(
    groupId: string,
    inviterId: string,
    data: GroupInvitationData
  ): Promise<void> {
    const group = await SocialDiningGroup.findByPk(groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Check if inviter has permission
    const inviterMembership = await GroupMembership.findOne({
      where: {
        groupId,
        userId: inviterId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!inviterMembership) {
      throw new ForbiddenError('You are not a member of this group');
    }

    if (!group.settings.allowMemberInvites && inviterMembership.role === MembershipRole.MEMBER) {
      throw new ForbiddenError('Only admins can invite new members');
    }

    // Check group capacity
    const currentMemberCount = await GroupMembership.count({
      where: {
        groupId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (currentMemberCount + data.userIds.length > group.maxMembers) {
      throw new BadRequestError('Group would exceed maximum member limit');
    }

    // Create invitations
    const invitations = await Promise.all(
      data.userIds.map(async (userId) => {
        // Check if user is already a member or has pending invitation
        const existingMembership = await GroupMembership.findOne({
          where: { groupId, userId },
        });

        if (existingMembership) {
          if (existingMembership.status === MembershipStatus.ACTIVE) {
            throw new BadRequestError(`User is already a member of this group`);
          }
          if (existingMembership.status === MembershipStatus.PENDING) {
            throw new BadRequestError(`User already has a pending invitation`);
          }
        }

        // Create or update membership
        const membership = await GroupMembership.upsert({
          groupId,
          userId,
          role: MembershipRole.MEMBER,
          status: group.settings.requireApproval ? MembershipStatus.PENDING : MembershipStatus.ACTIVE,
          invitedBy: inviterId,
          invitedAt: new Date(),
          joinedAt: group.settings.requireApproval ? undefined : new Date(),
        });

        // Send notification
        await NotificationService.sendNotification(userId, {
          type: 'GROUP_INVITATION',
          title: `Invitation to join "${group.name}"`,
          message: data.message || `You've been invited to join the dining group "${group.name}"`,
          data: {
            groupId,
            inviterId,
            groupName: group.name,
          },
        });

        // Send email
        const user = await User.findByPk(userId);
        if (user?.email) {
          await EmailService.sendGroupInvitation(user.email, {
            groupName: group.name,
            inviterName: `${inviterMembership.user?.firstName} ${inviterMembership.user?.lastName}`,
            message: data.message,
            acceptUrl: `${process.env.FRONTEND_URL}/groups/${groupId}/accept-invitation`,
          });
        }

        return membership;
      })
    );

    logInfo('Group invitations sent', { groupId, inviterId, invitedUsers: data.userIds.length });

    // Publish event
    pubsub.publish(EVENTS.USER_NOTIFICATION, {
      type: 'GROUP_INVITATIONS_SENT',
      groupId,
      inviterId,
      invitedUsers: data.userIds,
    });
  }

  /**
   * Accept group invitation
   */
  static async acceptInvitation(groupId: string, userId: string): Promise<void> {
    const membership = await GroupMembership.findOne({
      where: {
        groupId,
        userId,
        status: MembershipStatus.PENDING,
      },
    });

    if (!membership) {
      throw new NotFoundError('No pending invitation found');
    }

    await membership.update({
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    });

    // Notify group members
    const group = await SocialDiningGroup.findByPk(groupId);
    const user = await User.findByPk(userId);
    
    if (group && user) {
      const groupMembers = await GroupMembership.findAll({
        where: {
          groupId,
          status: MembershipStatus.ACTIVE,
          userId: { [Op.ne]: userId },
        },
      });

      await Promise.all(
        groupMembers.map(member =>
          NotificationService.sendNotification(member.userId, {
            type: 'GROUP_MEMBER_JOINED',
            title: `New member joined "${group.name}"`,
            message: `${user.firstName} ${user.lastName} has joined your dining group`,
            data: { groupId, newMemberId: userId },
          })
        )
      );
    }

    logInfo('Group invitation accepted', { groupId, userId });
  }

  /**
   * Create group reservation
   */
  static async createGroupReservation(
    groupId: string,
    organizerId: string,
    data: CreateGroupReservationData
  ): Promise<GroupReservation> {
    // Verify organizer is group member
    const membership = await GroupMembership.findOne({
      where: {
        groupId,
        userId: organizerId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenError('You must be a group member to create reservations');
    }

    // Verify restaurant exists
    const restaurant = await Restaurant.findByPk(data.restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }

    // Create group reservation
    const groupReservation = await GroupReservation.create({
      ...data,
      groupId,
      organizerId,
      metadata: {
        alternativeOptions: data.alternativeOptions || [],
        memberResponses: {},
      },
    });

    // Notify group members
    const group = await SocialDiningGroup.findByPk(groupId);
    const groupMembers = await GroupMembership.findAll({
      where: {
        groupId,
        status: MembershipStatus.ACTIVE,
        userId: { [Op.ne]: organizerId },
      },
    });

    await Promise.all(
      groupMembers.map(member =>
        NotificationService.sendNotification(member.userId, {
          type: 'GROUP_RESERVATION_CREATED',
          title: `New group dining plan in "${group?.name}"`,
          message: `${membership.user?.firstName} proposed dining at ${restaurant.name}`,
          data: {
            groupId,
            groupReservationId: groupReservation.id,
            restaurantName: restaurant.name,
          },
        })
      )
    );

    logInfo('Group reservation created', { groupReservationId: groupReservation.id, groupId, organizerId });

    return groupReservation;
  }

  /**
   * Respond to group reservation
   */
  static async respondToGroupReservation(
    groupReservationId: string,
    userId: string,
    response: {
      status: 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE';
      dietaryRestrictions?: string[];
    }
  ): Promise<void> {
    const groupReservation = await GroupReservation.findByPk(groupReservationId);
    if (!groupReservation) {
      throw new NotFoundError('Group reservation not found');
    }

    // Verify user is group member
    const membership = await GroupMembership.findOne({
      where: {
        groupId: groupReservation.groupId,
        userId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenError('You must be a group member to respond');
    }

    // Update member response
    const updatedMetadata = {
      ...groupReservation.metadata,
      memberResponses: {
        ...groupReservation.metadata.memberResponses,
        [userId]: {
          ...response,
          respondedAt: new Date(),
        },
      },
    };

    await groupReservation.update({ metadata: updatedMetadata });

    // Check if we have enough responses to finalize
    const totalMembers = await GroupMembership.count({
      where: {
        groupId: groupReservation.groupId,
        status: MembershipStatus.ACTIVE,
      },
    });

    const responses = Object.keys(updatedMetadata.memberResponses || {}).length;
    const attendingCount = Object.values(updatedMetadata.memberResponses || {})
      .filter(r => r.status === 'ATTENDING').length;

    // Auto-finalize if enough people are attending
    if (attendingCount >= groupReservation.partySize && 
        groupReservation.status === GroupReservationStatus.VOTING) {
      await this.finalizeGroupReservation(groupReservationId, groupReservation.organizerId);
    }

    logInfo('Group reservation response recorded', { groupReservationId, userId, response: response.status });
  }

  /**
   * Finalize group reservation and create actual reservation
   */
  static async finalizeGroupReservation(
    groupReservationId: string,
    organizerId: string
  ): Promise<Reservation> {
    const groupReservation = await GroupReservation.findByPk(groupReservationId);
    if (!groupReservation) {
      throw new NotFoundError('Group reservation not found');
    }

    if (groupReservation.organizerId !== organizerId) {
      throw new ForbiddenError('Only the organizer can finalize the reservation');
    }

    // Count attending members
    const attendingMembers = Object.entries(groupReservation.metadata.memberResponses || {})
      .filter(([_, response]) => response.status === 'ATTENDING');

    if (attendingMembers.length < 2) {
      throw new BadRequestError('At least 2 members must be attending');
    }

    // Create actual reservation
    const reservation = await ReservationService.createReservation({
      userId: organizerId,
      restaurantId: groupReservation.restaurantId,
      date: groupReservation.proposedDate,
      time: groupReservation.proposedTime,
      partySize: attendingMembers.length,
      specialRequests: groupReservation.specialRequests,
    });

    // Update group reservation
    await groupReservation.update({
      reservationId: reservation.id,
      status: GroupReservationStatus.CONFIRMED,
      finalizedAt: new Date(),
      partySize: attendingMembers.length,
    });

    // Notify attending members
    const group = await SocialDiningGroup.findByPk(groupReservation.groupId);
    const restaurant = await Restaurant.findByPk(groupReservation.restaurantId);

    await Promise.all(
      attendingMembers.map(([userId, _]) =>
        NotificationService.sendNotification(userId, {
          type: 'GROUP_RESERVATION_CONFIRMED',
          title: `Group dining confirmed!`,
          message: `Your reservation at ${restaurant?.name} has been confirmed`,
          data: {
            groupId: groupReservation.groupId,
            reservationId: reservation.id,
            restaurantName: restaurant?.name,
          },
        })
      )
    );

    logInfo('Group reservation finalized', { groupReservationId, reservationId: reservation.id });

    return reservation;
  }

  /**
   * Get group reservations
   */
  static async getGroupReservations(
    groupId: string,
    userId: string,
    status?: GroupReservationStatus
  ): Promise<GroupReservation[]> {
    // Verify user is group member
    const membership = await GroupMembership.findOne({
      where: {
        groupId,
        userId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenError('Access denied');
    }

    const where: any = { groupId };
    if (status) {
      where.status = status;
    }

    return await GroupReservation.findAll({
      where,
      include: [
        {
          model: User,
          as: 'organizer',
          attributes: ['id', 'firstName', 'lastName', 'profileImage'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'cuisine', 'rating'],
        },
        {
          model: Reservation,
          as: 'reservation',
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Calculate and split bill
   */
  static async calculateBillSplit(
    groupReservationId: string,
    totalAmount: number,
    items?: Array<{
      name: string;
      price: number;
      assignedTo: string[];
    }>
  ): Promise<Record<string, { amount: number; items?: string[] }>> {
    const groupReservation = await GroupReservation.findByPk(groupReservationId);
    if (!groupReservation) {
      throw new NotFoundError('Group reservation not found');
    }

    const attendingMembers = Object.entries(groupReservation.metadata.memberResponses || {})
      .filter(([_, response]) => response.status === 'ATTENDING')
      .map(([userId, _]) => userId);

    let billSplit: Record<string, { amount: number; items?: string[] }> = {};

    switch (groupReservation.billSplitType) {
      case BillSplitType.EQUAL:
        const equalAmount = totalAmount / attendingMembers.length;
        attendingMembers.forEach(userId => {
          billSplit[userId] = { amount: equalAmount };
        });
        break;

      case BillSplitType.BY_ITEM:
        if (!items) {
          throw new BadRequestError('Items required for by-item split');
        }
        
        // Initialize all members with 0
        attendingMembers.forEach(userId => {
          billSplit[userId] = { amount: 0, items: [] };
        });

        // Calculate per-item costs
        items.forEach(item => {
          const costPerPerson = item.price / item.assignedTo.length;
          item.assignedTo.forEach(userId => {
            if (billSplit[userId]) {
              billSplit[userId].amount += costPerPerson;
              billSplit[userId].items?.push(item.name);
            }
          });
        });
        break;

      case BillSplitType.HOST_PAYS:
        billSplit[groupReservation.organizerId] = { amount: totalAmount };
        attendingMembers.forEach(userId => {
          if (userId !== groupReservation.organizerId) {
            billSplit[userId] = { amount: 0 };
          }
        });
        break;

      default:
        throw new BadRequestError('Invalid bill split type');
    }

    // Update group reservation with bill split
    await groupReservation.update({
      totalAmount,
      metadata: {
        ...groupReservation.metadata,
        billSplit,
      },
    });

    return billSplit;
  }

  /**
   * Search public groups
   */
  static async searchPublicGroups(
    query: string,
    filters?: {
      cuisineTypes?: string[];
      maxDistance?: number;
      location?: { latitude: number; longitude: number };
    }
  ): Promise<SocialDiningGroup[]> {
    const where: any = {
      isPrivate: false,
      isActive: true,
    };

    if (query) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
      ];
    }

    if (filters?.cuisineTypes && filters.cuisineTypes.length > 0) {
      where['preferences.cuisineTypes'] = {
        [Op.overlap]: filters.cuisineTypes,
      };
    }

    return await SocialDiningGroup.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'profileImage'],
      }],
      limit: 20,
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Leave group
   */
  static async leaveGroup(groupId: string, userId: string): Promise<void> {
    const membership = await GroupMembership.findOne({
      where: {
        groupId,
        userId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new NotFoundError('Membership not found');
    }

    if (membership.role === MembershipRole.CREATOR) {
      // Transfer ownership or deactivate group
      const otherAdmins = await GroupMembership.findAll({
        where: {
          groupId,
          role: MembershipRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          userId: { [Op.ne]: userId },
        },
      });

      if (otherAdmins.length > 0) {
        // Transfer to first admin
        await otherAdmins[0].update({ role: MembershipRole.CREATOR });
      } else {
        // Deactivate group
        await SocialDiningGroup.update(
          { isActive: false },
          { where: { id: groupId } }
        );
      }
    }

    await membership.destroy();

    logInfo('User left group', { groupId, userId });
  }
}
