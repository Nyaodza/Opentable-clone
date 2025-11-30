import { Controller, Get, Query, UseGuards, Req, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {

  @Get('overview/:restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'restaurant_staff', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get restaurant dashboard overview' })
  @ApiResponse({ status: 200 })
  async getRestaurantOverview(
    @Param('restaurantId') restaurantId: string,
    @Query('period') period: '24h' | '7d' | '30d' | '90d' = '7d',
    @Req() req: any,
  ) {
    const baseMetrics = {
      reservations: Math.floor(Math.random() * 200) + 50,
      revenue: Math.floor(Math.random() * 50000) + 10000,
      avgRating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
      newReviews: Math.floor(Math.random() * 20) + 5,
    };

    const trends = {
      reservations: Math.round((Math.random() - 0.5) * 30),
      revenue: Math.round((Math.random() - 0.5) * 25),
      avgRating: Math.round((Math.random() - 0.5) * 10) / 10,
      newReviews: Math.round((Math.random() - 0.5) * 15),
    };

    return {
      success: true,
      data: {
        period,
        metrics: {
          totalReservations: {
            value: baseMetrics.reservations,
            trend: trends.reservations,
            previousPeriod: baseMetrics.reservations - trends.reservations,
          },
          totalRevenue: {
            value: baseMetrics.revenue,
            trend: trends.revenue,
            previousPeriod: baseMetrics.revenue - trends.revenue * 100,
            formatted: `$${baseMetrics.revenue.toLocaleString()}`,
          },
          averageRating: {
            value: baseMetrics.avgRating,
            trend: trends.avgRating,
            previousPeriod: baseMetrics.avgRating - trends.avgRating,
            outOf: 5,
          },
          newReviews: {
            value: baseMetrics.newReviews,
            trend: trends.newReviews,
            previousPeriod: baseMetrics.newReviews - trends.newReviews,
          },
          occupancyRate: {
            value: Math.round(Math.random() * 30 + 60), // 60-90%
            trend: Math.round((Math.random() - 0.5) * 20),
            formatted: `${Math.round(Math.random() * 30 + 60)}%`,
          },
          avgPartySize: {
            value: Math.round((Math.random() * 2 + 2.5) * 10) / 10, // 2.5-4.5
            trend: Math.round((Math.random() - 0.5) * 2 * 10) / 10,
          },
        },
        charts: {
          reservationsByDay: this.generateDailyData(period, 'reservations'),
          revenueByDay: this.generateDailyData(period, 'revenue'),
          reservationsByHour: this.generateHourlyReservations(),
          topDishes: this.generateTopDishes(),
        },
        alerts: this.generateAlerts(),
        upcomingReservations: this.generateUpcomingReservations(),
      },
    };
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user dashboard' })
  @ApiResponse({ status: 200 })
  async getUserDashboard(@Param('userId') userId: string, @Req() req: any) {
    return {
      success: true,
      data: {
        profile: {
          name: 'John Doe',
          email: 'john@example.com',
          loyaltyTier: 'gold',
          loyaltyPoints: 2450,
          memberSince: new Date('2022-03-15'),
        },
        stats: {
          totalReservations: 34,
          favoriteRestaurants: 12,
          reviewsWritten: 18,
          pointsEarned: 5670,
        },
        upcomingReservations: this.generateUserReservations(),
        recentActivity: this.generateRecentActivity(),
        recommendations: this.generateRestaurantRecommendations(),
        specialOffers: this.generateSpecialOffers(),
        loyaltySummary: {
          currentPoints: 2450,
          pointsToNextTier: 1050,
          currentTier: 'gold',
          nextTier: 'platinum',
          recentEarnings: [
            { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), points: 150, restaurant: 'Italian Bistro' },
            { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), points: 200, restaurant: 'Sushi Palace' },
            { date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), points: 100, restaurant: 'French Quarter' },
          ],
        },
      },
    };
  }

  @Get('analytics/:restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'restaurant_staff', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed restaurant analytics' })
  @ApiResponse({ status: 200 })
  async getRestaurantAnalytics(
    @Param('restaurantId') restaurantId: string,
    @Query('period') period: '7d' | '30d' | '90d' | '1y' = '30d',
    @Query('metric') metric?: string,
  ) {
    return {
      success: true,
      data: {
        summary: {
          totalReservations: 1247,
          totalRevenue: 156780,
          avgReservationValue: 125.50,
          occupancyRate: 78.5,
          repeatCustomerRate: 42.3,
          noShowRate: 8.2,
          cancellationRate: 12.5,
        },
        trends: {
          reservations: this.generateTrendData(period),
          revenue: this.generateTrendData(period, 1000),
          ratings: this.generateRatingTrend(),
        },
        demographics: {
          ageGroups: [
            { range: '18-24', percentage: 15, count: 187 },
            { range: '25-34', percentage: 32, count: 399 },
            { range: '35-44', percentage: 28, count: 349 },
            { range: '45-54', percentage: 18, count: 224 },
            { range: '55+', percentage: 7, count: 87 },
          ],
          partySize: [
            { size: 1, percentage: 8, count: 100 },
            { size: 2, percentage: 45, count: 561 },
            { size: 3, percentage: 20, count: 249 },
            { size: 4, percentage: 18, count: 224 },
            { size: '5+', percentage: 9, count: 112 },
          ],
          repeatCustomers: {
            newCustomers: 58.7,
            returningCustomers: 41.3,
          },
        },
        peakTimes: {
          byHour: this.generateHourlyData(),
          byDay: this.generateDayOfWeekData(),
          byMonth: this.generateMonthlyData(),
        },
        tableManagement: {
          utilizationRate: 82.4,
          averageTurnTime: 95, // minutes
          tablesBySize: [
            { seats: 2, count: 12, utilization: 89 },
            { seats: 4, count: 8, utilization: 85 },
            { seats: 6, count: 4, utilization: 72 },
            { seats: 8, count: 2, utilization: 65 },
          ],
        },
        reviews: {
          totalReviews: 345,
          averageRating: 4.3,
          ratingDistribution: {
            5: 45,
            4: 35,
            3: 15,
            2: 3,
            1: 2,
          },
          recentTrend: 'positive',
          responseRate: 78.5,
        },
      },
    };
  }

  @Get('staff/:restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get staff performance analytics' })
  @ApiResponse({ status: 200 })
  async getStaffAnalytics(@Param('restaurantId') restaurantId: string) {
    return {
      success: true,
      data: {
        staffMembers: [
          {
            id: 'staff-1',
            name: 'Sarah Johnson',
            role: 'Server',
            shift: 'dinner',
            performance: {
              tablesServed: 45,
              averageRating: 4.6,
              tips: 450.75,
              customerComplaints: 0,
              efficiency: 92,
            },
          },
          {
            id: 'staff-2',
            name: 'Mike Chen',
            role: 'Host',
            shift: 'lunch',
            performance: {
              guestsSeated: 120,
              waitTime: 8.5,
              customerSatisfaction: 4.4,
              efficiency: 88,
            },
          },
          {
            id: 'staff-3',
            name: 'Emily Rodriguez',
            role: 'Manager',
            shift: 'all_day',
            performance: {
              customerIssuesResolved: 15,
              staffSupervised: 8,
              overallRating: 4.7,
              efficiency: 95,
            },
          },
        ],
        shifts: {
          lunch: {
            staff: 4,
            reservations: 45,
            revenue: 3450.50,
            efficiency: 89,
          },
          dinner: {
            staff: 8,
            reservations: 78,
            revenue: 8920.75,
            efficiency: 91,
          },
        },
        performance: {
          averageEfficiency: 90.3,
          customerSatisfaction: 4.5,
          staffRetention: 85.2,
          trainingCompliance: 92.1,
        },
      },
    };
  }

  @Get('notifications/:restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'restaurant_staff', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard notifications and alerts' })
  @ApiResponse({ status: 200 })
  async getDashboardNotifications(@Param('restaurantId') restaurantId: string) {
    return {
      success: true,
      data: {
        alerts: [
          {
            id: 'alert-1',
            type: 'booking_surge',
            severity: 'high',
            title: 'High Booking Volume',
            message: 'You have 15 reservations in the next 2 hours',
            actionRequired: true,
            createdAt: new Date(Date.now() - 30 * 60 * 1000),
          },
          {
            id: 'alert-2',
            type: 'low_rating',
            severity: 'medium',
            title: 'Rating Drop',
            message: 'Your average rating dropped to 4.1 this week',
            actionRequired: true,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
          {
            id: 'alert-3',
            type: 'staff_shortage',
            severity: 'medium',
            title: 'Staff Alert',
            message: '2 servers called in sick for tonight',
            actionRequired: true,
            createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          },
        ],
        notifications: [
          {
            id: 'notif-1',
            type: 'new_review',
            title: 'New 5-star review',
            message: 'John D. left a great review about the service',
            read: false,
            createdAt: new Date(Date.now() - 45 * 60 * 1000),
          },
          {
            id: 'notif-2',
            type: 'reservation_cancelled',
            title: 'Reservation cancelled',
            message: 'Party of 4 cancelled their 7:30 PM reservation',
            read: false,
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          },
          {
            id: 'notif-3',
            type: 'loyalty_milestone',
            title: 'Loyalty milestone reached',
            message: 'Sarah M. reached Gold tier status',
            read: true,
            createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          },
        ],
        tasks: [
          {
            id: 'task-1',
            title: 'Respond to recent reviews',
            description: '3 reviews are awaiting your response',
            priority: 'medium',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            completed: false,
          },
          {
            id: 'task-2',
            title: 'Update menu for spring season',
            description: 'Add seasonal items to the menu',
            priority: 'low',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            completed: false,
          },
        ],
      },
    };
  }

  private generateDailyData(period: string, type: string) {
    const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const multiplier = type === 'revenue' ? 1000 : 1;

    return Array.from({ length: days }, (_, idx) => ({
      date: new Date(Date.now() - (days - idx - 1) * 24 * 60 * 60 * 1000),
      value: Math.floor(Math.random() * 50 + 20) * multiplier,
    }));
  }

  private generateHourlyReservations() {
    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      reservations: hour >= 11 && hour <= 22 ? Math.floor(Math.random() * 15 + 5) : Math.floor(Math.random() * 3),
    }));
  }

  private generateTopDishes() {
    const dishes = ['Margherita Pizza', 'Caesar Salad', 'Grilled Salmon', 'Beef Tenderloin', 'Pasta Carbonara'];
    return dishes.map((dish, idx) => ({
      name: dish,
      orders: Math.floor(Math.random() * 50 + 20),
      revenue: Math.floor(Math.random() * 2000 + 500),
      rating: Math.round((Math.random() * 1 + 4) * 10) / 10,
    }));
  }

  private generateAlerts() {
    return [
      {
        type: 'high_demand',
        message: 'Tonight is 90% booked - consider adding wait list',
        severity: 'medium',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        type: 'review_response',
        message: '3 reviews need responses',
        severity: 'low',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ];
  }

  private generateUpcomingReservations() {
    return Array.from({ length: 8 }, (_, idx) => ({
      id: `upcoming-${idx}`,
      guestName: `Guest ${idx + 1}`,
      partySize: Math.floor(Math.random() * 6) + 2,
      time: new Date(Date.now() + (idx + 1) * 60 * 60 * 1000),
      table: `Table ${Math.floor(Math.random() * 20) + 1}`,
      status: ['confirmed', 'pending', 'seated'][Math.floor(Math.random() * 3)],
      specialRequests: idx % 3 === 0 ? 'Birthday celebration' : null,
    }));
  }

  private generateUserReservations() {
    return Array.from({ length: 3 }, (_, idx) => ({
      id: `user-reservation-${idx}`,
      restaurantName: `Restaurant ${idx + 1}`,
      restaurantImage: `https://picsum.photos/150/100?random=${idx + 50}`,
      date: new Date(Date.now() + (idx + 1) * 24 * 60 * 60 * 1000),
      time: '7:00 PM',
      partySize: Math.floor(Math.random() * 4) + 2,
      status: 'confirmed',
    }));
  }

  private generateRecentActivity() {
    return Array.from({ length: 5 }, (_, idx) => ({
      id: `activity-${idx}`,
      type: ['reservation', 'review', 'loyalty'][idx % 3],
      description: `Recent activity ${idx + 1}`,
      timestamp: new Date(Date.now() - idx * 24 * 60 * 60 * 1000),
    }));
  }

  private generateRestaurantRecommendations() {
    return Array.from({ length: 4 }, (_, idx) => ({
      id: `rec-${idx}`,
      name: `Recommended Restaurant ${idx + 1}`,
      cuisine: ['Italian', 'Japanese', 'Mexican', 'French'][idx],
      rating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
      image: `https://picsum.photos/200/150?random=${idx + 200}`,
      distance: Math.round(Math.random() * 50 * 10) / 10,
      reason: 'Based on your dining history',
    }));
  }

  private generateSpecialOffers() {
    return Array.from({ length: 3 }, (_, idx) => ({
      id: `offer-${idx}`,
      title: `Special Offer ${idx + 1}`,
      description: `Get ${20 + idx * 10}% off your next meal`,
      restaurantName: `Restaurant ${idx + 1}`,
      validUntil: new Date(Date.now() + (7 + idx) * 24 * 60 * 60 * 1000),
      promoCode: `SAVE${20 + idx * 10}`,
    }));
  }

  private generateTrendData(period: string, multiplier: number = 1) {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    return Array.from({ length: Math.min(days, 30) }, (_, idx) => ({
      date: new Date(Date.now() - (days - idx - 1) * 24 * 60 * 60 * 1000),
      value: Math.floor(Math.random() * 50 + 20) * multiplier,
    }));
  }

  private generateRatingTrend() {
    return Array.from({ length: 30 }, (_, idx) => ({
      date: new Date(Date.now() - (30 - idx - 1) * 24 * 60 * 60 * 1000),
      rating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
    }));
  }

  private generateHourlyData() {
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      value: hour >= 11 && hour <= 22 ? Math.floor(Math.random() * 80 + 20) : Math.floor(Math.random() * 20),
    }));
  }

  private generateDayOfWeekData() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map(day => ({
      day,
      value: Math.floor(Math.random() * 100 + 50),
    }));
  }

  private generateMonthlyData() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(month => ({
      month,
      value: Math.floor(Math.random() * 200 + 100),
    }));
  }
}