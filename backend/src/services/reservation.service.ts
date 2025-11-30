import { Op, Transaction } from 'sequelize';
import { Reservation, ReservationStatus } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { Table } from '../models/Table';
import { User } from '../models/User';
import { RestaurantHours } from '../models/RestaurantHours';
import { TableService } from './table.service';
import { EmailService } from './email.service';
import { NotFoundError, BadRequestError, ForbiddenError } from '../middleware/errorHandler';
import { cache, CACHE_KEYS, CACHE_TTL } from '../config/redis';
import { logInfo, logError, logWarning } from '../utils/logger';
import { sequelize } from '../config/database';
import { addMinutes, format, startOfDay, endOfDay } from 'date-fns';

interface CreateReservationData {
  restaurantId: string;
  userId: string;
  dateTime: Date;
  partySize: number;
  guestInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  specialRequests?: string;
  occasion?: string;
  dietaryRestrictions?: string[];
  newsletterOptIn?: boolean;
  smsOptIn?: boolean;
}

interface UpdateReservationData {
  dateTime?: Date;
  partySize?: number;
  specialRequests?: string;
  occasion?: string;
  dietaryRestrictions?: string[];
}

interface ReservationSearchParams {
  userId?: string;
  restaurantId?: string;
  status?: ReservationStatus[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  includeDetails?: boolean;
}

export class ReservationService {
  /**
   * Create a new reservation
   */
  static async createReservation(data: CreateReservationData): Promise<Reservation> {
    const transaction = await sequelize.transaction();

    try {
      // Validate restaurant exists and is active
      const restaurant = await Restaurant.findByPk(data.restaurantId, {
        include: [{ model: RestaurantHours, as: 'hours' }]
      });

      if (!restaurant || !restaurant.isActive) {
        throw new NotFoundError('Restaurant not found or inactive');
      }

      // Validate reservation datetime
      await this.validateReservationDateTime(restaurant, data.dateTime);

      // Check party size limits
      const settings = restaurant.settings || {};
      const minPartySize = settings.minPartySize || 1;
      const maxPartySize = settings.maxPartySize || 20;

      if (data.partySize < minPartySize || data.partySize > maxPartySize) {
        throw new BadRequestError(`Party size must be between ${minPartySize} and ${maxPartySize}`);
      }

      // Find available table
      const duration = settings.reservationDuration || 120;
      const table = await TableService.findBestTable(
        data.restaurantId,
        data.dateTime,
        data.partySize,
        duration
      );

      if (!table) {
        throw new BadRequestError('No available tables for the requested time and party size');
      }

      // Check for duplicate reservations
      const existingReservation = await Reservation.findOne({
        where: {
          userId: data.userId,
          restaurantId: data.restaurantId,
          dateTime: {
            [Op.between]: [
              new Date(data.dateTime.getTime() - 2 * 60 * 60 * 1000),
              new Date(data.dateTime.getTime() + 2 * 60 * 60 * 1000)
            ]
          },
          status: {
            [Op.in]: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING]
          }
        },
        transaction
      });

      if (existingReservation) {
        throw new BadRequestError('You already have a reservation at this restaurant around this time');
      }

      // Generate confirmation code
      const confirmationCode = this.generateConfirmationCode();

      // Create reservation
      const reservation = await Reservation.create({
        ...data,
        tableId: table.id,
        status: ReservationStatus.CONFIRMED,
        confirmationCode,
        totalAmount: 0, // Will be updated when payment is implemented
        depositAmount: 0,
        cancellationFee: 0
      }, { transaction });

      // Update table availability cache
      await cache.del(CACHE_KEYS.TABLE_AVAILABILITY(data.restaurantId, data.dateTime.toISOString()));

      await transaction.commit();

      // Send confirmation email
      await this.sendReservationConfirmation(reservation);

      // Fetch complete reservation data
      const completeReservation = await this.getReservationById(reservation.id);

      logInfo('Reservation created successfully', {
        reservationId: reservation.id,
        restaurantId: data.restaurantId,
        userId: data.userId
      });

      return completeReservation;
    } catch (error) {
      await transaction.rollback();
      logError('Failed to create reservation', error);
      throw error;
    }
  }

