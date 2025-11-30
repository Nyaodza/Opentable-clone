import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('mobile')
@Controller('mobile')
export class MobileController {

  @Get('config')
  @ApiOperation({ summary: 'Get mobile app configuration' })
  @ApiResponse({ status: 200 })
  async getMobileConfig(@Query('platform') platform?: 'ios' | 'android') {
    return {
      success: true,
      data: {
        appVersion: '2.1.0',
        minSupportedVersion: '2.0.0',
        forceUpdate: false,
        apiVersion: 'v1',
        features: {
          socialLogin: true,
          biometricAuth: true,
          pushNotifications: true,
          locationServices: true,
          camera: true,
          offlineMode: false,
          darkMode: true,
          accessibility: true,
        },
        endpoints: {
          api: 'https://api.opentable.com/v1',
          websocket: 'wss://ws.opentable.com',
          cdn: 'https://cdn.opentable.com',
        },
        limits: {
          maxImageUploadSize: 10485760, // 10MB
          maxImagesPerReview: 5,
          searchResultsPerPage: 20,
          maxPartySize: 20,
        },
        themes: {
          default: 'light',
          available: ['light', 'dark', 'auto'],
        },
        analytics: {
          enabled: true,
          providers: ['firebase', 'mixpanel'],
        },
        payments: {
          providers: ['stripe', 'paypal', 'apple_pay', 'google_pay'],
          currency: 'USD',
          testMode: false,
        },
      },
    };
  }

  @Get('onboarding')
  @ApiOperation({ summary: 'Get mobile onboarding content' })
  @ApiResponse({ status: 200 })
  async getOnboardingContent() {
    return {
      success: true,
      data: {
        screens: [
          {
            id: 'welcome',
            title: 'Welcome to OpenTable',
            subtitle: 'Discover and book amazing restaurants',
            image: 'https://picsum.photos/400/600?random=1',
            animation: 'fade_in',
          },
          {
            id: 'search',
            title: 'Find Perfect Restaurants',
            subtitle: 'Search by cuisine, location, or special features',
            image: 'https://picsum.photos/400/600?random=2',
            animation: 'slide_left',
          },
          {
            id: 'book',
            title: 'Book Instantly',
            subtitle: 'Reserve your table in just a few taps',
            image: 'https://picsum.photos/400/600?random=3',
            animation: 'slide_left',
          },
          {
            id: 'loyalty',
            title: 'Earn Rewards',
            subtitle: 'Get points and perks with every meal',
            image: 'https://picsum.photos/400/600?random=4',
            animation: 'slide_left',
          },
        ],
        skipEnabled: true,
        autoAdvance: false,
        showIndicators: true,
      },
    };
  }

  @Post('device')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register mobile device' })
  @ApiResponse({ status: 201 })
  async registerDevice(
    @Body() body: {
      deviceId: string;
      platform: 'ios' | 'android';
      pushToken?: string;
      appVersion: string;
      osVersion: string;
      deviceModel: string;
      timezone: string;
      language: string;
    },
    @Req() req: any,
  ) {
    const device = {
      id: 'device-' + Date.now(),
      userId: req.user.sub,
      deviceId: body.deviceId,
      platform: body.platform,
      pushToken: body.pushToken,
      appVersion: body.appVersion,
      osVersion: body.osVersion,
      deviceModel: body.deviceModel,
      timezone: body.timezone,
      language: body.language,
      isActive: true,
      lastSeen: new Date(),
      registeredAt: new Date(),
    };

    return {
      success: true,
      data: device,
      message: 'Device registered successfully',
    };
  }

