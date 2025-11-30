import { GuestReservation } from '../models/GuestReservation';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { Op } from 'sequelize';

export interface CreateGuestReservationDto {
  restaurantId: string;
  guestEmail: string;
  guestName: string;
  guestPhone: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
  dietaryRestrictions?: string[];
  occasionType?: string;
}

export interface GuestReservationQueryParams {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  restaurantId?: string;
  page?: number;
  limit?: number;
}

export class GuestReservationService {
  /**
   * Create a guest reservation without requiring login
   */
  async createGuestReservation(data: CreateGuestReservationDto): Promise<GuestReservation> {
    // Verify restaurant exists
    const restaurant = await Restaurant.findByPk(data.restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Generate unique confirmation code and management token
    const confirmationCode = this.generateConfirmationCode();
    const managementToken = this.generateManagementToken();

    // Check if user with this email exists (for potential linking later)
    const existingUser = await User.findOne({ where: { email: data.guestEmail } });

    const reservation = await GuestReservation.create({
      restaurantId: data.restaurantId,
      userId: existingUser ? existingUser.id : null,
      guestEmail: data.guestEmail,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      date: data.date,
      time: data.time,
      partySize: data.partySize,
      specialRequests: data.specialRequests || '',
      dietaryRestrictions: data.dietaryRestrictions || [],
      occasionType: data.occasionType || 'other',
      confirmationCode,
      managementToken,
      status: 'confirmed',
    });

    return reservation;
  }

  /**
   * Get reservation by management token (for guest access)
   */
  async getByManagementToken(token: string): Promise<GuestReservation | null> {
    const reservation = await GuestReservation.findOne({
      where: { managementToken: token },
      include: [{ model: Restaurant }],
    });

    return reservation;
  }

  /**
   * Get reservation by confirmation code
   */
  async getByConfirmationCode(code: string): Promise<GuestReservation | null> {
    const reservation = await GuestReservation.findOne({
      where: { confirmationCode: code },
      include: [{ model: Restaurant }],
    });

    return reservation;
  }

  /**
   * Update guest reservation
   */
  async updateGuestReservation(
    managementToken: string,
    updates: Partial<CreateGuestReservationDto>
  ): Promise<GuestReservation> {
    const reservation = await this.getByManagementToken(managementToken);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Don't allow updates if reservation is in the past or completed
    if (reservation.status === 'completed' || reservation.status === 'no_show') {
      throw new Error('Cannot modify completed or no-show reservations');
    }

    await reservation.update(updates);
    return reservation;
  }

  /**
   * Cancel guest reservation
   */
  async cancelGuestReservation(managementToken: string): Promise<GuestReservation> {
    const reservation = await this.getByManagementToken(managementToken);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status === 'cancelled') {
      throw new Error('Reservation is already cancelled');
    }

    await reservation.update({ status: 'cancelled' });
    return reservation;
  }

  /**
   * Link guest reservation to user account when they sign up
   */
  async linkToUserAccount(guestEmail: string, userId: string): Promise<number> {
    const [updatedCount] = await GuestReservation.update(
      { userId, accountCreatedLater: true },
      { where: { guestEmail, userId: null } }
    );

    return updatedCount;
  }

  /**
   * Get all guest reservations for a restaurant
   */
  async getRestaurantGuestReservations(
    restaurantId: string,
    params: GuestReservationQueryParams = {}
  ): Promise<{ reservations: GuestReservation[]; total: number }> {
    const {
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = params;

    const where: any = { restaurantId };

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    }

    const offset = (page - 1) * limit;

    const { rows: reservations, count: total } = await GuestReservation.findAndCountAll({
      where,
      include: [{ model: Restaurant }],
      limit,
      offset,
      order: [['date', 'DESC'], ['time', 'DESC']],
    });

    return { reservations, total };
  }

  /**
   * Search guest reservations by email or phone
   */
  async searchGuestReservations(query: string): Promise<GuestReservation[]> {
    const reservations = await GuestReservation.findAll({
      where: {
        [Op.or]: [
          { guestEmail: { [Op.iLike]: `%${query}%` } },
          { guestPhone: { [Op.iLike]: `%${query}%` } },
          { guestName: { [Op.iLike]: `%${query}%` } },
        ],
      },
      include: [{ model: Restaurant }],
      limit: 50,
      order: [['createdAt', 'DESC']],
    });

    return reservations;
  }

  /**
   * Mark SMS reminder as sent
   */
  async markSmsReminderSent(reservationId: string): Promise<void> {
    await GuestReservation.update(
      { smsReminderSent: true },
      { where: { id: reservationId } }
    );
  }

  /**
   * Mark email reminder as sent
   */
  async markEmailReminderSent(reservationId: string): Promise<void> {
    await GuestReservation.update(
      { emailReminderSent: true },
      { where: { id: reservationId } }
    );
  }

  /**
   * Get upcoming reservations needing reminders
   */
  async getReservationsNeedingReminders(hoursAhead: number): Promise<GuestReservation[]> {
    const targetDate = new Date();
    targetDate.setHours(targetDate.getHours() + hoursAhead);

    const reservations = await GuestReservation.findAll({
      where: {
        status: 'confirmed',
        date: targetDate.toISOString().split('T')[0],
        [Op.or]: [
          { smsReminderSent: false },
          { emailReminderSent: false },
        ],
      },
      include: [{ model: Restaurant }],
    });

    return reservations;
  }

  /**
   * Generate 6-character confirmation code
   */
  private generateConfirmationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Generate secure management token
   */
  private generateManagementToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get statistics for guest reservations
   */
  async getGuestReservationStats(restaurantId: string): Promise<any> {
    const total = await GuestReservation.count({ where: { restaurantId } });
    const converted = await GuestReservation.count({
      where: { restaurantId, accountCreatedLater: true },
    });
    const pending = await GuestReservation.count({
      where: { restaurantId, status: 'pending' },
    });
    const confirmed = await GuestReservation.count({
      where: { restaurantId, status: 'confirmed' },
    });
    const noShows = await GuestReservation.count({
      where: { restaurantId, status: 'no_show' },
    });

    return {
      total,
      converted,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
      pending,
      confirmed,
      noShows,
      noShowRate: confirmed > 0 ? (noShows / confirmed) * 100 : 0,
    };
  }
}

export default new GuestReservationService();