  /**
   * Update reservation
   */
  static async updateReservation(
    reservationId: string,
    userId: string,
    data: UpdateReservationData,
    isAdmin: boolean = false
  ): Promise<Reservation> {
    const transaction = await sequelize.transaction();

    try {
      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Restaurant, as: 'restaurant' },
          { model: Table, as: 'table' }
        ],
        transaction
      });

      if (!reservation) {
        throw new NotFoundError('Reservation not found');
      }

      // Check ownership
      if (!isAdmin && reservation.userId !== userId) {
        throw new ForbiddenError('You can only update your own reservations');
      }

      // Check if reservation can be modified
      if (reservation.status === ReservationStatus.CANCELLED) {
        throw new BadRequestError('Cannot update cancelled reservation');
      }

      if (reservation.status === ReservationStatus.COMPLETED) {
        throw new BadRequestError('Cannot update completed reservation');
      }

      // Check modification deadline
      const modificationDeadline = new Date(reservation.dateTime.getTime() - 24 * 60 * 60 * 1000);
      if (new Date() > modificationDeadline && !isAdmin) {
        throw new BadRequestError('Reservations can only be modified up to 24 hours before the reservation time');
      }

      // If changing datetime or party size, need to find new table
      if (data.dateTime || data.partySize) {
        const newDateTime = data.dateTime || reservation.dateTime;
        const newPartySize = data.partySize || reservation.partySize;

        // Validate new datetime
        if (data.dateTime) {
          await this.validateReservationDateTime(reservation.restaurant, newDateTime);
        }

        // Find new table
        const duration = reservation.restaurant.settings?.reservationDuration || 120;
        const newTable = await TableService.findBestTable(
          reservation.restaurantId,
          newDateTime,
          newPartySize,
          duration
        );

        if (!newTable) {
          throw new BadRequestError('No available tables for the new time and party size');
        }

        // Update reservation
        await reservation.update({
          ...data,
          dateTime: newDateTime,
          partySize: newPartySize,
          tableId: newTable.id
        }, { transaction });
      } else {
        // Just update other fields
        await reservation.update(data, { transaction });
      }

      await transaction.commit();

      // Send update notification
      await this.sendReservationUpdate(reservation);

      // Clear cache
      await cache.del([
        CACHE_KEYS.USER_RESERVATIONS(userId),
        CACHE_KEYS.RESTAURANT_RESERVATIONS(reservation.restaurantId)
      ]);

      logInfo('Reservation updated successfully', { reservationId });

      return await this.getReservationById(reservationId);
    } catch (error) {
      await transaction.rollback();
      logError('Failed to update reservation', error);
      throw error;
    }
  }

  /**
   * Cancel reservation
   */
  static async cancelReservation(
    reservationId: string,
    userId: string,
    reason?: string,
    isAdmin: boolean = false
  ): Promise<Reservation> {
    const transaction = await sequelize.transaction();

    try {
      const reservation = await Reservation.findByPk(reservationId, {
        include: [{ model: Restaurant, as: 'restaurant' }],
        transaction
      });

      if (!reservation) {
        throw new NotFoundError('Reservation not found');
      }

      // Check ownership
      if (!isAdmin && reservation.userId !== userId) {
        throw new ForbiddenError('You can only cancel your own reservations');
      }

      // Check if already cancelled
      if (reservation.status === ReservationStatus.CANCELLED) {
        throw new BadRequestError('Reservation is already cancelled');
      }

      // Check cancellation deadline
      const settings = reservation.restaurant.settings || {};
      const cancellationDeadlineHours = settings.cancellationDeadlineHours || 24;
      const cancellationDeadline = new Date(reservation.dateTime.getTime() - cancellationDeadlineHours * 60 * 60 * 1000);

      let cancellationFee = 0;
      if (new Date() > cancellationDeadline && !isAdmin) {
        // Apply cancellation fee if past deadline
        cancellationFee = settings.cancellationFee || 0;
      }

      // Update reservation
      await reservation.update({
        status: ReservationStatus.CANCELLED,
        cancellationReason: reason,
        cancellationFee,
        cancelledAt: new Date(),
        cancelledBy: isAdmin ? 'admin' : 'user'
      }, { transaction });

      await transaction.commit();

      // Send cancellation notification
      await this.sendReservationCancellation(reservation);

      // Clear cache
      await cache.del([
        CACHE_KEYS.USER_RESERVATIONS(userId),
        CACHE_KEYS.RESTAURANT_RESERVATIONS(reservation.restaurantId),
        CACHE_KEYS.TABLE_AVAILABILITY(reservation.restaurantId, reservation.dateTime.toISOString())
      ]);

      logInfo('Reservation cancelled successfully', {
        reservationId,
        reason,
        cancellationFee
      });

      return reservation;
    } catch (error) {
      await transaction.rollback();
      logError('Failed to cancel reservation', error);
      throw error;
    }
  }

  /**
   * Mark reservation as seated
   */
  static async markAsSeated(
    reservationId: string,
    restaurantOwnerId: string,
    isAdmin: boolean = false
  ): Promise<Reservation> {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Check ownership
    if (!isAdmin && reservation.restaurant.ownerId !== restaurantOwnerId) {
      throw new ForbiddenError('You can only manage reservations for your own restaurant');
    }

    // Check status
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestError('Only confirmed reservations can be marked as seated');
    }

    // Check if within reasonable time window (e.g., 30 minutes before/after)
    const now = new Date();
    const reservationTime = new Date(reservation.dateTime);
    const timeDiff = Math.abs(now.getTime() - reservationTime.getTime());
    const maxTimeDiff = 30 * 60 * 1000; // 30 minutes

    if (timeDiff > maxTimeDiff) {
      logWarning('Attempting to seat reservation outside time window', {
        reservationId,
        timeDiff: timeDiff / 60000
      });
    }

    // Update status
    await reservation.update({
      status: ReservationStatus.SEATED,
      seatedAt: now
    });

    logInfo('Reservation marked as seated', { reservationId });

    return reservation;
  }

  /**
   * Mark reservation as completed
   */
  static async markAsCompleted(
    reservationId: string,
    restaurantOwnerId: string,
    isAdmin: boolean = false
  ): Promise<Reservation> {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Check ownership
    if (!isAdmin && reservation.restaurant.ownerId !== restaurantOwnerId) {
      throw new ForbiddenError('You can only manage reservations for your own restaurant');
    }

    // Check status
    if (reservation.status !== ReservationStatus.SEATED) {
      throw new BadRequestError('Only seated reservations can be marked as completed');
    }

    // Update status
    await reservation.update({
      status: ReservationStatus.COMPLETED,
      completedAt: new Date()
    });

    // Clear cache
    await cache.del([
      CACHE_KEYS.USER_RESERVATIONS(reservation.userId),
      CACHE_KEYS.RESTAURANT_RESERVATIONS(reservation.restaurantId)
    ]);

    logInfo('Reservation marked as completed', { reservationId });

    return reservation;
  }

  /**
   * Mark reservation as no-show
   */
  static async markAsNoShow(
    reservationId: string,
    restaurantOwnerId: string,
    isAdmin: boolean = false
  ): Promise<Reservation> {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Check ownership
    if (!isAdmin && reservation.restaurant.ownerId !== restaurantOwnerId) {
      throw new ForbiddenError('You can only manage reservations for your own restaurant');
    }

    // Check if reservation time has passed
    if (new Date() < reservation.dateTime) {
      throw new BadRequestError('Cannot mark future reservations as no-show');
    }

    // Update status
    await reservation.update({
      status: ReservationStatus.NO_SHOW,
      noShowAt: new Date()
    });

    // Track no-show for user
    await this.trackNoShow(reservation.userId);

    // Clear cache
    await cache.del([
      CACHE_KEYS.USER_RESERVATIONS(reservation.userId),
      CACHE_KEYS.RESTAURANT_RESERVATIONS(reservation.restaurantId)
    ]);

    logInfo('Reservation marked as no-show', { reservationId });

    return reservation;
  }

  /**
   * Get reservation by ID
   */
  static async getReservationById(
    reservationId: string,
    userId?: string,
    isAdmin: boolean = false
  ): Promise<Reservation> {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          include: [{ model: RestaurantHours, as: 'hours' }]
        },
        { model: Table, as: 'table' },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Check access rights
    if (!isAdmin && userId && reservation.userId !== userId && reservation.restaurant.ownerId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return reservation;
  }

  /**
   * Search reservations
   */
  static async searchReservations(params: ReservationSearchParams): Promise<{
    reservations: Reservation[];
    total: number;
    page: number;
    pages: number;
  }> {
    const {
      userId,
      restaurantId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      includeDetails = false
    } = params;

    const where: any = {};

    if (userId) where.userId = userId;
    if (restaurantId) where.restaurantId = restaurantId;
    if (status && status.length > 0) where.status = { [Op.in]: status };

    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime[Op.gte] = startDate;
      if (endDate) where.dateTime[Op.lte] = endDate;
    }

    const include = includeDetails ? [
      {
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'address', 'city', 'cuisineType', 'priceRange']
      },
      { model: Table, as: 'table', attributes: ['id', 'tableNumber', 'capacity'] },
      { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }
    ] : [];

    const offset = (page - 1) * limit;

    const { rows: reservations, count: total } = await Reservation.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['dateTime', 'DESC']],
      distinct: true
    });

    const pages = Math.ceil(total / limit);

    return {
      reservations,
      total,
      page,
      pages
    };
  }

  /**
   * Get upcoming reservations for user
   */
  static async getUserUpcomingReservations(userId: string): Promise<Reservation[]> {
    const cacheKey = CACHE_KEYS.USER_RESERVATIONS(userId);
    const cached = await cache.get<Reservation[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const reservations = await Reservation.findAll({
      where: {
        userId,
        dateTime: { [Op.gte]: new Date() },
        status: { [Op.in]: [ReservationStatus.CONFIRMED, ReservationStatus.SEATED] }
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'city', 'cuisineType', 'priceRange', 'images']
        },
        { model: Table, as: 'table', attributes: ['id', 'tableNumber'] }
      ],
      order: [['dateTime', 'ASC']],
      limit: 10
    });

    await cache.set(cacheKey, reservations, CACHE_TTL.SHORT);

    return reservations;
  }

  /**
   * Get restaurant reservations for a date
   */
  static async getRestaurantReservations(
    restaurantId: string,
    date: Date
  ): Promise<Reservation[]> {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const cacheKey = CACHE_KEYS.RESTAURANT_RESERVATIONS(restaurantId, date.toISOString());
    const cached = await cache.get<Reservation[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const reservations = await Reservation.findAll({
      where: {
        restaurantId,
        dateTime: { [Op.between]: [start, end] },
        status: { [Op.notIn]: [ReservationStatus.CANCELLED] }
      },
      include: [
        { model: Table, as: 'table' },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phone'] }
      ],
      order: [['dateTime', 'ASC']]
    });

    await cache.set(cacheKey, reservations, CACHE_TTL.SHORT);

    return reservations;
  }

  /**
   * Send reminder notifications for upcoming reservations
   */
  static async sendReservationReminders(): Promise<void> {
    // Get reservations happening in the next 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reservations = await Reservation.findAll({
      where: {
        dateTime: {
          [Op.between]: [new Date(), tomorrow]
        },
        status: ReservationStatus.CONFIRMED,
        reminderSent: false
      },
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: User, as: 'user' }
      ]
    });

    for (const reservation of reservations) {
      try {
        await EmailService.sendReservationReminder(
          reservation.guestInfo.email,
          {
            firstName: reservation.guestInfo.firstName,
            restaurantName: reservation.restaurant.name,
            dateTime: reservation.dateTime,
            partySize: reservation.partySize,
            confirmationCode: reservation.confirmationCode,
            address: `${reservation.restaurant.address}, ${reservation.restaurant.city}`
          }
        );

        await reservation.update({ reminderSent: true });

        logInfo('Reservation reminder sent', { reservationId: reservation.id });
      } catch (error) {
        logError('Failed to send reservation reminder', error);
      }
    }
  }

  /**
   * Validate reservation datetime
   */
  private static async validateReservationDateTime(
    restaurant: Restaurant,
    dateTime: Date
  ): Promise<void> {
    // Check if date is in the future
    if (dateTime <= new Date()) {
      throw new BadRequestError('Reservation must be in the future');
    }

    // Check advance booking limit
    const settings = restaurant.settings || {};
    const maxAdvanceBookingDays = settings.maxAdvanceBookingDays || 90;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxAdvanceBookingDays);

    if (dateTime > maxDate) {
      throw new BadRequestError(`Reservations can only be made up to ${maxAdvanceBookingDays} days in advance`);
    }

    // Check restaurant hours
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateTime.getDay()];
    const hours = restaurant.hours.find(h => h.dayOfWeek === dayOfWeek);

    if (!hours || hours.isClosed) {
      throw new BadRequestError('Restaurant is closed on this day');
    }

    const timeStr = format(dateTime, 'HH:mm');
    if (timeStr < hours.openTime || timeStr > hours.lastReservationTime) {
      throw new BadRequestError(`Restaurant accepts reservations between ${hours.openTime} and ${hours.lastReservationTime}`);
    }
  }

  /**
   * Generate confirmation code
   */
  private static generateConfirmationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Send reservation confirmation email
   */
  private static async sendReservationConfirmation(reservation: Reservation): Promise<void> {
    try {
      const fullReservation = await this.getReservationById(reservation.id);

      await EmailService.sendReservationConfirmation(
        fullReservation.guestInfo.email,
        {
          firstName: fullReservation.guestInfo.firstName,
          restaurantName: fullReservation.restaurant.name,
          dateTime: fullReservation.dateTime,
          partySize: fullReservation.partySize,
          confirmationCode: fullReservation.confirmationCode,
          tableNumber: fullReservation.table?.tableNumber,
          address: `${fullReservation.restaurant.address}, ${fullReservation.restaurant.city}`,
          specialRequests: fullReservation.specialRequests
        }
      );
    } catch (error) {
      logError('Failed to send reservation confirmation', error);
    }
  }

  /**
   * Send reservation update notification
   */
  private static async sendReservationUpdate(reservation: Reservation): Promise<void> {
    try {
      const fullReservation = await this.getReservationById(reservation.id);

      await EmailService.sendReservationUpdate(
        fullReservation.guestInfo.email,
        {
          firstName: fullReservation.guestInfo.firstName,
          restaurantName: fullReservation.restaurant.name,
          dateTime: fullReservation.dateTime,
          partySize: fullReservation.partySize,
          confirmationCode: fullReservation.confirmationCode
        }
      );
    } catch (error) {
      logError('Failed to send reservation update', error);
    }
  }

  /**
   * Send reservation cancellation notification
   */
  private static async sendReservationCancellation(reservation: Reservation): Promise<void> {
    try {
      await EmailService.sendReservationCancellation(
        reservation.guestInfo.email,
        {
          firstName: reservation.guestInfo.firstName,
          restaurantName: reservation.restaurant.name,
          dateTime: reservation.dateTime,
          confirmationCode: reservation.confirmationCode,
          cancellationReason: reservation.cancellationReason
        }
      );
    } catch (error) {
      logError('Failed to send reservation cancellation', error);
    }
  }

  /**
   * Track no-shows for user
   */
  private static async trackNoShow(userId: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (user) {
      const noShowCount = (user.preferences?.noShowCount || 0) + 1;
      await user.update({
        preferences: {
          ...user.preferences,
          noShowCount,
          lastNoShowDate: new Date()
        }
      });

      // If user has too many no-shows, flag account
      if (noShowCount >= 3) {
        logWarning('User has excessive no-shows', { userId, noShowCount });
      }
    }
  }

  /**
   * Send upcoming reservation reminders
   */
  static async sendUpcomingReminders(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Find reservations for tomorrow
    const upcomingReservations = await Reservation.findAll({
      where: {
        dateTime: {
          [Op.gte]: tomorrow,
          [Op.lt]: dayAfterTomorrow
        },
        status: ReservationStatus.CONFIRMED,
        reminderSent: false
      },
      include: [
        { model: User, as: 'user' },
        { model: Restaurant, as: 'restaurant' }
      ]
    });

    for (const reservation of upcomingReservations) {
      try {
        // Send reminder email
        await EmailService.sendReservationReminder(
          reservation.user.email,
          {
            firstName: reservation.user.firstName,
            restaurantName: reservation.restaurant.name,
            date: reservation.dateTime.toLocaleDateString(),
            time: reservation.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            partySize: reservation.partySize,
            confirmationCode: reservation.confirmationCode,
            restaurantAddress: `${reservation.restaurant.address}, ${reservation.restaurant.city}, ${reservation.restaurant.state}`,
            reservationLink: `${process.env.FRONTEND_URL}/reservations/${reservation.id}`
          }
        );

        // Mark reminder as sent
        await reservation.update({ reminderSent: true });

        // Send push notification if user has mobile app
        if (process.env.FIREBASE_PROJECT_ID) {
          const PushNotificationService = require('./push-notification.service').PushNotificationService;
          await PushNotificationService.sendReservationReminder(reservation.id);
        }

        logInfo('Reservation reminder sent', {
          reservationId: reservation.id,
          userId: reservation.userId
        });
      } catch (error) {
        logError('Failed to send reservation reminder', {
          reservationId: reservation.id,
          error
        });
      }
    }
  }

  /**
   * Send review requests for completed reservations
   */
  static async sendReviewRequests(): Promise<void> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Find completed reservations from yesterday
    const completedReservations = await Reservation.findAll({
      where: {
        completedAt: {
          [Op.gte]: twoDaysAgo,
          [Op.lt]: oneDayAgo
        },
        status: ReservationStatus.COMPLETED,
        reviewRequestSent: false
      },
      include: [
        { model: User, as: 'user' },
        { model: Restaurant, as: 'restaurant' },
        {
          model: Review,
          as: 'review',
          required: false
        }
      ]
    });

    for (const reservation of completedReservations) {
      // Skip if user already left a review
      if (reservation.review) {
        await reservation.update({ reviewRequestSent: true });
        continue;
      }

      try {
        await EmailService.sendReviewRequest(
          reservation.user.email,
          {
            firstName: reservation.user.firstName,
            restaurantName: reservation.restaurant.name,
            restaurantId: reservation.restaurantId,
            reservationId: reservation.id
          }
        );

        await reservation.update({ reviewRequestSent: true });

        logInfo('Review request sent', {
          reservationId: reservation.id,
          userId: reservation.userId
        });
      } catch (error) {
        logError('Failed to send review request', {
          reservationId: reservation.id,
          error
        });
      }
    }
  }
}