  @Put('device/:deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update mobile device' })
  @ApiResponse({ status: 200 })
  async updateDevice(
    @Param('deviceId') deviceId: string,
    @Body() body: {
      pushToken?: string;
      appVersion?: string;
      osVersion?: string;
      timezone?: string;
      language?: string;
      isActive?: boolean;
    },
    @Req() req: any,
  ) {
    return {
      success: true,
      data: {
        deviceId,
        ...body,
        updatedAt: new Date(),
      },
      message: 'Device updated successfully',
    };
  }

  @Get('quick-actions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user quick actions for mobile' })
  @ApiResponse({ status: 200 })
  async getQuickActions(@Req() req: any) {
    return {
      success: true,
      data: {
        actions: [
          {
            id: 'book_now',
            title: 'Book Now',
            subtitle: 'Find and book a table',
            icon: 'calendar',
            color: '#007AFF',
            deepLink: 'opentable://search',
            enabled: true,
          },
          {
            id: 'my_reservations',
            title: 'My Reservations',
            subtitle: 'View upcoming bookings',
            icon: 'list',
            color: '#34C759',
            deepLink: 'opentable://reservations',
            enabled: true,
            badge: 2, // Number of upcoming reservations
          },
          {
            id: 'favorites',
            title: 'Favorites',
            subtitle: 'Your saved restaurants',
            icon: 'heart',
            color: '#FF3B30',
            deepLink: 'opentable://favorites',
            enabled: true,
          },
          {
            id: 'loyalty',
            title: 'Loyalty Points',
            subtitle: '2,450 points available',
            icon: 'star',
            color: '#FF9500',
            deepLink: 'opentable://loyalty',
            enabled: true,
          },
        ],
        contextualActions: [
          {
            id: 'check_in',
            title: 'Check In',
            subtitle: 'Restaurant nearby',
            icon: 'location',
            color: '#007AFF',
            condition: 'near_reservation',
            enabled: false, // Will be enabled when near restaurant
          },
          {
            id: 'review',
            title: 'Write Review',
            subtitle: 'Share your experience',
            icon: 'edit',
            color: '#5856D6',
            condition: 'post_dining',
            enabled: false,
          },
        ],
      },
    };
  }

  @Get('widgets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get mobile widget data' })
  @ApiResponse({ status: 200 })
  async getWidgetData(@Req() req: any) {
    return {
      success: true,
      data: {
        smallWidget: {
          type: 'upcoming_reservation',
          title: 'Next Reservation',
          data: {
            restaurantName: 'Italian Bistro',
            date: new Date(Date.now() + 24 * 60 * 60 * 1000),
            time: '7:00 PM',
            partySize: 4,
          },
        },
        mediumWidget: {
          type: 'loyalty_status',
          title: 'Loyalty Status',
          data: {
            currentTier: 'Gold',
            points: 2450,
            pointsToNext: 1050,
            nextTier: 'Platinum',
            progressPercentage: 70,
          },
        },
        largeWidget: {
          type: 'recommendations',
          title: 'Recommended for You',
          data: {
            restaurants: [
              {
                name: 'Sushi Palace',
                cuisine: 'Japanese',
                rating: 4.5,
                image: 'https://picsum.photos/150/100?random=10',
                distance: '0.8 mi',
              },
              {
                name: 'French Quarter',
                cuisine: 'French',
                rating: 4.7,
                image: 'https://picsum.photos/150/100?random=11',
                distance: '1.2 mi',
              },
            ],
          },
        },
      },
    };
  }

  @Post('shortcuts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create app shortcut' })
  @ApiResponse({ status: 201 })
  async createShortcut(
    @Body() body: {
      type: 'restaurant' | 'search' | 'location';
      title: string;
      subtitle?: string;
      deepLink: string;
      icon?: string;
      metadata?: any;
    },
    @Req() req: any,
  ) {
    const shortcut = {
      id: 'shortcut-' + Date.now(),
      userId: req.user.sub,
      type: body.type,
      title: body.title,
      subtitle: body.subtitle,
      deepLink: body.deepLink,
      icon: body.icon || 'star',
      metadata: body.metadata || {},
      usageCount: 0,
      createdAt: new Date(),
    };

    return {
      success: true,
      data: shortcut,
      message: 'Shortcut created successfully',
    };
  }

  @Get('shortcuts/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user shortcuts' })
  @ApiResponse({ status: 200 })
  async getUserShortcuts(@Param('userId') userId: string, @Req() req: any) {
    const mockShortcuts = [
      {
        id: 'shortcut-1',
        type: 'restaurant',
        title: 'Italian Bistro',
        subtitle: 'Your favorite spot',
        deepLink: 'opentable://restaurant/123',
        icon: 'utensils',
        usageCount: 15,
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'shortcut-2',
        type: 'search',
        title: 'Sushi Near Me',
        subtitle: 'Quick search',
        deepLink: 'opentable://search?cuisine=japanese',
        icon: 'search',
        usageCount: 8,
        lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ];

    return {
      success: true,
      data: mockShortcuts,
    };
  }

  @Get('deep-link/resolve')
  @ApiOperation({ summary: 'Resolve deep link' })
  @ApiResponse({ status: 200 })
  async resolveDeepLink(@Query('url') url: string) {
    // Parse the deep link URL and return appropriate data
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const params = Object.fromEntries(urlObj.searchParams);

    let resolvedData = {};

    if (path.includes('/restaurant/')) {
      const restaurantId = path.split('/restaurant/')[1];
      resolvedData = {
        type: 'restaurant',
        restaurantId,
        action: 'view',
        data: {
          name: 'Sample Restaurant',
          rating: 4.5,
          cuisine: 'Italian',
        },
      };
    } else if (path.includes('/reservation/')) {
      const reservationId = path.split('/reservation/')[1];
      resolvedData = {
        type: 'reservation',
        reservationId,
        action: 'view',
        data: {
          status: 'confirmed',
          date: new Date(),
        },
      };
    } else if (path.includes('/search')) {
      resolvedData = {
        type: 'search',
        action: 'search',
        params,
      };
    }

    return {
      success: true,
      data: {
        originalUrl: url,
        resolved: resolvedData,
        valid: true,
      },
    };
  }

  @Get('settings/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get mobile app settings' })
  @ApiResponse({ status: 200 })
  async getMobileSettings(@Param('userId') userId: string, @Req() req: any) {
    return {
      success: true,
      data: {
        notifications: {
          enabled: true,
          reservationReminders: true,
          specialOffers: false,
          loyaltyUpdates: true,
          tableReady: true,
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
          },
        },
        privacy: {
          locationSharing: true,
          analyticsOptIn: true,
          dataCollection: 'essential',
          shareWithPartners: false,
        },
        display: {
          theme: 'auto',
          fontSize: 'medium',
          highContrast: false,
          reduceMotion: false,
        },
        accessibility: {
          voiceOver: false,
          largeText: false,
          hapticFeedback: true,
          soundEffects: true,
        },
        account: {
          biometricAuth: true,
          autoLogout: 30, // minutes
          syncAcrossDevices: true,
          backupToCloud: true,
        },
      },
    };
  }

  @Put('settings/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update mobile app settings' })
  @ApiResponse({ status: 200 })
  async updateMobileSettings(
    @Param('userId') userId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return {
      success: true,
      data: {
        userId,
        settings: body,
        updatedAt: new Date(),
      },
      message: 'Settings updated successfully',
    };
  }

  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit mobile app feedback' })
  @ApiResponse({ status: 201 })
  async submitFeedback(
    @Body() body: {
      type: 'bug' | 'feature' | 'general';
      category: string;
      subject: string;
      description: string;
      rating?: number;
      deviceInfo?: any;
      logs?: string[];
      attachments?: string[];
    },
    @Req() req: any,
  ) {
    const feedback = {
      id: 'feedback-' + Date.now(),
      userId: req.user.sub,
      type: body.type,
      category: body.category,
      subject: body.subject,
      description: body.description,
      rating: body.rating,
      deviceInfo: body.deviceInfo,
      logs: body.logs || [],
      attachments: body.attachments || [],
      status: 'submitted',
      priority: 'medium',
      assignee: null,
      createdAt: new Date(),
    };

    return {
      success: true,
      data: feedback,
      message: 'Feedback submitted successfully. We appreciate your input!',
    };
  }

  @Get('analytics/events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track mobile analytics events' })
  @ApiResponse({ status: 200 })
  async trackAnalyticsEvents(@Query('events') events: string) {
    // This would typically log events to analytics services
    const eventList = JSON.parse(events || '[]');

    return {
      success: true,
      data: {
        eventsProcessed: eventList.length,
        timestamp: new Date(),
      },
      message: 'Analytics events tracked successfully',
    };
  }
}