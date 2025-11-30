import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In, MoreThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, Restaurant, AppInstall, DeviceInfo, OfflineSync } from '../entities';
import * as Redis from 'ioredis';
import * as webpush from 'web-push';
import * as geolib from 'geolib';
import * as QRCode from 'qrcode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sharp from 'sharp';

interface PWAInstallRequest {
  userId?: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    language: string;
    screenResolution: string;
  };
  pushSubscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

interface MobileFeatures {
  geolocation: boolean;
  pushNotifications: boolean;
  camera: boolean;
  offlineMode: boolean;
  biometricAuth: boolean;
  appleWallet: boolean;
  googlePay: boolean;
  hapticFeedback: boolean;
  shareApi: boolean;
  nfc: boolean;
}

interface OfflineSyncRequest {
  userId: string;
  deviceId: string;
  syncData: {
    reservations?: any[];
    favorites?: any[];
    searches?: any[];
    reviews?: any[];
    lastSyncTimestamp: number;
  };
}

interface AppShortcut {
  name: string;
  shortName: string;
  description: string;
  url: string;
  icon: string;
}

interface DeepLinkRequest {
  action: string;
  params: any;
  source: 'qr' | 'nfc' | 'share' | 'notification';
}

interface GeofenceRequest {
  userId: string;
  restaurantId: string;
  radius: number; // in meters
  notificationType: 'entry' | 'exit' | 'dwell';
}

interface DigitalPassRequest {
  reservationId: string;
  userId: string;
  platform: 'apple' | 'google';
}

interface AppMetrics {
  installCount: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  platformBreakdown: {
    ios: number;
    android: number;
    web: number;
  };
  featureUsage: {
    [feature: string]: number;
  };
  offlineSyncs: number;
  pushDeliveryRate: number;
  averageSessionDuration: number;
  crashRate: number;
}

