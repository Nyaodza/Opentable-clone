import { GraphQLError } from 'graphql';

// Custom error helpers for Apollo Server v4
const AuthenticationError = (message: string) => new GraphQLError(message, { extensions: { code: 'UNAUTHENTICATED' } });
const ForbiddenError = (message: string) => new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
const UserInputError = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { Review } from '../models/Review';
import { Payment } from '../models/Payment';
import { LoyaltyProgram } from '../models/LoyaltyProgram';
import { SocialDiningGroup } from '../models/SocialDiningGroup';
import { GroupMembership } from '../models/GroupMembership';
import { GroupReservation } from '../models/GroupReservation';
import { SustainabilityMetrics } from '../models/SustainabilityMetrics';
import { UserSustainabilityProfile } from '../models/UserSustainabilityProfile';
import { BlockchainLoyalty } from '../models/BlockchainLoyalty';
import { BlockchainTransaction } from '../models/BlockchainTransaction';
import { VirtualExperience } from '../models/VirtualExperience';
import { VirtualBooking } from '../models/VirtualBooking';
import { ReservationService } from '../services/reservation.service';
import { RestaurantService } from '../services/restaurant.service';
import { PaymentService } from '../services/payment.service';
import { NotificationService } from '../services/notification.service';
import { RealTimeAnalyticsService } from '../services/real-time-analytics.service';
import { SocialDiningService } from '../services/social-dining.service';
import { AIConciergeService } from '../services/ai-concierge.service';
import { SustainabilityService } from '../services/sustainability.service';
import { BlockchainLoyaltyService } from '../services/blockchain-loyalty.service';
import { VoiceIoTService } from '../services/voice-iot.service';
import { VirtualExperienceService } from '../services/virtual-experience.service';
import { pubsub, EVENTS } from '../config/pubsub';

interface Context {
  user?: User;
  isAuthenticated: boolean;
}

// Initialize services
const reservationService = new ReservationService();
const restaurantService = new RestaurantService();
const paymentService = new PaymentService();
const notificationService = new NotificationService();
const analyticsService = new RealTimeAnalyticsService();
const socialDiningService = new SocialDiningService();
const aiConciergeService = new AIConciergeService();
const sustainabilityService = new SustainabilityService();
const blockchainLoyaltyService = new BlockchainLoyaltyService();
const voiceIoTService = new VoiceIoTService();
const virtualExperienceService = new VirtualExperienceService();

