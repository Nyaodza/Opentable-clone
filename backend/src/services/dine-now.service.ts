import { Restaurant } from '../models/Restaurant';
import { Table } from '../models/Table';
import { Reservation } from '../models/Reservation';
import { RestaurantHours } from '../models/RestaurantHours';
import { Op } from 'sequelize';

export interface DineNowRestaurant {
  restaurant: Restaurant;
  availableTables: number;
  availablePartySize: number[];
  estimatedWaitTime: number;
  distance?: number;
  nextAvailableTime?: string;
}

export interface DineNowSearchParams {
  latitude?: number;
  longitude?: number;
  partySize?: number;
  maxDistance?: number; // in km
  cuisine?: string;
  priceRange?: string;
  limit?: number;
}

export class DineNowService {
  /**
   * Find restaurants with immediate availability (within 30-45 minutes)
   */
  async findDineNowRestaurants(params: DineNowSearchParams): Promise<DineNowRestaurant[]> {
    const {
      latitude,
      longitude,
      partySize = 2,
      maxDistance = 10,
      cuisine,
      priceRange,
      limit = 20,
    } = params;

    // Get current time details
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    const currentDay = now.getDay();

    // Build where clause for restaurants
    const whereClause: any = {
      isActive: true,
      acceptsReservations: true,
    };

    if (cuisine) {
      whereClause.cuisine = cuisine;
    }

    if (priceRange) {
      whereClause.priceRange = priceRange;
    }

    // Get all potentially available restaurants
    const restaurants = await Restaurant.findAll({
      where: whereClause,
      include: [
        {
          model: Table,
          as: 'tables',
          where: { isActive: true },
          required: true,
        },
        {
          model: RestaurantHours,
          as: 'hours',
          where: {
            dayOfWeek: currentDay,
            openTime: { [Op.lte]: currentTime },
            closeTime: { [Op.gte]: currentTime },
          },
          required: true,
        },
      ],
      limit: limit * 2, // Get more to filter down
    });

    // Check availability for each restaurant
    const availableRestaurants: DineNowRestaurant[] = [];

    for (const restaurant of restaurants) {
      const availability = await this.checkImmediateAvailability(
        restaurant.id,
        partySize,
        currentDate,
        currentTime
      );

      if (availability.hasAvailability) {
        // Calculate distance if coordinates provided
        let distance: number | undefined;
        if (latitude && longitude && restaurant.latitude && restaurant.longitude) {
          distance = this.calculateDistance(
            latitude,
            longitude,
            restaurant.latitude,
            restaurant.longitude
          );

          // Skip if too far
          if (distance > maxDistance) {
            continue;
          }
        }

        availableRestaurants.push({
          restaurant,
          availableTables: availability.availableTables,
          availablePartySize: availability.availablePartySize,
          estimatedWaitTime: availability.estimatedWaitTime,
          distance,
          nextAvailableTime: availability.nextAvailableTime,
        });
      }
    }

    // Sort by wait time, then by distance
    availableRestaurants.sort((a, b) => {
      if (a.estimatedWaitTime !== b.estimatedWaitTime) {
        return a.estimatedWaitTime - b.estimatedWaitTime;
      }
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });

    return availableRestaurants.slice(0, limit);
  }

  /**
   * Check if restaurant has immediate availability
   */
  async checkImmediateAvailability(
    restaurantId: string,
    partySize: number,
    date: string,
    time: string
  ): Promise<{
    hasAvailability: boolean;
    availableTables: number;
    availablePartySize: number[];
    estimatedWaitTime: number;
    nextAvailableTime?: string;
  }> {
    // Get all tables for the restaurant
    const tables = await Table.findAll({
      where: {
        restaurantId,
        isActive: true,
        capacity: { [Op.gte]: partySize },
      },
    });

    if (tables.length === 0) {
      return {
        hasAvailability: false,
        availableTables: 0,
        availablePartySize: [],
        estimatedWaitTime: 999,
      };
    }

    // Get current reservations
    const [hours, minutes] = time.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;
    const windowStart = this.minutesToTime(Math.max(0, currentMinutes - 30));
    const windowEnd = this.minutesToTime(Math.min(1439, currentMinutes + 180)); // 3 hours ahead

    const activeReservations = await Reservation.findAll({
      where: {
        restaurantId,
        date,
        time: {
          [Op.between]: [windowStart, windowEnd],
        },
        status: {
          [Op.in]: ['confirmed', 'seated'],
        },
      },
    });

    // Calculate available tables
    const occupiedTableIds = new Set(activeReservations.map(r => r.tableId));
    const availableTables = tables.filter(t => !occupiedTableIds.has(t.id));

    // Determine available party sizes
    const availablePartySize = [...new Set(availableTables.map(t => t.capacity))].sort(
      (a, b) => a - b
    );

    // Estimate wait time
    let estimatedWaitTime = 0;
    if (availableTables.length === 0) {
      // Find next available slot
      const nextSlot = await this.findNextAvailableSlot(restaurantId, date, time, partySize);
      estimatedWaitTime = nextSlot.waitMinutes;

      return {
        hasAvailability: estimatedWaitTime <= 45, // Only show if within 45 min
        availableTables: 0,
        availablePartySize: [],
        estimatedWaitTime,
        nextAvailableTime: nextSlot.time,
      };
    } else {
      // Immediate availability or very short wait
      estimatedWaitTime = availableTables.length > tables.length * 0.5 ? 0 : 15;
    }

    return {
      hasAvailability: true,
      availableTables: availableTables.length,
      availablePartySize,
      estimatedWaitTime,
    };
  }

  /**
   * Find next available time slot
   */
  private async findNextAvailableSlot(
    restaurantId: string,
    date: string,
    currentTime: string,
    partySize: number
  ): Promise<{ time: string; waitMinutes: number }> {
    const [hours, minutes] = currentTime.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;

    // Check slots in 15-minute intervals
    for (let offset = 15; offset <= 180; offset += 15) {
      const checkMinutes = currentMinutes + offset;
      if (checkMinutes >= 1440) break; // Past midnight

      const checkTime = this.minutesToTime(checkMinutes);
      const availability = await this.checkImmediateAvailability(
        restaurantId,
        partySize,
        date,
        checkTime
      );

      if (availability.hasAvailability && availability.availableTables > 0) {
        return { time: checkTime, waitMinutes: offset };
      }
    }

    return { time: '', waitMinutes: 999 };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert minutes since midnight to HH:MM format
   */
  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Create immediate reservation (Dine Now booking)
   */
  async createDineNowReservation(
    restaurantId: string,
    userId: string | null,
    guestData: any,
    partySize: number
  ): Promise<any> {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].substring(0, 5);

    // Check availability
    const availability = await this.checkImmediateAvailability(restaurantId, partySize, date, time);

    if (!availability.hasAvailability) {
      throw new Error('No immediate availability. Try booking for later.');
    }

    // Create reservation (use appropriate service based on user/guest)
    // This would integrate with your existing reservation services

    return {
      success: true,
      date,
      time,
      estimatedWaitTime: availability.estimatedWaitTime,
      message:
        availability.estimatedWaitTime === 0
          ? 'Your table is ready!'
          : `Your table will be ready in approximately ${availability.estimatedWaitTime} minutes`,
    };
  }
}

export default new DineNowService();
