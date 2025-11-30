import { VirtualExperience } from '../models/VirtualExperience';
import { VirtualBooking } from '../models/VirtualBooking';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { NotificationService } from './notification.service';
import { PaymentService } from './payment.service';
import { pubsub, EVENTS } from '../config/pubsub';

interface VirtualExperienceSearchParams {
  experienceType?: string;
  restaurantId?: string;
  date?: Date;
  maxPrice?: number;
  difficulty?: string;
  language?: string;
  hasVR?: boolean;
  location?: string;
  limit?: number;
  offset?: number;
}

interface VirtualBookingRequest {
  userId: string;
  virtualExperienceId: string;
  bookingDate: Date;
  startTime: string;
  participants: Array<{
    name: string;
    email?: string;
    age?: number;
    dietaryRestrictions?: string[];
  }>;
  specialRequests?: string;
  deviceInfo: {
    type: 'vr_headset' | 'mobile' | 'desktop' | 'tablet';
    model?: string;
    capabilities: string[];
  };
}

interface VRSession {
  sessionId: string;
  bookingId: string;
  participants: string[];
  roomId: string;
  status: 'waiting' | 'active' | 'ended';
  startedAt?: Date;
  endedAt?: Date;
}

class VirtualExperienceService {
  private notificationService: NotificationService;
  private paymentService: PaymentService;
  private activeSessions: Map<string, VRSession> = new Map();

  constructor() {
    this.notificationService = new NotificationService();
    this.paymentService = new PaymentService();
  }

  async searchExperiences(params: VirtualExperienceSearchParams): Promise<VirtualExperience[]> {
    try {
      const whereClause: any = { isActive: true };

      if (params.experienceType) {
        whereClause.experienceType = params.experienceType;
      }

      if (params.restaurantId) {
        whereClause.restaurantId = params.restaurantId;
      }

      if (params.maxPrice) {
        whereClause.price = { [DataTypes.Op.lte]: params.maxPrice };
      }

      if (params.difficulty) {
        whereClause.difficulty = params.difficulty;
      }

      if (params.language) {
        whereClause.language = params.language;
      }

      if (params.hasVR !== undefined) {
        if (params.hasVR) {
          whereClause.requirements = {
            [DataTypes.Op.contains]: ['vr_headset']
          };
        } else {
          whereClause.requirements = {
            [DataTypes.Op.not]: {
              [DataTypes.Op.contains]: ['vr_headset']
            }
          };
        }
      }

      const experiences = await VirtualExperience.findAll({
        where: whereClause,
        include: [
          {
            model: Restaurant,
            attributes: ['id', 'name', 'cuisine', 'location', 'rating']
          }
        ],
        order: [['rating', 'DESC'], ['totalBookings', 'DESC']],
        limit: params.limit || 20,
        offset: params.offset || 0,
      });

      // Filter by available slots if date is specified
      if (params.date) {
        return experiences.filter(exp => exp.getAvailableSlot(params.date!) !== null);
      }

      return experiences;
    } catch (error) {
      console.error('Error searching virtual experiences:', error);
      throw new Error('Failed to search virtual experiences');
    }
  }

  async getExperienceById(id: string): Promise<VirtualExperience | null> {
    try {
      return await VirtualExperience.findByPk(id, {
        include: [
          {
            model: Restaurant,
            attributes: ['id', 'name', 'cuisine', 'location', 'rating', 'description']
          }
        ]
      });
    } catch (error) {
      console.error('Error getting virtual experience:', error);
      return null;
    }
  }

