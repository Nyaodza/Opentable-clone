import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Reservation, ReservationStatus } from '../models/Reservation';
import { Review } from '../models/Review';
import { Payment } from '../models/Payment';
import { Waitlist } from '../models/Waitlist';
import { LoyaltyTransaction } from '../models/LoyaltyProgram';
import { AppError } from '../middleware/error.middleware';
import { sequelize } from '../config/database';

// Admin dashboard statistics
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // Get basic counts
    const [
      totalUsers,
      totalRestaurants,
      totalReservations,
      totalReviews,
      activeUsers,
      activeRestaurants,
      pendingRestaurants,
      monthlyRevenue,
      weeklyReservations,
      averageRating
    ] = await Promise.all([
      User.count(),
      Restaurant.count(),
      Reservation.count(),
      Review.count(),
      User.count({ where: { lastLoginAt: { [Op.gte]: startOfWeek } } }),
      Restaurant.count({ where: { isActive: true } }),
      Restaurant.count({ where: { isActive: false } }),
      Payment.sum('amount', { 
        where: { 
          status: 'succeeded',
          createdAt: { [Op.gte]: startOfMonth }
        }
      }),
      Reservation.count({ 
        where: { 
          createdAt: { [Op.gte]: startOfWeek }
        }
      }),
      Review.findOne({
        attributes: [[sequelize.fn('AVG', sequelize.col('overallRating')), 'avgRating']],
        raw: true
      })
    ]);

    // Get growth metrics
    const lastMonth = new Date(startOfMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const [lastMonthUsers, lastMonthRestaurants, lastMonthReservations] = await Promise.all([
      User.count({ where: { createdAt: { [Op.between]: [lastMonth, startOfMonth] } } }),
      Restaurant.count({ where: { createdAt: { [Op.between]: [lastMonth, startOfMonth] } } }),
      Reservation.count({ where: { createdAt: { [Op.between]: [lastMonth, startOfMonth] } } })
    ]);

    const thisMonthUsers = await User.count({ where: { createdAt: { [Op.gte]: startOfMonth } } });
    const thisMonthRestaurants = await Restaurant.count({ where: { createdAt: { [Op.gte]: startOfMonth } } });
    const thisMonthReservations = await Reservation.count({ where: { createdAt: { [Op.gte]: startOfMonth } } });

    // Calculate growth percentages
    const userGrowth = lastMonthUsers > 0 ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0;
    const restaurantGrowth = lastMonthRestaurants > 0 ? ((thisMonthRestaurants - lastMonthRestaurants) / lastMonthRestaurants) * 100 : 0;
    const reservationGrowth = lastMonthReservations > 0 ? ((thisMonthReservations - lastMonthReservations) / lastMonthReservations) * 100 : 0;

    res.json({
      success: true,
      stats: {
        overview: {
          totalUsers,
          totalRestaurants,
          totalReservations,
          totalReviews,
          activeUsers,
          activeRestaurants,
          pendingRestaurants,
          monthlyRevenue: monthlyRevenue || 0,
          weeklyReservations,
          averageRating: parseFloat((averageRating as any)?.avgRating) || 0
        },
        growth: {
          userGrowth: Math.round(userGrowth * 100) / 100,
          restaurantGrowth: Math.round(restaurantGrowth * 100) / 100,
          reservationGrowth: Math.round(reservationGrowth * 100) / 100
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all users with pagination and filtering
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const { page = 1, limit = 20, search, role, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (role) where.role = role;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const users = await User.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      users: users.rows,
      total: users.count,
      page: Number(page),
      totalPages: Math.ceil(users.count / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

// Update user status or role
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const { id } = req.params;
    const { isActive, role } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent admin from deactivating themselves
    if (user.id === req.user!.id && isActive === false) {
      throw new AppError('Cannot deactivate your own account', 400);
    }

    await user.update({
      isActive: isActive !== undefined ? isActive : user.isActive,
      role: role || user.role
    });

    res.json({
      success: true,
      user: {
        ...user.toJSON(),
        password: undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all restaurants with pagination and filtering
export const getRestaurants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const { page = 1, limit = 20, search, status, city } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { cuisineType: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (city) where.city = { [Op.iLike]: `%${city}%` };

    const restaurants = await Restaurant.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'owner', attributes: ['firstName', 'lastName', 'email'] }
      ]
    });

    res.json({
      success: true,
      restaurants: restaurants.rows,
      total: restaurants.count,
      page: Number(page),
      totalPages: Math.ceil(restaurants.count / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

// Approve or reject restaurant
export const updateRestaurantStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const { id } = req.params;
    const { isActive, rejectionReason } = req.body;

    const restaurant = await Restaurant.findByPk(id, {
      include: [{ model: User, as: 'owner' }]
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    await restaurant.update({
      isActive,
      rejectionReason: !isActive ? rejectionReason : null
    });

    // TODO: Send email notification to restaurant owner about approval/rejection

    res.json({
      success: true,
      restaurant
    });
  } catch (error) {
    next(error);
  }
};

// Get platform analytics
export const getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Revenue analytics
    const revenueData = await Payment.findAll({
      where: {
        status: 'succeeded',
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactions']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Reservation analytics
    const reservationData = await Reservation.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'reservations'],
        'status'
      ],
      group: [
        sequelize.fn('DATE', sequelize.col('createdAt')),
        'status'
      ],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // User registration analytics
    const userRegistrationData = await User.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'registrations'],
        'role'
      ],
      group: [
        sequelize.fn('DATE', sequelize.col('createdAt')),
        'role'
      ],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Top restaurants by reservations
    const topRestaurants = await Restaurant.findAll({
      attributes: [
        'id',
        'name',
        'cuisineType',
        'city',
        'averageRating',
        [sequelize.fn('COUNT', sequelize.col('reservations.id')), 'reservationCount']
      ],
      include: [
        {
          model: Reservation,
          as: 'reservations',
          where: { createdAt: { [Op.gte]: startDate } },
          attributes: [],
          required: false
        }
      ],
      group: ['Restaurant.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('reservations.id')), 'DESC']],
      limit: 10
    });

    // Platform metrics
    const platformMetrics = await Promise.all([
      User.count({ where: { createdAt: { [Op.gte]: startDate } } }),
      Restaurant.count({ where: { createdAt: { [Op.gte]: startDate } } }),
      Reservation.count({ where: { createdAt: { [Op.gte]: startDate } } }),
      Review.count({ where: { createdAt: { [Op.gte]: startDate } } }),
      Payment.sum('amount', { 
        where: { 
          status: 'succeeded',
          createdAt: { [Op.gte]: startDate }
        }
      })
    ]);

    res.json({
      success: true,
      analytics: {
        revenue: revenueData,
        reservations: reservationData,
        userRegistrations: userRegistrationData,
        topRestaurants,
        platformMetrics: {
          newUsers: platformMetrics[0],
          newRestaurants: platformMetrics[1],
          totalReservations: platformMetrics[2],
          totalReviews: platformMetrics[3],
          totalRevenue: platformMetrics[4] || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get system reports
export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const { type, startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    let report: any = {};

    switch (type) {
      case 'financial':
        const financialData = await Payment.findAll({
          where: {
            status: 'succeeded',
            createdAt: { [Op.between]: [start, end] }
          },
          include: [
            { model: Reservation, as: 'reservation', include: [{ model: Restaurant, as: 'restaurant' }] }
          ],
          order: [['createdAt', 'DESC']]
        });

        const totalRevenue = financialData.reduce((sum, payment) => sum + payment.amount, 0);
        const platformFee = totalRevenue * 0.05; // 5% platform fee
        const restaurantRevenue = totalRevenue - platformFee;

        report = {
          type: 'financial',
          period: { start, end },
          summary: {
            totalRevenue,
            platformFee,
            restaurantRevenue,
            transactionCount: financialData.length
          },
          transactions: financialData
        };
        break;

      case 'reservations':
        const reservationStats = await Reservation.findAll({
          where: { createdAt: { [Op.between]: [start, end] } },
          attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('AVG', sequelize.col('partySize')), 'avgPartySize']
          ],
          group: ['status'],
          raw: true
        });

        const totalReservations = await Reservation.count({
          where: { createdAt: { [Op.between]: [start, end] } }
        });

        report = {
          type: 'reservations',
          period: { start, end },
          summary: {
            totalReservations,
            statusBreakdown: reservationStats
          }
        };
        break;

      case 'restaurants':
        const restaurantStats = await Restaurant.findAll({
          attributes: [
            'id',
            'name',
            'city',
            'cuisineType',
            'averageRating',
            'totalReviews',
            [sequelize.fn('COUNT', sequelize.col('reservations.id')), 'reservationCount']
          ],
          include: [
            {
              model: Reservation,
              as: 'reservations',
              where: { createdAt: { [Op.between]: [start, end] } },
              attributes: [],
              required: false
            }
          ],
          group: ['Restaurant.id'],
          order: [['averageRating', 'DESC']]
        });

        report = {
          type: 'restaurants',
          period: { start, end },
          restaurants: restaurantStats
        };
        break;

      default:
        throw new AppError('Invalid report type', 400);
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    next(error);
  }
};

// Manage platform settings
export const updatePlatformSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const {
      platformFeePercentage,
      maxReservationDays,
      cancellationPolicy,
      supportEmail,
      maintenanceMode
    } = req.body;

    // In a real application, these would be stored in a settings table
    // For now, we'll return a success response
    const settings = {
      platformFeePercentage: platformFeePercentage || 5,
      maxReservationDays: maxReservationDays || 60,
      cancellationPolicy: cancellationPolicy || '24 hours before reservation',
      supportEmail: supportEmail || 'support@opentable-clone.com',
      maintenanceMode: maintenanceMode || false
    };

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    next(error);
  }
};

// Get platform notifications/alerts
export const getAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const alerts = [];
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Check for restaurants pending approval
    const pendingRestaurants = await Restaurant.count({ where: { isActive: false } });
    if (pendingRestaurants > 0) {
      alerts.push({
        type: 'warning',
        message: `${pendingRestaurants} restaurants pending approval`,
        action: 'review_restaurants'
      });
    }

    // Check for high cancellation rate
    const recentReservations = await Reservation.count({
      where: { createdAt: { [Op.gte]: lastWeek } }
    });
    const cancelledReservations = await Reservation.count({
      where: {
        createdAt: { [Op.gte]: lastWeek },
        status: ReservationStatus.CANCELLED
      }
    });

    const cancellationRate = recentReservations > 0 ? (cancelledReservations / recentReservations) * 100 : 0;
    if (cancellationRate > 20) {
      alerts.push({
        type: 'error',
        message: `High cancellation rate: ${cancellationRate.toFixed(1)}%`,
        action: 'investigate_cancellations'
      });
    }

    // Check for low-rated restaurants
    const lowRatedRestaurants = await Restaurant.count({
      where: { averageRating: { [Op.lt]: 3.0, [Op.gt]: 0 } }
    });
    if (lowRatedRestaurants > 0) {
      alerts.push({
        type: 'info',
        message: `${lowRatedRestaurants} restaurants with ratings below 3.0`,
        action: 'review_ratings'
      });
    }

    res.json({
      success: true,
      alerts
    });
  } catch (error) {
    next(error);
  }
};