export const resolvers = {
  Query: {
    // User queries
    me: async (_: any, __: any, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return context.user;
    },

    user: async (_: any, { id }: { id: string }) => {
      return await User.findByPk(id);
    },

    // Restaurant queries
    restaurant: async (_: any, { id }: { id: string }) => {
      return await Restaurant.findByPk(id, {
        include: [
          { model: Review, include: [User] },
          { model: SustainabilityMetrics },
          { model: VirtualExperience, where: { isActive: true }, required: false }
        ]
      });
    },

    restaurants: async (_: any, { input }: { input: any }) => {
      return await restaurantService.searchRestaurants(input);
    },

    // Reservation queries
    reservation: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      
      const reservation = await Reservation.findByPk(id, {
        include: [User, Restaurant, Payment, Review]
      });

      if (!reservation) throw new UserInputError('Reservation not found');
      
      // Check if user owns this reservation or is restaurant owner
      if (reservation.userId !== context.user!.id) {
        throw new ForbiddenError('Access denied');
      }

      return reservation;
    },

    reservations: async (_: any, { userId, restaurantId, status }: any, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      
      const whereClause: any = {};
      if (userId) whereClause.userId = userId;
      if (restaurantId) whereClause.restaurantId = restaurantId;
      if (status) whereClause.status = status;

      return await Reservation.findAll({
        where: whereClause,
        include: [User, Restaurant, Payment, Review],
        order: [['createdAt', 'DESC']]
      });
    },

    // Social Dining queries
    socialDiningGroup: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await socialDiningService.getGroup(id, context.user!.id);
    },

    socialDiningGroups: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await socialDiningService.getUserGroups(userId || context.user!.id);
    },

    groupReservations: async (_: any, { groupId }: { groupId: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await socialDiningService.getGroupReservations(groupId);
    },

    // AI Concierge queries
    aiConciergeChat: async (_: any, { message, context: chatContext }: { message: string, chatContext?: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await aiConciergeService.processMessage(context.user!.id, message, chatContext);
    },

    // Sustainability queries
    sustainabilityMetrics: async (_: any, { restaurantId }: { restaurantId: string }) => {
      return await sustainabilityService.getRestaurantMetrics(restaurantId);
    },

    userSustainabilityProfile: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await sustainabilityService.getUserProfile(userId || context.user!.id);
    },

    // Blockchain Loyalty queries
    blockchainLoyalty: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await blockchainLoyaltyService.getLoyaltyAccount(userId || context.user!.id);
    },

    blockchainTransactions: async (_: any, { userId, limit }: { userId: string, limit?: number }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await blockchainLoyaltyService.getTransactionHistory(userId || context.user!.id, limit);
    },

    loyaltyLeaderboard: async (_: any, { limit }: { limit?: number }) => {
      return await blockchainLoyaltyService.getLeaderboard(limit);
    },

    // Virtual Experience queries
    virtualExperience: async (_: any, { id }: { id: string }) => {
      return await virtualExperienceService.getExperienceById(id);
    },

    virtualExperiences: async (_: any, { input }: { input: any }) => {
      return await virtualExperienceService.searchExperiences(input);
    },

    virtualBooking: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      
      const booking = await VirtualBooking.findOne({
        where: { id, userId: context.user!.id },
        include: [VirtualExperience]
      });

      if (!booking) throw new UserInputError('Virtual booking not found');
      return booking;
    },

    virtualBookings: async (_: any, { userId, status }: { userId: string, status?: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await virtualExperienceService.getUserBookings(userId || context.user!.id, { status });
    },

    popularVirtualExperiences: async (_: any, { limit }: { limit?: number }) => {
      return await virtualExperienceService.getPopularExperiences(limit);
    },

    // Voice/IoT queries
    iotDevices: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await voiceIoTService.getConnectedDevices(userId || context.user!.id);
    },

    activeVRSession: async (_: any, { sessionId }: { sessionId: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await virtualExperienceService.getActiveSession(sessionId);
    },

    // Analytics queries
    analytics: async (_: any, __: any, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await analyticsService.getAnalytics();
    },
  },

  Mutation: {
    // User mutations
    register: async (_: any, { input }: { input: any }) => {
      // Implementation for user registration
      const user = await User.create(input);
      
      // Create blockchain loyalty account
      await blockchainLoyaltyService.createLoyaltyAccount(user.id);
      
      // Create sustainability profile
      await sustainabilityService.createUserProfile(user.id);

      const token = 'jwt_token_here'; // Generate JWT token
      return { token, user };
    },

    login: async (_: any, { input }: { input: any }) => {
      // Implementation for user login
      const user = await User.findOne({ where: { email: input.email } });
      if (!user) throw new UserInputError('Invalid credentials');

      const token = 'jwt_token_here'; // Generate JWT token
      return { token, user };
    },

    // Reservation mutations
    createReservation: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      
      const reservation = await reservationService.createReservation({
        ...input,
        userId: context.user!.id
      });

      // Award blockchain loyalty tokens
      await blockchainLoyaltyService.processReservationReward(reservation.id, context.user!.id);

      // Update sustainability impact
      await sustainabilityService.updateUserDiningEvent(context.user!.id, {
        restaurantId: input.restaurantId,
        reservationId: reservation.id,
        date: input.date
      });

      return reservation;
    },

    cancelReservation: async (_: any, { id, reason }: { id: string, reason?: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await reservationService.cancelReservation(id, { reason, userId: context.user!.id });
    },

    // Review mutations
    createReview: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      
      const review = await Review.create({
        ...input,
        userId: context.user!.id
      });

      // Award blockchain loyalty tokens for review
      await blockchainLoyaltyService.processReviewReward(review.id, context.user!.id);

      return review;
    },

    // Social Dining mutations
    createSocialDiningGroup: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await socialDiningService.createGroup(context.user!.id, input);
    },

    inviteToGroup: async (_: any, { groupId, userIds }: { groupId: string, userIds: string[] }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      await socialDiningService.inviteMembers(groupId, context.user!.id, userIds);
      return true;
    },

    joinGroup: async (_: any, { groupId, inviteCode }: { groupId: string, inviteCode?: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      await socialDiningService.joinGroup(groupId, context.user!.id, inviteCode);
      return true;
    },

    createGroupReservation: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await socialDiningService.createGroupReservation(context.user!.id, input);
    },

    voteOnGroupReservation: async (_: any, { reservationId, vote }: { reservationId: string, vote: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      await socialDiningService.voteOnReservation(reservationId, context.user!.id, vote as any);
      return true;
    },

    // Blockchain Loyalty mutations
    createLoyaltyAccount: async (_: any, { input }: { input?: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await blockchainLoyaltyService.createLoyaltyAccount(context.user!.id);
    },

    earnTokens: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await blockchainLoyaltyService.earnTokens({
        ...input,
        userId: context.user!.id
      });
    },

    redeemTokens: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await blockchainLoyaltyService.redeemTokens({
        ...input,
        userId: context.user!.id
      });
    },

    stakeTokens: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await blockchainLoyaltyService.stakeTokens({
        ...input,
        userId: context.user!.id
      });
    },

    // Virtual Experience mutations
    createVirtualBooking: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await virtualExperienceService.createBooking({
        ...input,
        userId: context.user!.id
      });
    },

    cancelVirtualBooking: async (_: any, { bookingId, reason }: { bookingId: string, reason?: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      await virtualExperienceService.cancelBooking(bookingId, context.user!.id, reason);
      return true;
    },

    startVRSession: async (_: any, { bookingId }: { bookingId: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await virtualExperienceService.startVRSession(bookingId);
    },

    endVRSession: async (_: any, { sessionId }: { sessionId: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      await virtualExperienceService.endVRSession(sessionId);
      return true;
    },

    submitVirtualFeedback: async (_: any, { bookingId, feedback }: { bookingId: string, feedback: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      await virtualExperienceService.submitFeedback(bookingId, context.user!.id, feedback);
      return true;
    },

    // Voice/IoT mutations
    processVoiceCommand: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await voiceIoTService.processVoiceCommand({
        ...input,
        userId: context.user!.id
      });
    },

    registerIoTDevice: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      const deviceId = await voiceIoTService.registerDevice({
        ...input,
        userId: context.user!.id,
        isActive: true
      });
      
      return await voiceIoTService.getConnectedDevices(context.user!.id).then(devices => 
        devices.find(d => d.id === deviceId)
      );
    },

    updateDeviceStatus: async (_: any, { deviceId, isActive }: { deviceId: string, isActive: boolean }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      await voiceIoTService.updateDeviceStatus(deviceId, isActive);
      return true;
    },

    // Payment mutations
    processPayment: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await paymentService.processPayment({
        ...input,
        userId: context.user!.id
      });
    },

    refundPayment: async (_: any, { paymentId, reason }: { paymentId: string, reason?: string }, context: Context) => {
      if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
      return await paymentService.processRefund(paymentId, { reason });
    },
  },

  Subscription: {
    reservationUpdated: {
      subscribe: (_: any, { userId }: { userId: string }, context: Context) => {
        if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator([`${EVENTS.RESERVATION_UPDATED}_${userId}`]);
      },
    },

    blockchainLoyaltyUpdated: {
      subscribe: (_: any, { userId }: { userId: string }, context: Context) => {
        if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator([`${EVENTS.LOYALTY_UPDATED}_${userId}`]);
      },
    },

    tokenTransactionUpdated: {
      subscribe: (_: any, { userId }: { userId: string }, context: Context) => {
        if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator([`TOKEN_TRANSACTION_${userId}`]);
      },
    },

    virtualBookingUpdated: {
      subscribe: (_: any, { userId }: { userId: string }, context: Context) => {
        if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator([`VIRTUAL_BOOKING_${userId}`]);
      },
    },

    vrSessionUpdated: {
      subscribe: (_: any, { sessionId }: { sessionId: string }, context: Context) => {
        if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator([`VR_SESSION_${sessionId}`]);
      },
    },

    socialGroupUpdated: {
      subscribe: (_: any, { groupId }: { groupId: string }, context: Context) => {
        if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator([`SOCIAL_GROUP_${groupId}`]);
      },
    },

    deviceMessageReceived: {
      subscribe: (_: any, { deviceId }: { deviceId: string }, context: Context) => {
        if (!context.isAuthenticated) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator([`DEVICE_MESSAGE_${deviceId}`]);
      },
    },

    analyticsUpdated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.ANALYTICS_UPDATED]),
    },
  },

  // Type resolvers for relationships
  User: {
    blockchainLoyalty: async (parent: User) => {
      return await BlockchainLoyalty.findOne({ where: { userId: parent.id } });
    },
    sustainabilityProfile: async (parent: User) => {
      return await UserSustainabilityProfile.findOne({ where: { userId: parent.id } });
    },
  },

  Restaurant: {
    sustainabilityMetrics: async (parent: Restaurant) => {
      return await SustainabilityMetrics.findOne({ where: { restaurantId: parent.id } });
    },
    virtualExperiences: async (parent: Restaurant) => {
      return await VirtualExperience.findAll({ 
        where: { restaurantId: parent.id, isActive: true } 
      });
    },
  },

  VirtualExperience: {
    restaurant: async (parent: VirtualExperience) => {
      return await Restaurant.findByPk(parent.restaurantId);
    },
  },

  VirtualBooking: {
    user: async (parent: VirtualBooking) => {
      return await User.findByPk(parent.userId);
    },
    virtualExperience: async (parent: VirtualBooking) => {
      return await VirtualExperience.findByPk(parent.virtualExperienceId);
    },
  },

  BlockchainLoyalty: {
    user: async (parent: BlockchainLoyalty) => {
      return await User.findByPk(parent.userId);
    },
  },

  BlockchainTransaction: {
    user: async (parent: BlockchainTransaction) => {
      return await User.findByPk(parent.userId);
    },
  },

  SocialDiningGroup: {
    creator: async (parent: SocialDiningGroup) => {
      return await User.findByPk(parent.creatorId);
    },
    members: async (parent: SocialDiningGroup) => {
      return await GroupMembership.findAll({ 
        where: { groupId: parent.id },
        include: [User]
      });
    },
  },
};
