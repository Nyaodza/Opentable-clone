import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { RestaurantHours } from '../models/RestaurantHours';
import { Review } from '../models/Review';
import { Op } from 'sequelize';
import { cache, CACHE_KEYS, CACHE_TTL } from '../config/redis';
import { logInfo } from '../utils/logger';
import * as geolib from 'geolib';

interface DeviceInfo {
  userId: string;
  deviceToken: string;
  platform: 'ios' | 'android';
  deviceModel?: string;
  appVersion?: string;
  osVersion?: string;
  language?: string;
  timezone?: string;
}

interface LocationUpdate {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

interface MobileSearchFilters {
  latitude?: number;
  longitude?: number;
  radius?: number;
  quickFilters?: string[];
  sortBy?: 'nearest' | 'rating' | 'trending';
}

export class MobileService {
  /**
   * Register device for push notifications
   */
  static async registerDevice(deviceInfo: DeviceInfo): Promise<void> {
    const user = await User.findByPk(deviceInfo.userId);
    if (!user) return;

    // Store device info in user preferences
    const devices = user.preferences?.devices || [];
    const existingDeviceIndex = devices.findIndex(
      d => d.deviceToken === deviceInfo.deviceToken
    );

    if (existingDeviceIndex >= 0) {
      devices[existingDeviceIndex] = {
        ...deviceInfo,
        lastActive: new Date()
      };
    } else {
      devices.push({
        ...deviceInfo,
        registeredAt: new Date(),
        lastActive: new Date()
      });
    }

    await user.update({
      preferences: {
        ...user.preferences,
        devices
      }
    });

    logInfo('Device registered', {
      userId: deviceInfo.userId,
      platform: deviceInfo.platform
    });
  }

  /**
   * Unregister device
   */
  static async unregisterDevice(userId: string, deviceToken: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) return;

    const devices = user.preferences?.devices || [];
    const filteredDevices = devices.filter(d => d.deviceToken !== deviceToken);

    await user.update({
      preferences: {
        ...user.preferences,
        devices: filteredDevices
      }
    });

    logInfo('Device unregistered', { userId, deviceToken });
  }

  /**
   * Update user location
   */
  static async updateLocation(location: LocationUpdate): Promise<void> {
    const cacheKey = CACHE_KEYS.USER_LOCATION(location.userId);
    
    await cache.set(cacheKey, {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp
    }, CACHE_TTL.MEDIUM);

    // Update user's last known location
    await User.update({
      lastKnownLatitude: location.latitude,
      lastKnownLongitude: location.longitude,
      locationUpdatedAt: location.timestamp
    }, {
      where: { id: location.userId }
    });

    logInfo('User location updated', { userId: location.userId });
  }

