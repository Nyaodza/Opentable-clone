import { Booking, BookingStatus, BookingSource } from '../models/Booking.model';
import { Restaurant } from '../models/Restaurant';
import { Table, TableStatus } from '../models/Table';
import { User } from '../models/User';
import { EmailService } from './email.service';
import { RedisService } from './redis.service';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';

interface CreateBookingDTO {
  userId: string;
  restaurantId: string;
  bookingDate: Date;
  bookingTime: string;
  partySize: number;
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail?: string;
  guestPhone?: string;
  specialRequests?: string;
  occasion?: string;
  dietaryRestrictions?: string[];
  seatingPreference?: string;
  source?: BookingSource;
}

interface UpdateBookingDTO {
  bookingDate?: Date;
  bookingTime?: string;
  partySize?: number;
  specialRequests?: string;
  occasion?: string;
  dietaryRestrictions?: string[];
  seatingPreference?: string;
}

interface AvailabilityCheckDTO {
  restaurantId: string;
  date: Date;
  partySize: number;
  time?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  tablesAvailable: number;
}

export class BookingService {
  private static emailService = new EmailService();
  private static redisService = RedisService.getInstance();
  private static readonly CACHE_TTL = 300; // 5 minutes for availability cache

  /**
   * Create new booking
   */
  static async createBooking(data: CreateBookingDTO): Promise<Booking> {
    const transaction = await sequelize.transaction();

    try {
      // Validate restaurant exists and is active
      const restaurant = await Restaurant.findByPk(data.restaurantId);
      if (!restaurant || restaurant.status !== 'active') {
        throw new Error('Restaurant not found or not available for bookings');
      }

      // Check if restaurant accepts reservations
      if (!restaurant.acceptsReservations) {
        throw new Error('This restaurant does not accept online reservations');
      }

      // Validate party size
      if (data.partySize < restaurant.minPartySize || data.partySize > restaurant.maxPartySize) {
        throw new Error(`Party size must be between ${restaurant.minPartySize} and ${restaurant.maxPartySize}`);
      }

      // Check availability
      const isAvailable = await this.checkAvailability({
        restaurantId: data.restaurantId,
        date: data.bookingDate,
        time: data.bookingTime,
        partySize: data.partySize
      });

      if (!isAvailable) {
        throw new Error('No tables available for the selected time');
      }

      // Find and assign a table
      const table = await this.findAvailableTable(
        data.restaurantId,
        data.bookingDate,
        data.bookingTime,
        data.partySize,
        transaction
      );

      if (!table) {
        throw new Error('No suitable table available');
      }

      // Create booking
      const booking = await Booking.create(
        {
          ...data,
          tableId: table.id,
          status: BookingStatus.CONFIRMED,
          duration: restaurant.reservationSlotDuration * 2, // Default to 2 slots
          source: data.source || BookingSource.WEBSITE
        },
        { transaction }
      );

      // Reserve the table
      await table.reserve();

      // Update restaurant stats
      restaurant.totalBookings += 1;
      await restaurant.save({ transaction });

      // Fetch user for email
      const user = await User.findByPk(data.userId);

      // Commit transaction
      await transaction.commit();

      // Send confirmation email
      if (user) {
        const bookingWithDetails = await this.getBookingById(booking.id);
        await this.emailService.sendBookingConfirmationEmail(user, bookingWithDetails);
      }

      // Clear availability cache
      await this.clearAvailabilityCache(data.restaurantId, data.bookingDate);

      return booking;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update booking
   */
  static async updateBooking(
    bookingId: string,
    userId: string,
    data: UpdateBookingDTO
  ): Promise<Booking> {
    const booking = await Booking.findOne({
      where: { id: bookingId, userId },
      include: [Restaurant]
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (!booking.canBeModified()) {
      throw new Error('Booking cannot be modified at this time');
    }

    // If date, time, or party size changed, check availability
    if (data.bookingDate || data.bookingTime || data.partySize) {
      const isAvailable = await this.checkAvailability({
        restaurantId: booking.restaurantId,
        date: data.bookingDate || booking.bookingDate,
        time: data.bookingTime || booking.bookingTime,
        partySize: data.partySize || booking.partySize
      });

      if (!isAvailable) {
        throw new Error('No availability for the requested changes');
      }

      // Find new table if needed
      if (data.partySize && data.partySize !== booking.partySize) {
        const newTable = await this.findAvailableTable(
          booking.restaurantId,
          data.bookingDate || booking.bookingDate,
          data.bookingTime || booking.bookingTime,
          data.partySize
        );

        if (!newTable) {
          throw new Error('No suitable table available for the new party size');
        }

        // Release old table
        if (booking.tableId) {
          const oldTable = await Table.findByPk(booking.tableId);
          if (oldTable) {
            await oldTable.release();
          }
        }

        // Reserve new table
        await newTable.reserve();
        booking.tableId = newTable.id;
      }
    }

    // Update booking
    await booking.update(data);

    // Send update confirmation email
    const user = await User.findByPk(booking.userId);
    if (user) {
      // await this.emailService.sendBookingUpdateEmail(user, booking);
    }

    // Clear availability cache
    await this.clearAvailabilityCache(booking.restaurantId, booking.bookingDate);
    if (data.bookingDate) {
      await this.clearAvailabilityCache(booking.restaurantId, data.bookingDate);
    }

    return booking;
  }

  /**
   * Cancel booking
   */
  static async cancelBooking(
    bookingId: string,
    userId: string,
    reason: string
  ): Promise<Booking> {
    const booking = await Booking.findOne({
      where: { id: bookingId, userId }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    await booking.cancel(reason, 'guest');

    // Send cancellation email
    const user = await User.findByPk(booking.userId);
    if (user) {
      // await this.emailService.sendBookingCancellationEmail(user, booking);
    }

    // Clear availability cache
    await this.clearAvailabilityCache(booking.restaurantId, booking.bookingDate);

    return booking;
  }

  /**
   * Get booking by ID
   */
  static async getBookingById(bookingId: string): Promise<Booking | null> {
    return Booking.findByPk(bookingId, {
      include: [
        { model: Restaurant },
        { model: Table },
        { model: User }
      ]
    });
  }

  /**
   * Get user bookings
   */
  static async getUserBookings(
    userId: string,
    status?: BookingStatus,
    upcoming?: boolean
  ): Promise<Booking[]> {
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (upcoming === true) {
      where.bookingDateTime = { [Op.gte]: new Date() };
    } else if (upcoming === false) {
      where.bookingDateTime = { [Op.lt]: new Date() };
    }

    return Booking.findAll({
      where,
      include: [Restaurant, Table],
      order: [['bookingDateTime', upcoming ? 'ASC' : 'DESC']]
    });
  }

  /**
   * Get restaurant bookings
   */
  static async getRestaurantBookings(
    restaurantId: string,
    date?: Date,
    status?: BookingStatus
  ): Promise<Booking[]> {
    const where: any = { restaurantId };

    if (date) {
      where.bookingDate = date;
    }

    if (status) {
      where.status = status;
    }

    return Booking.findAll({
      where,
      include: [User, Table],
      order: [['bookingDateTime', 'ASC']]
    });
  }

  /**
   * Check availability
   */
  static async checkAvailability(params: AvailabilityCheckDTO): Promise<boolean> {
    const { restaurantId, date, partySize, time } = params;

    // Get restaurant
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return false;
    }

    // Check if restaurant is open on this date
    const dayOfWeek = date.getDay();
    const dateWithTime = new Date(date);
    if (time) {
      const [hours, minutes] = time.split(':');
      dateWithTime.setHours(parseInt(hours), parseInt(minutes));
    }

    if (!restaurant.isOpenAt(dateWithTime)) {
      return false;
    }

    // Check if date is within booking window
    const maxBookingDate = new Date();
    maxBookingDate.setDate(maxBookingDate.getDate() + restaurant.reservationDaysInAdvance);
    if (date > maxBookingDate) {
      return false;
    }

    // Check table availability
    if (time) {
      const availableTables = await this.getAvailableTablesCount(
        restaurantId,
        date,
        time,
        partySize
      );
      return availableTables > 0;
    }

    return true;
  }

  /**
   * Get available time slots
   */
  static async getAvailableTimeSlots(
    restaurantId: string,
    date: Date,
    partySize: number
  ): Promise<TimeSlot[]> {
    // Try cache first
    const cacheKey = `availability:${restaurantId}:${date.toISOString()}:${partySize}`;
    const cached = await this.redisService.getJSON<TimeSlot[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return [];
    }

    const slots = restaurant.getAvailableSlots(date);
    const timeSlots: TimeSlot[] = [];

    for (const slot of slots) {
      const availableTables = await this.getAvailableTablesCount(
        restaurantId,
        date,
        slot,
        partySize
      );

      timeSlots.push({
        time: slot,
        available: availableTables > 0,
        tablesAvailable: availableTables
      });
    }

    // Cache the result
    await this.redisService.setJSON(cacheKey, timeSlots, this.CACHE_TTL);

    return timeSlots;
  }

  /**
   * Find available table
   */
  private static async findAvailableTable(
    restaurantId: string,
    date: Date,
    time: string,
    partySize: number,
    transaction?: Transaction
  ): Promise<Table | null> {
    // Get all tables that can accommodate the party size
    const tables = await Table.findAll({
      where: {
        restaurantId,
        isActive: true,
        status: TableStatus.AVAILABLE,
        minCapacity: { [Op.lte]: partySize },
        maxCapacity: { [Op.gte]: partySize }
      },
      order: [['maxCapacity', 'ASC']], // Prefer smaller tables that fit
      transaction
    });

    // Check each table for availability at the specific time
    for (const table of tables) {
      const isAvailable = await this.isTableAvailable(table.id, date, time, transaction);
      if (isAvailable) {
        return table;
      }
    }

    // Try to find combinable tables if no single table is available
    // This would be more complex logic to find tables that can be combined

    return null;
  }

  /**
   * Check if specific table is available
   */
  private static async isTableAvailable(
    tableId: string,
    date: Date,
    time: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const [hours, minutes] = time.split(':');
    const startTime = new Date(date);
    startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 2); // Assume 2-hour booking duration

    const conflictingBookings = await Booking.findOne({
      where: {
        tableId,
        bookingDate: date,
        status: {
          [Op.in]: [BookingStatus.CONFIRMED, BookingStatus.SEATED]
        },
        [Op.or]: [
          {
            bookingTime: {
              [Op.between]: [
                startTime.toTimeString().slice(0, 5),
                endTime.toTimeString().slice(0, 5)
              ]
            }
          }
        ]
      },
      transaction
    });

    return !conflictingBookings;
  }

  /**
   * Get available tables count
   */
  private static async getAvailableTablesCount(
    restaurantId: string,
    date: Date,
    time: string,
    partySize: number
  ): Promise<number> {
    const tables = await Table.findAll({
      where: {
        restaurantId,
        isActive: true,
        status: TableStatus.AVAILABLE,
        minCapacity: { [Op.lte]: partySize },
        maxCapacity: { [Op.gte]: partySize }
      }
    });

    let availableCount = 0;
    for (const table of tables) {
      const isAvailable = await this.isTableAvailable(table.id, date, time);
      if (isAvailable) {
        availableCount++;
      }
    }

    return availableCount;
  }

  /**
   * Clear availability cache
   */
  private static async clearAvailabilityCache(restaurantId: string, date: Date): Promise<void> {
    const pattern = `availability:${restaurantId}:${date.toISOString()}:*`;
    await this.redisService.invalidatePattern(pattern);
  }

  /**
   * Send reminder notifications
   */
  static async sendReminders(): Promise<void> {
    // Find bookings that need reminders (24 hours before)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const bookings = await Booking.findAll({
      where: {
        bookingDateTime: {
          [Op.between]: [tomorrow, tomorrowEnd]
        },
        status: BookingStatus.CONFIRMED,
        reminderSent: false
      },
      include: [User, Restaurant]
    });

    for (const booking of bookings) {
      if (booking.user) {
        // await this.emailService.sendBookingReminderEmail(booking.user, booking);
        booking.reminderSent = true;
        booking.reminderSentAt = new Date();
        await booking.save();
      }
    }
  }

  /**
   * Mark no-shows
   */
  static async markNoShows(): Promise<void> {
    // Find bookings that are past their time and still confirmed
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    const bookings = await Booking.findAll({
      where: {
        bookingDateTime: { [Op.lt]: thirtyMinutesAgo },
        status: BookingStatus.CONFIRMED
      }
    });

    for (const booking of bookings) {
      await booking.markAsNoShow();
    }
  }
}