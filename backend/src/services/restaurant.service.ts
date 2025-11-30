import { Restaurant, RestaurantStatus, CuisineType, PriceRange } from '../models/Restaurant';
import { Menu, MenuType, MenuItem, MenuItemCategory } from '../models/Menu';
import { Table, TableStatus } from '../models/Table';
import { User } from '../models/User';
import { Op, WhereOptions, Order } from 'sequelize';
import { RedisService } from './redis.service';
import { EmailService } from './email.service';

interface CreateRestaurantDTO {
  ownerId: string;
  name: string;
  description?: string;
  cuisineType: CuisineType;
  cuisineTags?: string[];
  priceRange: PriceRange;
  phoneNumber: string;
  email?: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  openingHours?: any;
  features?: any;
  paymentMethods?: any;
  totalTables?: number;
  totalSeats?: number;
}

interface UpdateRestaurantDTO extends Partial<CreateRestaurantDTO> {
  logo?: string;
  coverImage?: string;
  images?: string[];
  acceptsReservations?: boolean;
  reservationDaysInAdvance?: number;
  reservationSlotDuration?: number;
  minPartySize?: number;
  maxPartySize?: number;
  cancellationFee?: number;
  cancellationHours?: number;
  dressCode?: string;
  specialInstructions?: string;
  parkingInstructions?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
}

interface SearchParams {
  query?: string;
  cuisineType?: CuisineType;
  priceRange?: PriceRange;
  city?: string;
  state?: string;
  features?: string[];
  minRating?: number;
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
  date?: Date;
  time?: string;
  partySize?: number;
  sortBy?: 'rating' | 'distance' | 'price' | 'popularity';
  page?: number;
  limit?: number;
}

export class RestaurantService {
  private static redisService = RedisService.getInstance();
  private static emailService = new EmailService();
  private static readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Create new restaurant
   */
  static async createRestaurant(data: CreateRestaurantDTO): Promise<Restaurant> {
    // Create restaurant
    const restaurant = await Restaurant.create({
      ...data,
      status: RestaurantStatus.PENDING
    });

    // Create default menus
    await this.createDefaultMenus(restaurant.id);

    // Create default tables
    if (data.totalTables) {
      await this.createDefaultTables(restaurant.id, data.totalTables);
    }

    // Notify admin for approval
    await this.notifyAdminForApproval(restaurant);

    // Clear cache
    await this.clearCache();

    return restaurant;
  }

  /**
   * Update restaurant
   */
  static async updateRestaurant(
    restaurantId: string,
    ownerId: string,
    data: UpdateRestaurantDTO
  ): Promise<Restaurant> {
    const restaurant = await Restaurant.findOne({
      where: { id: restaurantId, ownerId }
    });

    if (!restaurant) {
      throw new Error('Restaurant not found or unauthorized');
    }

    await restaurant.update(data);

    // Clear cache
    await this.clearCache();
    await this.clearRestaurantCache(restaurantId);

    return restaurant;
  }

  /**
   * Get restaurant by ID
   */
  static async getRestaurantById(
    restaurantId: string,
    includeMenus = false,
    includeTables = false
  ): Promise<Restaurant | null> {
    // Try cache first
    const cacheKey = `restaurant:${restaurantId}:${includeMenus}:${includeTables}`;
    const cached = await this.redisService.getJSON<Restaurant>(cacheKey);
    if (cached) {
      return cached;
    }

    const include: any[] = [];
    if (includeMenus) {
      include.push({
        model: Menu,
        include: [MenuItem]
      });
    }
    if (includeTables) {
      include.push({
        model: Table,
        where: { isActive: true },
        required: false
      });
    }

    const restaurant = await Restaurant.findByPk(restaurantId, { include });

    if (restaurant) {
      // Cache the result
      await this.redisService.setJSON(cacheKey, restaurant, this.CACHE_TTL);
      
      // Increment view count
      await restaurant.incrementViewCount();
    }

    return restaurant;
  }