  /**
   * Get nearby restaurants optimized for mobile
   */
  static async getNearbyRestaurants(
    userId: string,
    filters: MobileSearchFilters
  ): Promise<{
    restaurants: Array<{
      restaurant: Restaurant;
      distance: number;
      walkTime: number;
      driveTime: number;
      isOpen: boolean;
      nextAvailable?: string;
      quickInfo: {
        priceLevel: string;
        topCuisine: string;
        rating: number;
        reviewCount: number;
      };
    }>;
    userLocation: { latitude: number; longitude: number };
  }> {
    let userLocation: { latitude: number; longitude: number };

    // Get user location
    if (filters.latitude && filters.longitude) {
      userLocation = {
        latitude: filters.latitude,
        longitude: filters.longitude
      };
    } else {
      // Get from cache or user profile
      const cachedLocation = await cache.get<any>(CACHE_KEYS.USER_LOCATION(userId));
      if (cachedLocation) {
        userLocation = cachedLocation;
      } else {
        const user = await User.findByPk(userId);
        if (user?.lastKnownLatitude && user?.lastKnownLongitude) {
          userLocation = {
            latitude: user.lastKnownLatitude,
            longitude: user.lastKnownLongitude
          };
        } else {
          throw new Error('Location not available');
        }
      }
    }

    const radius = filters.radius || 5; // Default 5 miles

    // Find restaurants within radius
    const restaurants = await Restaurant.findAll({
      where: {
        isActive: true,
        latitude: { [Op.ne]: null },
        longitude: { [Op.ne]: null }
      },
      include: [
        { model: RestaurantHours, as: 'hours' },
        {
          model: Review,
          as: 'reviews',
          attributes: [],
          required: false
        }
      ],
      attributes: {
        include: [
          [
            `(6371 * acos(cos(radians(${userLocation.latitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${userLocation.longitude})) + sin(radians(${userLocation.latitude})) * sin(radians(latitude))))`,
            'distance'
          ]
        ]
      },
      having: {
        distance: { [Op.lte]: radius }
      },
      order: filters.sortBy === 'rating' ? [['averageRating', 'DESC']] : [[`distance`, 'ASC']],
      limit: 50
    });

    // Process restaurants for mobile display
    const processedRestaurants = await Promise.all(
      restaurants.map(async (restaurant) => {
        const distance = (restaurant as any).distance;
        
        // Calculate estimated times
        const walkTime = Math.round(distance * 20); // Assuming 3mph walking speed
        const driveTime = Math.round(distance * 2); // Assuming 30mph average driving speed

        // Check if currently open
        const now = new Date();
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
        const currentTime = now.toTimeString().slice(0, 5);
        
        const todayHours = restaurant.hours.find(h => h.dayOfWeek === dayOfWeek);
        const isOpen = todayHours && !todayHours.isClosed && 
          currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;

        // Get next available time if closed
        let nextAvailable;
        if (!isOpen && todayHours && !todayHours.isClosed) {
          if (currentTime < todayHours.openTime) {
            nextAvailable = `Today at ${todayHours.openTime}`;
          } else {
            // Find next open day
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tomorrow.getDay()];
            const tomorrowHours = restaurant.hours.find(h => h.dayOfWeek === tomorrowDay);
            if (tomorrowHours && !tomorrowHours.isClosed) {
              nextAvailable = `Tomorrow at ${tomorrowHours.openTime}`;
            }
          }
        }

        return {
          restaurant,
          distance: Math.round(distance * 10) / 10,
          walkTime,
          driveTime,
          isOpen,
          nextAvailable,
          quickInfo: {
            priceLevel: restaurant.priceRange,
            topCuisine: restaurant.cuisineType,
            rating: restaurant.averageRating,
            reviewCount: restaurant.totalReviews
          }
        };
      })
    );

    // Apply quick filters
    let filteredRestaurants = processedRestaurants;
    if (filters.quickFilters && filters.quickFilters.length > 0) {
      filteredRestaurants = processedRestaurants.filter(r => {
        const restaurant = r.restaurant;
        return filters.quickFilters!.some(filter => {
          switch (filter) {
            case 'open_now':
              return r.isOpen;
            case 'top_rated':
              return restaurant.averageRating >= 4.5;
            case 'new':
              const threeMonthsAgo = new Date();
              threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
              return restaurant.createdAt > threeMonthsAgo;
            case 'trending':
              return restaurant.totalReviews > 50 && restaurant.averageRating >= 4.0;
            case 'deals':
              return restaurant.features?.includes('happy_hour') || 
                     restaurant.features?.includes('special_offers');
            default:
              return true;
          }
        });
      });
    }