  async createBooking(request: VirtualBookingRequest): Promise<VirtualBooking> {
    try {
      const experience = await this.getExperienceById(request.virtualExperienceId);
      if (!experience) {
        throw new Error('Virtual experience not found');
      }

      // Check availability
      const availableSlot = experience.getAvailableSlot(request.bookingDate);
      if (!availableSlot) {
        throw new Error('No available slots for the selected date');
      }

      // Check participant capacity
      if (!experience.canAccommodateParty(request.participants.length)) {
        throw new Error(`Maximum ${experience.maxParticipants} participants allowed`);
      }

      // Calculate total price
      const totalPrice = experience.price * request.participants.length;

      // Calculate end time
      const startTime = new Date(`2000-01-01 ${request.startTime}`);
      const endTime = new Date(startTime.getTime() + experience.duration * 60000);
      const endTimeString = endTime.toTimeString().slice(0, 5);

      // Create booking
      const booking = await VirtualBooking.create({
        userId: request.userId,
        virtualExperienceId: request.virtualExperienceId,
        bookingDate: request.bookingDate,
        startTime: request.startTime,
        endTime: endTimeString,
        participants: request.participants,
        totalPrice,
        currency: experience.currency,
        status: 'pending',
        paymentStatus: 'pending',
        specialRequests: request.specialRequests,
        deviceInfo: request.deviceInfo,
      });

      // Process payment
      const paymentResult = await this.paymentService.processPayment({
        amount: totalPrice,
        currency: experience.currency,
        userId: request.userId,
        description: `Virtual Experience: ${experience.title}`,
        metadata: {
          bookingId: booking.id,
          experienceId: experience.id,
          type: 'virtual_experience'
        }
      });

      if (paymentResult.success) {
        booking.paymentStatus = 'paid';
        booking.paymentId = paymentResult.paymentId;
        booking.status = 'confirmed';

        // Generate session details
        booking.sessionId = `vr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        booking.vrRoomId = `room_${booking.sessionId}`;
        booking.joinUrl = this.generateJoinUrl(booking.sessionId, booking.vrRoomId);

        await booking.save();

        // Update experience booking count and availability
        experience.totalBookings += 1;
        const slotIndex = experience.availableSlots.findIndex(slot => 
          new Date(slot.date).toDateString() === request.bookingDate.toDateString()
        );
        if (slotIndex !== -1) {
          experience.availableSlots[slotIndex].available -= request.participants.length;
        }
        await experience.save();

        // Send confirmation notifications
        await this.notificationService.sendNotification(request.userId, {
          type: 'virtual_booking_confirmed',
          title: 'Virtual Experience Confirmed!',
          message: `Your virtual experience "${experience.title}" is confirmed for ${request.bookingDate.toDateString()} at ${request.startTime}`,
          data: {
            bookingId: booking.id,
            joinUrl: booking.joinUrl,
            sessionId: booking.sessionId
          }
        });

        // Send calendar invite
        await this.sendCalendarInvite(booking, experience);

        // Publish real-time update
        pubsub.publish(EVENTS.VIRTUAL_BOOKING_CREATED, {
          booking,
          experience,
          user: { id: request.userId }
        });

        return booking;
      } else {
        booking.paymentStatus = 'failed';
        await booking.save();
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.error('Error creating virtual booking:', error);
      throw error;
    }
  }

  async cancelBooking(bookingId: string, userId: string, reason?: string): Promise<void> {
    try {
      const booking = await VirtualBooking.findOne({
        where: { id: bookingId, userId },
        include: [{ model: VirtualExperience }]
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (!booking.canCancel()) {
        throw new Error('Booking cannot be cancelled (less than 2 hours before start time)');
      }

      // Process refund
      if (booking.paymentId && booking.paymentStatus === 'paid') {
        const refundResult = await this.paymentService.processRefund(booking.paymentId, {
          reason: reason || 'Customer cancellation',
          amount: booking.totalPrice
        });

        if (refundResult.success) {
          booking.paymentStatus = 'refunded';
        }
      }

      booking.status = 'cancelled';
      await booking.save();

      // Update experience availability
      const experience = booking.VirtualExperience;
      if (experience) {
        const slotIndex = experience.availableSlots.findIndex(slot => 
          new Date(slot.date).toDateString() === booking.bookingDate.toDateString()
        );
        if (slotIndex !== -1) {
          experience.availableSlots[slotIndex].available += booking.getParticipantCount();
        }
        await experience.save();
      }

      // Send cancellation notification
      await this.notificationService.sendNotification(userId, {
        type: 'virtual_booking_cancelled',
        title: 'Virtual Experience Cancelled',
        message: `Your virtual experience has been cancelled and refunded`,
        data: { bookingId, refundAmount: booking.totalPrice }
      });

      // Publish real-time update
      pubsub.publish(EVENTS.VIRTUAL_BOOKING_CANCELLED, {
        bookingId,
        userId,
        reason
      });
    } catch (error) {
      console.error('Error cancelling virtual booking:', error);
      throw error;
    }
  }

  async startVRSession(bookingId: string): Promise<VRSession> {
    try {
      const booking = await VirtualBooking.findByPk(bookingId, {
        include: [{ model: VirtualExperience }]
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (!booking.canJoin()) {
        throw new Error('Cannot join session at this time');
      }

      booking.status = 'in_progress';
      await booking.save();

      const session: VRSession = {
        sessionId: booking.sessionId!,
        bookingId: booking.id,
        participants: booking.participants.map(p => p.name),
        roomId: booking.vrRoomId!,
        status: 'active',
        startedAt: new Date()
      };

      this.activeSessions.set(session.sessionId, session);

      // Publish session start event
      pubsub.publish(EVENTS.VR_SESSION_STARTED, {
        sessionId: session.sessionId,
        bookingId,
        participants: session.participants
      });

      return session;
    } catch (error) {
      console.error('Error starting VR session:', error);
      throw error;
    }
  }

  async endVRSession(sessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.status = 'ended';
      session.endedAt = new Date();

      const booking = await VirtualBooking.findByPk(session.bookingId);
      if (booking) {
        booking.status = 'completed';
        booking.completedAt = new Date();
        await booking.save();
      }

      this.activeSessions.delete(sessionId);

      // Publish session end event
      pubsub.publish(EVENTS.VR_SESSION_ENDED, {
        sessionId,
        bookingId: session.bookingId,
        duration: session.endedAt.getTime() - session.startedAt!.getTime()
      });

      // Send completion notification
      if (booking) {
        await this.notificationService.sendNotification(booking.userId, {
          type: 'virtual_experience_completed',
          title: 'Experience Completed!',
          message: 'Thank you for joining the virtual experience. Please share your feedback!',
          data: { bookingId: booking.id, sessionId }
        });
      }
    } catch (error) {
      console.error('Error ending VR session:', error);
      throw error;
    }
  }

  async submitFeedback(bookingId: string, userId: string, feedback: {
    rating: number;
    comment?: string;
    highlights?: string[];
    improvements?: string[];
    wouldRecommend: boolean;
  }): Promise<void> {
    try {
      const booking = await VirtualBooking.findOne({
        where: { id: bookingId, userId },
        include: [{ model: VirtualExperience }]
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'completed') {
        throw new Error('Experience must be completed to submit feedback');
      }

      booking.feedback = feedback;
      await booking.save();

      // Update experience rating
      const experience = booking.VirtualExperience;
      if (experience) {
        const allBookings = await VirtualBooking.findAll({
          where: { 
            virtualExperienceId: experience.id,
            status: 'completed',
            feedback: { [DataTypes.Op.ne]: null }
          }
        });

        const totalRating = allBookings.reduce((sum, b) => sum + (b.feedback?.rating || 0), 0);
        const avgRating = totalRating / allBookings.length;

        experience.rating = Math.round(avgRating * 100) / 100;
        await experience.save();
      }

      // Publish feedback event
      pubsub.publish(EVENTS.VIRTUAL_FEEDBACK_SUBMITTED, {
        bookingId,
        userId,
        rating: feedback.rating,
        experienceId: experience?.id
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  async getUserBookings(userId: string, filters?: {
    status?: string;
    upcoming?: boolean;
    limit?: number;
  }): Promise<VirtualBooking[]> {
    try {
      const whereClause: any = { userId };

      if (filters?.status) {
        whereClause.status = filters.status;
      }

      if (filters?.upcoming) {
        const now = new Date();
        whereClause.bookingDate = { [DataTypes.Op.gte]: now };
        whereClause.status = 'confirmed';
      }

      return await VirtualBooking.findAll({
        where: whereClause,
        include: [
          {
            model: VirtualExperience,
            include: [{ model: Restaurant, attributes: ['name', 'cuisine'] }]
          }
        ],
        order: [['bookingDate', 'ASC'], ['startTime', 'ASC']],
        limit: filters?.limit || 50,
      });
    } catch (error) {
      console.error('Error getting user bookings:', error);
      throw new Error('Failed to get user bookings');
    }
  }

  async getActiveSession(sessionId: string): Promise<VRSession | null> {
    return this.activeSessions.get(sessionId) || null;
  }

  async getPopularExperiences(limit: number = 10): Promise<VirtualExperience[]> {
    try {
      return await VirtualExperience.findAll({
        where: { isActive: true },
        include: [{ model: Restaurant, attributes: ['name', 'cuisine', 'location'] }],
        order: [['totalBookings', 'DESC'], ['rating', 'DESC']],
        limit,
      });
    } catch (error) {
      console.error('Error getting popular experiences:', error);
      throw new Error('Failed to get popular experiences');
    }
  }

  private generateJoinUrl(sessionId: string, roomId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://opentable-clone.com';
    return `${baseUrl}/virtual-experience/join?session=${sessionId}&room=${roomId}`;
  }

  private async sendCalendarInvite(booking: VirtualBooking, experience: VirtualExperience): Promise<void> {
    try {
      const startDateTime = new Date(`${booking.bookingDate.toDateString()} ${booking.startTime}`);
      const endDateTime = new Date(`${booking.bookingDate.toDateString()} ${booking.endTime}`);

      const calendarEvent = {
        title: `Virtual Experience: ${experience.title}`,
        description: `Join your virtual dining experience!\n\nJoin URL: ${booking.joinUrl}\nSession ID: ${booking.sessionId}`,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: 'Virtual Reality',
        attendees: booking.participants.map(p => p.email).filter(Boolean)
      };

      // Send calendar invite (implementation would depend on calendar service)
      console.log('Calendar invite created:', calendarEvent);
    } catch (error) {
      console.error('Error sending calendar invite:', error);
    }
  }
}

export { VirtualExperienceService, VirtualExperienceSearchParams, VirtualBookingRequest, VRSession };