  /**
   * Search restaurants
   */
  static async searchRestaurants(params: SearchParams): Promise<{
    restaurants: Restaurant[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      query,
      cuisineType,
      priceRange,
      city,
      state,
      features,
      minRating,
      latitude,
      longitude,
      radius = 10,
      date,
      time,
      partySize,
      sortBy = 'popularity',
      page = 1,
      limit = 20
    } = params;

    // Build where clause
    const where: WhereOptions<Restaurant> = {
      status: RestaurantStatus.ACTIVE
    };

    if (query) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
        { cuisineTags: { [Op.contains]: [query.toLowerCase()] } }
      ];
    }

    if (cuisineType) {
      where.cuisineType = cuisineType;
    }

    if (priceRange) {
      where.priceRange = priceRange;
    }

    if (city) {
      where.city = { [Op.iLike]: city };
    }

    if (state) {
      where.state = { [Op.iLike]: state };
    }

    if (minRating) {
      where.averageRating = { [Op.gte]: minRating };
    }

    // Features filter (using JSON query)
    if (features && features.length > 0) {
      const featureConditions = features.map(feature => ({
        [`features.${feature}`]: true
      }));
      where[Op.and] = featureConditions;
    }

    // Location-based search
    if (latitude && longitude) {
      // Calculate bounding box for radius search
      const latDelta = radius / 111; // 1 degree latitude = ~111km
      const lonDelta = radius / (111 * Math.cos(latitude * Math.PI / 180));

      where.latitude = {
        [Op.between]: [latitude - latDelta, latitude + latDelta]
      };
      where.longitude = {
        [Op.between]: [longitude - lonDelta, longitude + lonDelta]
      };
    }

    // Build order clause
    let order: Order = [];
    switch (sortBy) {
      case 'rating':
        order = [['averageRating', 'DESC']];
        break;
      case 'price':
        order = [['priceRange', 'ASC']];
        break;
      case 'popularity':
        order = [['totalBookings', 'DESC']];
        break;
      case 'distance':
        if (latitude && longitude) {
          // This would require a raw query for distance calculation
          // For now, we'll use a simple approximation
          order = [['createdAt', 'DESC']];
        }
        break;
      default:
        order = [['totalBookings', 'DESC']];
    }

    // Execute query
    const offset = (page - 1) * limit;
    const { rows: restaurants, count: total } = await Restaurant.findAndCountAll({
      where,
      order,
      limit,
      offset,
      distinct: true
    });

    // If searching for availability, filter by available tables
    if (date && time && partySize) {
      // This would require checking table availability
      // Implementation would involve checking reservations
    }

    return {
      restaurants,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get restaurant statistics
   */
  static async getRestaurantStats(restaurantId: string, ownerId: string): Promise<any> {
    const restaurant = await Restaurant.findOne({
      where: { id: restaurantId, ownerId }
    });

    if (!restaurant) {
      throw new Error('Restaurant not found or unauthorized');
    }

    // Get various statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // This would involve complex queries to get:
    // - Today's reservations
    // - Weekly/monthly revenue
    // - Popular dishes
    // - Peak hours
    // - Customer demographics
    // etc.

    return {
      overview: {
        totalBookings: restaurant.totalBookings,
        averageRating: restaurant.averageRating,
        totalReviews: restaurant.totalReviews,
        viewCount: restaurant.viewCount,
        favoriteCount: restaurant.favoriteCount
      },
      // Add more stats as needed
    };
  }

  /**
   * Approve restaurant
   */
  static async approveRestaurant(restaurantId: string, approvedBy: string): Promise<Restaurant> {
    const restaurant = await Restaurant.findByPk(restaurantId);
    
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    await restaurant.update({
      status: RestaurantStatus.ACTIVE,
      verifiedAt: new Date(),
      verifiedBy: approvedBy
    });

    // Notify owner
    const owner = await User.findByPk(restaurant.ownerId);
    if (owner) {
      // Send approval email
      // await this.emailService.sendRestaurantApprovedEmail(owner, restaurant);
    }

    // Clear cache
    await this.clearCache();

    return restaurant;
  }

  /**
   * Suspend restaurant
   */
  static async suspendRestaurant(
    restaurantId: string,
    reason: string,
    suspendedBy: string
  ): Promise<Restaurant> {
    const restaurant = await Restaurant.findByPk(restaurantId);
    
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    await restaurant.update({
      status: RestaurantStatus.SUSPENDED
    });

    // Notify owner
    const owner = await User.findByPk(restaurant.ownerId);
    if (owner) {
      // Send suspension email with reason
      // await this.emailService.sendRestaurantSuspendedEmail(owner, restaurant, reason);
    }

    // Clear cache
    await this.clearCache();
    await this.clearRestaurantCache(restaurantId);

    return restaurant;
  }

  /**
   * Create default menus for new restaurant
   */
  private static async createDefaultMenus(restaurantId: string): Promise<void> {
    const defaultMenus = [
      { name: 'Lunch', type: MenuType.LUNCH },
      { name: 'Dinner', type: MenuType.DINNER },
      { name: 'Drinks', type: MenuType.DRINKS },
      { name: 'Desserts', type: MenuType.DESSERT }
    ];

    for (const menuData of defaultMenus) {
      await Menu.create({
        restaurantId,
        ...menuData,
        isActive: true
      });
    }
  }

  /**
   * Create default tables for new restaurant
   */
  private static async createDefaultTables(
    restaurantId: string,
    totalTables: number
  ): Promise<void> {
    const tables = [];
    
    for (let i = 1; i <= totalTables; i++) {
      tables.push({
        restaurantId,
        tableNumber: i.toString(),
        minCapacity: 2,
        maxCapacity: 4,
        status: TableStatus.AVAILABLE
      });
    }

    await Table.bulkCreate(tables);
  }

  /**
   * Notify admin for restaurant approval
   */
  private static async notifyAdminForApproval(restaurant: Restaurant): Promise<void> {
    // Implementation would send email/notification to admin
    console.log(`New restaurant pending approval: ${restaurant.name}`);
  }

  /**
   * Clear all restaurant-related cache
   */
  private static async clearCache(): Promise<void> {
    await this.redisService.invalidatePattern('restaurant:*');
    await this.redisService.invalidatePattern('restaurants:*');
  }

  /**
   * Clear specific restaurant cache
   */
  private static async clearRestaurantCache(restaurantId: string): Promise<void> {
    await this.redisService.invalidatePattern(`restaurant:${restaurantId}:*`);
  }
}