    return {
      restaurants: filteredRestaurants,
      userLocation
    };
  }

  /**
   * Get mobile home feed
   */
  static async getHomeFeed(userId: string): Promise<{
    nearbyRestaurants: any[];
    upcomingReservations: any[];
    recommendedForYou: any[];
    trendingNow: any[];
    recentlyViewed: any[];
    specialOffers: any[];
  }> {
    const [
      nearbyRestaurants,
      upcomingReservations,
      recommendedForYou,
      trendingNow,
      recentlyViewed,
      specialOffers
    ] = await Promise.all([
      // Nearby restaurants
      this.getNearbyRestaurants(userId, { radius: 3, sortBy: 'nearest' })
        .then(result => result.restaurants.slice(0, 5))
        .catch(() => []),

      // Upcoming reservations
      Reservation.findAll({
        where: {
          userId,
          dateTime: { [Op.gte]: new Date() },
          status: { [Op.in]: ['confirmed', 'seated'] }
        },
        include: [{ model: Restaurant, as: 'restaurant' }],
        order: [['dateTime', 'ASC']],
        limit: 3
      }),

      // Personalized recommendations
      this.getPersonalizedRecommendations(userId, 5),

      // Trending restaurants
      this.getTrendingRestaurants(5),

      // Recently viewed
      this.getRecentlyViewedRestaurants(userId, 5),

      // Special offers
      this.getSpecialOffers(userId, 3)
    ]);

    return {
      nearbyRestaurants,
      upcomingReservations,
      recommendedForYou,
      trendingNow,
      recentlyViewed,
      specialOffers
    };
  }

  /**
   * Get personalized recommendations
   */
  private static async getPersonalizedRecommendations(
    userId: string,
    limit: number
  ): Promise<Restaurant[]> {
    // Get user's dining history
    const recentReservations = await Reservation.findAll({
      where: {
        userId,
        status: 'completed'
      },
      include: [{
        model: Restaurant,
        as: 'restaurant',
        attributes: ['cuisineType', 'priceRange']
      }],
      order: [['dateTime', 'DESC']],
      limit: 20
    });

    if (recentReservations.length === 0) {
      // Return top rated for new users
      return Restaurant.findAll({
        where: { isActive: true },
        order: [['averageRating', 'DESC']],
        limit
      });
    }

    // Analyze preferences
    const cuisineCounts: Record<string, number> = {};
    const priceCounts: Record<string, number> = {};

    recentReservations.forEach(res => {
      const { cuisineType, priceRange } = res.restaurant;
      cuisineCounts[cuisineType] = (cuisineCounts[cuisineType] || 0) + 1;
      priceCounts[priceRange] = (priceCounts[priceRange] || 0) + 1;
    });

    // Get top preferences
    const topCuisines = Object.entries(cuisineCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([cuisine]) => cuisine);

    const topPriceRanges = Object.entries(priceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([range]) => range);

    // Find similar restaurants
    return Restaurant.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { cuisineType: { [Op.in]: topCuisines } },
          { priceRange: { [Op.in]: topPriceRanges } }
        ],
        id: {
          [Op.notIn]: recentReservations.map(r => r.restaurantId)
        }
      },
      order: [['averageRating', 'DESC']],
      limit
    });
  }

  /**
   * Get trending restaurants
   */
  private static async getTrendingRestaurants(limit: number): Promise<Restaurant[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return Restaurant.findAll({
      where: {
        isActive: true,
        averageRating: { [Op.gte]: 4.0 }
      },
      include: [{
        model: Reservation,
        as: 'reservations',
        where: {
          createdAt: { [Op.gte]: oneWeekAgo },
          status: { [Op.ne]: 'cancelled' }
        },
        attributes: [],
        required: true
      }],
      attributes: {
        include: [
          [
            '(SELECT COUNT(*) FROM reservations WHERE restaurant_id = Restaurant.id AND created_at >= :oneWeekAgo)',
            'recentBookings'
          ]
        ]
      },
      replacements: { oneWeekAgo },
      order: [['recentBookings', 'DESC']],
      limit
    });
  }

  /**
   * Get recently viewed restaurants
   */
  private static async getRecentlyViewedRestaurants(
    userId: string,
    limit: number
  ): Promise<Restaurant[]> {
    const cacheKey = CACHE_KEYS.USER_RECENT_VIEWS(userId);
    const recentViews = await cache.get<string[]>(cacheKey) || [];

    if (recentViews.length === 0) {
      return [];
    }

    return Restaurant.findAll({
      where: {
        id: { [Op.in]: recentViews },
        isActive: true
      },
      limit
    });
  }

  /**
   * Get special offers
   */
  private static async getSpecialOffers(
    userId: string,
    limit: number
  ): Promise<any[]> {
    // This would integrate with a promotions system
    const restaurants = await Restaurant.findAll({
      where: {
        isActive: true,
        features: { [Op.contains]: ['special_offers'] }
      },
      order: [['averageRating', 'DESC']],
      limit
    });

    return restaurants.map(restaurant => ({
      restaurant,
      offer: {
        type: 'percentage',
        value: Math.floor(Math.random() * 30) + 10,
        title: `${Math.floor(Math.random() * 30) + 10}% off your bill`,
        description: 'Valid for lunch Monday-Friday',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    }));
  }

  /**
   * Track restaurant view
   */
  static async trackRestaurantView(userId: string, restaurantId: string): Promise<void> {
    const cacheKey = CACHE_KEYS.USER_RECENT_VIEWS(userId);
    const recentViews = await cache.get<string[]>(cacheKey) || [];

    // Add to beginning and limit to 20
    const updatedViews = [restaurantId, ...recentViews.filter(id => id !== restaurantId)].slice(0, 20);

    await cache.set(cacheKey, updatedViews, CACHE_TTL.LONG);

    logInfo('Restaurant view tracked', { userId, restaurantId });
  }

  /**
   * Get quick reservation slots
   */
  static async getQuickReservationSlots(
    restaurantId: string,
    partySize: number
  ): Promise<{
    today: string[];
    tomorrow: string[];
    thisWeek: Array<{ date: Date; slots: string[] }>;
  }> {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todaySlots, tomorrowSlots, weekSlots] = await Promise.all([
      // Today's slots
      this.getAvailableSlotsForDate(restaurantId, today, partySize),

      // Tomorrow's slots
      this.getAvailableSlotsForDate(restaurantId, tomorrow, partySize),

      // This week's slots
      this.getWeeklySlots(restaurantId, partySize)
    ]);

    return {
      today: todaySlots.slice(0, 5),
      tomorrow: tomorrowSlots.slice(0, 5),
      thisWeek: weekSlots
    };
  }

  /**
   * Get available slots for a specific date
   */
  private static async getAvailableSlotsForDate(
    restaurantId: string,
    date: Date,
    partySize: number
  ): Promise<string[]> {
    // This would check actual availability
    // For now, return mock data
    const slots = [];
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    
    const hours = await RestaurantHours.findOne({
      where: { restaurantId, dayOfWeek, isClosed: false }
    });

    if (!hours) return [];

    // Generate time slots
    const openHour = parseInt(hours.openTime.split(':')[0]);
    const closeHour = parseInt(hours.closeTime.split(':')[0]);

    for (let hour = openHour; hour < closeHour; hour++) {
      for (const minute of ['00', '30']) {
        const time = `${hour.toString().padStart(2, '0')}:${minute}`;
        if (time >= hours.openTime && time <= hours.lastReservationTime) {
          slots.push(time);
        }
      }
    }

    return slots;
  }

  /**
   * Get weekly availability
   */
  private static async getWeeklySlots(
    restaurantId: string,
    partySize: number
  ): Promise<Array<{ date: Date; slots: string[] }>> {
    const results = [];
    const today = new Date();

    for (let i = 2; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const slots = await this.getAvailableSlotsForDate(restaurantId, date, partySize);
      
      if (slots.length > 0) {
        results.push({
          date,
          slots: slots.slice(0, 3)
        });
      }
    }

    return results;
  }

  /**
   * Mobile app metrics
   */
  static async trackAppEvent(
    userId: string,
    event: string,
    properties?: Record<string, any>
  ): Promise<void> {
    const eventData = {
      userId,
      event,
      properties,
      timestamp: new Date(),
      platform: properties?.platform || 'unknown'
    };

    // Store in analytics system
    logInfo('Mobile app event', eventData);

    // Update user activity
    await User.update({
      lastActiveAt: new Date()
    }, {
      where: { id: userId }
    });
  }
}