@Injectable()
export class MobilePWAService {
  private redis: Redis.Redis;
  private manifest: any;
  private serviceWorkerScript: string;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    @InjectRepository(AppInstall)
    private appInstallRepository: Repository<AppInstall>,
    @InjectRepository(DeviceInfo)
    private deviceInfoRepository: Repository<DeviceInfo>,
    @InjectRepository(OfflineSync)
    private offlineSyncRepository: Repository<OfflineSync>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    });

    // Initialize Web Push
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // Generate manifest and service worker
    this.generateManifest();
    this.generateServiceWorker();
  }

  // Generate PWA manifest
  private generateManifest() {
    this.manifest = {
      name: process.env.APP_NAME || 'OpenTable Clone',
      short_name: process.env.APP_SHORT_NAME || 'OTC',
      description: 'Restaurant reservation and discovery platform',
      start_url: '/?source=pwa',
      display: 'standalone',
      orientation: 'portrait',
      theme_color: '#DA3743',
      background_color: '#FFFFFF',
      categories: ['food', 'lifestyle'],
      icons: [
        {
          src: '/icons/icon-72x72.png',
          sizes: '72x72',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/icon-128x128.png',
          sizes: '128x128',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/icon-144x144.png',
          sizes: '144x144',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/icon-152x152.png',
          sizes: '152x152',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/icon-384x384.png',
          sizes: '384x384',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      shortcuts: [
        {
          name: 'Search Restaurants',
          short_name: 'Search',
          description: 'Find restaurants near you',
          url: '/search?source=shortcut',
          icons: [{ src: '/icons/search-96x96.png', sizes: '96x96' }],
        },
        {
          name: 'My Reservations',
          short_name: 'Reservations',
          description: 'View your upcoming reservations',
          url: '/reservations?source=shortcut',
          icons: [{ src: '/icons/reservation-96x96.png', sizes: '96x96' }],
        },
        {
          name: 'Favorites',
          short_name: 'Favorites',
          description: 'Your favorite restaurants',
          url: '/favorites?source=shortcut',
          icons: [{ src: '/icons/favorite-96x96.png', sizes: '96x96' }],
        },
      ],
      screenshots: [
        {
          src: '/screenshots/home.png',
          type: 'image/png',
          sizes: '1280x720',
          form_factor: 'wide',
        },
        {
          src: '/screenshots/search.png',
          type: 'image/png',
          sizes: '1280x720',
          form_factor: 'wide',
        },
        {
          src: '/screenshots/mobile-home.png',
          type: 'image/png',
          sizes: '750x1334',
          form_factor: 'narrow',
        },
      ],
      share_target: {
        action: '/share',
        method: 'POST',
        enctype: 'multipart/form-data',
        params: {
          title: 'title',
          text: 'text',
          url: 'url',
        },
      },
      protocol_handlers: [
        {
          protocol: 'web+restaurant',
          url: '/restaurant/%s',
        },
      ],
      related_applications: [
        {
          platform: 'play',
          url: 'https://play.google.com/store/apps/details?id=com.opentableclone',
        },
        {
          platform: 'itunes',
          url: 'https://apps.apple.com/app/opentable-clone/id123456789',
        },
      ],
      prefer_related_applications: false,
    };
  }

  // Generate service worker
  private generateServiceWorker() {
    this.serviceWorkerScript = `
      const CACHE_NAME = 'otc-cache-v1';
      const urlsToCache = [
        '/',
        '/search',
        '/offline',
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
      ];

      // Install event
      self.addEventListener('install', event => {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
        );
      });

      // Fetch event
      self.addEventListener('fetch', event => {
        event.respondWith(
          caches.match(event.request)
            .then(response => {
              if (response) {
                return response;
              }
              return fetch(event.request)
                .then(response => {
                  if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                  }
                  const responseToCache = response.clone();
                  caches.open(CACHE_NAME)
                    .then(cache => {
                      cache.put(event.request, responseToCache);
                    });
                  return response;
                })
                .catch(() => {
                  if (event.request.destination === 'document') {
                    return caches.match('/offline');
                  }
                });
            })
        );
      });

      // Push event
      self.addEventListener('push', event => {
        const options = {
          body: event.data ? event.data.text() : 'New notification',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          vibrate: [200, 100, 200],
          data: event.data ? event.data.json() : {},
        };

        event.waitUntil(
          self.registration.showNotification('OpenTable Clone', options)
        );
      });

      // Notification click event
      self.addEventListener('notificationclick', event => {
        event.notification.close();
        event.waitUntil(
          clients.openWindow(event.notification.data.url || '/')
        );
      });

      // Background sync
      self.addEventListener('sync', event => {
        if (event.tag === 'sync-reservations') {
          event.waitUntil(syncReservations());
        }
      });

      // Periodic background sync
      self.addEventListener('periodicsync', event => {
        if (event.tag === 'update-content') {
          event.waitUntil(updateContent());
        }
      });

      async function syncReservations() {
        const db = await openDB();
        const pendingReservations = await db.getAll('pending-reservations');

        for (const reservation of pendingReservations) {
          try {
            await fetch('/api/reservations', {
              method: 'POST',
              body: JSON.stringify(reservation),
              headers: { 'Content-Type': 'application/json' },
            });
            await db.delete('pending-reservations', reservation.id);
          } catch (error) {
            console.error('Sync failed:', error);
          }
        }
      }

      async function updateContent() {
        // Update cached content
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(urlsToCache);
      }
    `;
  }

  // Install PWA
  async installPWA(request: PWAInstallRequest): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create device info
      const deviceInfo = this.deviceInfoRepository.create({
        userAgent: request.deviceInfo.userAgent,
        platform: request.deviceInfo.platform,
        language: request.deviceInfo.language,
        screenResolution: request.deviceInfo.screenResolution,
        createdAt: new Date(),
      });

      await queryRunner.manager.save(deviceInfo);

      // Create app install record
      const appInstall = this.appInstallRepository.create({
        userId: request.userId,
        deviceId: deviceInfo.id,
        platform: this.getPlatformFromUserAgent(request.deviceInfo.userAgent),
        version: process.env.APP_VERSION,
        installSource: 'pwa',
        pushEndpoint: request.pushSubscription?.endpoint,
        pushKeys: request.pushSubscription?.keys,
        installedAt: new Date(),
        lastActiveAt: new Date(),
      });

      await queryRunner.manager.save(appInstall);

      // Subscribe to push notifications
      if (request.pushSubscription && request.userId) {
        await this.subscribeToPushNotifications(
          request.userId,
          request.pushSubscription,
          deviceInfo.id
        );
      }

      await queryRunner.commitTransaction();

      // Track installation
      this.eventEmitter.emit('analytics.track', {
        event: 'pwa_installed',
        userId: request.userId,
        properties: {
          platform: appInstall.platform,
          deviceInfo: request.deviceInfo,
        },
      });

      return {
        success: true,
        installId: appInstall.id,
        features: await this.getAvailableFeatures(request.deviceInfo.userAgent),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Get available mobile features
  async getAvailableFeatures(userAgent: string): Promise<MobileFeatures> {
    const features: MobileFeatures = {
      geolocation: 'geolocation' in navigator,
      pushNotifications: 'PushManager' in window,
      camera: 'mediaDevices' in navigator,
      offlineMode: 'serviceWorker' in navigator,
      biometricAuth: this.supportsBiometric(userAgent),
      appleWallet: this.isIOS(userAgent),
      googlePay: this.isAndroid(userAgent),
      hapticFeedback: 'vibrate' in navigator,
      shareApi: 'share' in navigator,
      nfc: 'NDEFReader' in window,
    };

    return features;
  }

  // Sync offline data
  async syncOfflineData(request: OfflineSyncRequest): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get last sync record
      const lastSync = await this.offlineSyncRepository.findOne({
        where: {
          userId: request.userId,
          deviceId: request.deviceId,
        },
        order: { syncedAt: 'DESC' },
      });

      const serverChanges = {
        reservations: [],
        favorites: [],
        reviews: [],
      };

      // Get server changes since last sync
      if (lastSync) {
        const lastSyncTime = new Date(lastSync.syncedAt);

        // Get updated reservations
        serverChanges.reservations = await queryRunner.manager.query(`
          SELECT * FROM reservations
          WHERE user_id = $1 AND updated_at > $2
        `, [request.userId, lastSyncTime]);

        // Get updated favorites
        serverChanges.favorites = await queryRunner.manager.query(`
          SELECT * FROM favorites
          WHERE user_id = $1 AND updated_at > $2
        `, [request.userId, lastSyncTime]);

        // Get updated reviews
        serverChanges.reviews = await queryRunner.manager.query(`
          SELECT * FROM reviews
          WHERE user_id = $1 AND updated_at > $2
        `, [request.userId, lastSyncTime]);
      }

      // Process client changes
      const processedData = {
        reservations: [],
        favorites: [],
        reviews: [],
        conflicts: [],
      };

      // Handle reservations
      if (request.syncData.reservations) {
        for (const reservation of request.syncData.reservations) {
          try {
            // Check for conflicts
            const serverReservation = await queryRunner.manager.findOne('Reservation', {
              where: { id: reservation.id },
            });

            if (serverReservation &&
                serverReservation.updatedAt > new Date(reservation.updatedAt)) {
              // Conflict detected
              processedData.conflicts.push({
                type: 'reservation',
                id: reservation.id,
                clientData: reservation,
                serverData: serverReservation,
              });
            } else {
              // Update or create
              await queryRunner.manager.save('Reservation', reservation);
              processedData.reservations.push(reservation);
            }
          } catch (error) {
            console.error('Error syncing reservation:', error);
          }
        }
      }

      // Create sync record
      const syncRecord = this.offlineSyncRepository.create({
        userId: request.userId,
        deviceId: request.deviceId,
        syncedData: {
          uploaded: processedData,
          downloaded: serverChanges,
        },
        syncedAt: new Date(),
        status: processedData.conflicts.length > 0 ? 'partial' : 'complete',
      });

      await queryRunner.manager.save(syncRecord);

      await queryRunner.commitTransaction();

      return {
        success: true,
        serverChanges,
        processedData,
        lastSyncTimestamp: Date.now(),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Handle deep links
  async handleDeepLink(request: DeepLinkRequest): Promise<any> {
    try {
      let result: any = {
        success: true,
        action: request.action,
      };

      switch (request.action) {
        case 'restaurant':
          result.data = await this.getRestaurantDetails(request.params.restaurantId);
          result.redirectUrl = `/restaurant/${request.params.restaurantId}`;
          break;

        case 'reservation':
          result.data = await this.getReservationDetails(request.params.reservationId);
          result.redirectUrl = `/reservations/${request.params.reservationId}`;
          break;

        case 'search':
          result.redirectUrl = `/search?${new URLSearchParams(request.params).toString()}`;
          break;

        case 'review':
          result.redirectUrl = `/review/${request.params.restaurantId}`;
          break;

        case 'share':
          // Handle shared content
          result = await this.handleSharedContent(request.params);
          break;

        default:
          throw new BadRequestException('Unknown deep link action');
      }

      // Track deep link usage
      this.eventEmitter.emit('analytics.track', {
        event: 'deep_link_opened',
        properties: {
          action: request.action,
          source: request.source,
          params: request.params,
        },
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  // Generate QR code for restaurant/reservation
  async generateQRCode(type: 'restaurant' | 'reservation', id: string): Promise<any> {
    try {
      const baseUrl = process.env.FRONTEND_URL;
      let url: string;
      let data: any = {};

      if (type === 'restaurant') {
        const restaurant = await this.restaurantRepository.findOne({
          where: { id },
        });

        if (!restaurant) {
          throw new NotFoundException('Restaurant not found');
        }

        url = `${baseUrl}/restaurant/${id}?source=qr`;
        data = {
          name: restaurant.name,
          cuisine: restaurant.cuisineType,
          rating: restaurant.averageRating,
        };
      } else {
        // Get reservation details
        url = `${baseUrl}/reservation/${id}?source=qr`;
      }

      // Generate QR code
      const qrCodeData = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 512,
      });

      // Generate branded QR code with logo
      const brandedQR = await this.addLogoToQRCode(qrCodeData);

      return {
        success: true,
        qrCode: brandedQR,
        url,
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Setup geofencing for restaurant
  async setupGeofence(request: GeofenceRequest): Promise<any> {
    try {
      const restaurant = await this.restaurantRepository.findOne({
        where: { id: request.restaurantId },
      });

      if (!restaurant) {
        throw new NotFoundException('Restaurant not found');
      }

      // Store geofence configuration
      const geofenceKey = `geofence:${request.userId}:${request.restaurantId}`;
      const geofenceData = {
        restaurantId: request.restaurantId,
        center: {
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
        },
        radius: request.radius,
        notificationType: request.notificationType,
        active: true,
        createdAt: Date.now(),
      };

      await this.redis.setex(
        geofenceKey,
        86400 * 30, // 30 days
        JSON.stringify(geofenceData)
      );

      // Register with device
      this.eventEmitter.emit('geofence.register', {
        userId: request.userId,
        geofence: geofenceData,
      });

      return {
        success: true,
        geofence: geofenceData,
      };
    } catch (error) {
      throw error;
    }
  }

  // Generate digital pass for wallet
  async generateDigitalPass(request: DigitalPassRequest): Promise<any> {
    try {
      // Get reservation details
      const reservation = await this.dataSource.getRepository('Reservation').findOne({
        where: { id: request.reservationId, userId: request.userId },
        relations: ['restaurant'],
      });

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }

      let passData: any;

      if (request.platform === 'apple') {
        passData = await this.generateAppleWalletPass(reservation);
      } else {
        passData = await this.generateGoogleWalletPass(reservation);
      }

      return {
        success: true,
        platform: request.platform,
        passUrl: passData.url,
        passData: passData.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get app metrics
  async getAppMetrics(period: 'day' | 'week' | 'month'): Promise<AppMetrics> {
    const cacheKey = `metrics:app:${period}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const startDate = this.getStartDateForPeriod(period);

    // Get install metrics
    const installCount = await this.appInstallRepository.count({
      where: {
        installedAt: MoreThanOrEqual(startDate),
      },
    });

    // Get active users
    const activeUsers = {
      daily: await this.getActiveUsers(1),
      weekly: await this.getActiveUsers(7),
      monthly: await this.getActiveUsers(30),
    };

    // Platform breakdown
    const platformStats = await this.appInstallRepository
      .createQueryBuilder('install')
      .select('install.platform', 'platform')
      .addSelect('COUNT(*)', 'count')
      .where('install.installedAt >= :startDate', { startDate })
      .groupBy('install.platform')
      .getRawMany();

    const platformBreakdown = {
      ios: 0,
      android: 0,
      web: 0,
    };

    platformStats.forEach(stat => {
      platformBreakdown[stat.platform] = parseInt(stat.count);
    });

    // Feature usage
    const featureUsage = await this.getFeatureUsage(startDate);

    // Offline syncs
    const offlineSyncs = await this.offlineSyncRepository.count({
      where: {
        syncedAt: MoreThanOrEqual(startDate),
      },
    });

    // Calculate push delivery rate
    const pushStats = await this.getPushDeliveryStats(startDate);

    // Average session duration (mock data - would track via analytics)
    const averageSessionDuration = 485; // seconds

    // Crash rate (mock data - would track via error reporting)
    const crashRate = 0.02; // 2%

    const metrics: AppMetrics = {
      installCount,
      activeUsers,
      platformBreakdown,
      featureUsage,
      offlineSyncs,
      pushDeliveryRate: pushStats.deliveryRate,
      averageSessionDuration,
      crashRate,
    };

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(metrics));

    return metrics;
  }

  // Helper methods
  private getPlatformFromUserAgent(userAgent: string): 'ios' | 'android' | 'web' {
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return 'ios';
    } else if (/Android/i.test(userAgent)) {
      return 'android';
    } else {
      return 'web';
    }
  }

  private isIOS(userAgent: string): boolean {
    return /iPhone|iPad|iPod/i.test(userAgent);
  }

  private isAndroid(userAgent: string): boolean {
    return /Android/i.test(userAgent);
  }

  private supportsBiometric(userAgent: string): boolean {
    // Check for biometric support based on device
    if (this.isIOS(userAgent)) {
      // iOS devices with Face ID or Touch ID
      return /iPhone (X|1[1-9]|[2-9]\d)/i.test(userAgent) || /iPad/i.test(userAgent);
    } else if (this.isAndroid(userAgent)) {
      // Most modern Android devices support biometric
      return true;
    }
    return false;
  }

  private async subscribeToPushNotifications(
    userId: string,
    subscription: any,
    deviceId: string
  ): Promise<void> {
    // Store push subscription
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (user) {
      if (!user.pushTokens) {
        user.pushTokens = [];
      }

      user.pushTokens.push({
        type: 'web',
        deviceId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        createdAt: new Date(),
      });

      await this.userRepository.save(user);
    }
  }

  private async getRestaurantDetails(restaurantId: string): Promise<any> {
    return this.restaurantRepository.findOne({
      where: { id: restaurantId },
      relations: ['photos', 'menu'],
    });
  }

  private async getReservationDetails(reservationId: string): Promise<any> {
    return this.dataSource.getRepository('Reservation').findOne({
      where: { id: reservationId },
      relations: ['restaurant', 'user'],
    });
  }

  private async handleSharedContent(params: any): Promise<any> {
    // Process shared content
    return {
      success: true,
      action: 'share',
      data: params,
    };
  }

  private async addLogoToQRCode(qrCodeData: string): Promise<string> {
    try {
      // Convert base64 to buffer
      const qrBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64');

      // Load logo
      const logoPath = path.join(__dirname, '../assets/logo.png');
      const logoBuffer = await fs.readFile(logoPath);

      // Composite logo onto QR code
      const composited = await sharp(qrBuffer)
        .composite([
          {
            input: await sharp(logoBuffer)
              .resize(80, 80)
              .toBuffer(),
            gravity: 'center',
          },
        ])
        .toBuffer();

      return `data:image/png;base64,${composited.toString('base64')}`;
    } catch (error) {
      // Return original QR code if logo addition fails
      return qrCodeData;
    }
  }

  private async generateAppleWalletPass(reservation: any): Promise<any> {
    // Generate Apple Wallet pass
    // This would integrate with PassKit or similar service
    const passData = {
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.opentableclone.reservation',
      serialNumber: reservation.id,
      teamIdentifier: process.env.APPLE_TEAM_ID,
      organizationName: 'OpenTable Clone',
      description: `Reservation at ${reservation.restaurant.name}`,
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(218, 55, 67)',
      labelColor: 'rgb(255, 255, 255)',
      barcode: {
        message: reservation.id,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
      },
      generic: {
        primaryFields: [
          {
            key: 'restaurant',
            label: 'RESTAURANT',
            value: reservation.restaurant.name,
          },
        ],
        secondaryFields: [
          {
            key: 'date',
            label: 'DATE',
            value: reservation.date,
            dateStyle: 'PKDateStyleMedium',
          },
          {
            key: 'time',
            label: 'TIME',
            value: reservation.time,
          },
        ],
        auxiliaryFields: [
          {
            key: 'guests',
            label: 'GUESTS',
            value: reservation.partySize.toString(),
          },
        ],
      },
    };

    return {
      url: `https://api.opentableclone.com/pass/apple/${reservation.id}`,
      data: passData,
    };
  }

  private async generateGoogleWalletPass(reservation: any): Promise<any> {
    // Generate Google Wallet pass
    const passData = {
      id: reservation.id,
      classId: 'opentableclone.reservation',
      genericType: 'GENERIC_TYPE_UNSPECIFIED',
      logo: {
        sourceUri: {
          uri: 'https://opentableclone.com/logo.png',
        },
      },
      cardTitle: {
        defaultValue: {
          language: 'en',
          value: 'Restaurant Reservation',
        },
      },
      header: {
        defaultValue: {
          language: 'en',
          value: reservation.restaurant.name,
        },
      },
      textModulesData: [
        {
          id: 'date',
          header: 'DATE',
          body: reservation.date,
        },
        {
          id: 'time',
          header: 'TIME',
          body: reservation.time,
        },
        {
          id: 'party',
          header: 'PARTY SIZE',
          body: reservation.partySize.toString(),
        },
      ],
      barcode: {
        type: 'QR_CODE',
        value: reservation.id,
      },
    };

    return {
      url: `https://pay.google.com/gp/v/save/${Buffer.from(JSON.stringify(passData)).toString('base64')}`,
      data: passData,
    };
  }

  private async getActiveUsers(days: number): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.appInstallRepository.count({
      where: {
        lastActiveAt: MoreThanOrEqual(startDate),
      },
    });
  }

  private async getFeatureUsage(startDate: Date): Promise<any> {
    // This would track actual feature usage via analytics
    return {
      search: 4532,
      reservation: 2341,
      review: 892,
      messaging: 1245,
      notifications: 3421,
      offlineMode: 567,
      qrCode: 234,
      digitalPass: 145,
    };
  }

  private async getPushDeliveryStats(startDate: Date): Promise<any> {
    // This would track actual push delivery stats
    return {
      sent: 10000,
      delivered: 9200,
      deliveryRate: 0.92,
    };
  }

  private getStartDateForPeriod(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      default:
        return new Date(now.setDate(now.getDate() - 7));
    }
  }
}