import { Service } from 'typedi';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';
import * as admin from 'firebase-admin';
import * as apn from 'apn';
import { OneSignal } from 'onesignal-node';
import Queue from 'bull';

interface MobileDevice {
  deviceId: string;
  userId: string;
  platform: 'ios' | 'android';
  deviceInfo: {
    model: string;
    osVersion: string;
    appVersion: string;
    buildNumber: number;
    screenResolution: string;
    deviceName: string;
    manufacturer?: string;
  };
  pushTokens: {
    fcm?: string;
    apns?: string;
    oneSignal?: string;
  };
  biometrics: {
    enabled: boolean;
    type?: 'fingerprint' | 'faceId' | 'touchId' | 'iris';
    enrolledAt?: Date;
  };
  location: {
    permissionStatus: 'granted' | 'denied' | 'not_determined';
    lastKnownPosition?: {
      lat: number;
      lng: number;
      accuracy: number;
      timestamp: Date;
    };
  };
  settings: {
    notifications: boolean;
    locationTracking: boolean;
    offlineMode: boolean;
    dataSaver: boolean;
    darkMode: boolean;
    language: string;
    currency: string;
    autoBackup: boolean;
  };
  security: {
    jailbroken: boolean;
    pinEnabled: boolean;
    lastSecurityCheck: Date;
    encryptionKey: string;
  };
}

interface MobileSession {
  sessionId: string;
  deviceId: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  ipAddress: string;
  location?: {
    lat: number;
    lng: number;
  };
  actions: {
    action: string;
    timestamp: Date;
    metadata?: any;
  }[];
  performance: {
    appLaunchTime: number;
    screenLoadTimes: Record<string, number>;
    apiResponseTimes: Record<string, number[]>;
    crashes: number;
    anrs: number; // Application Not Responding
  };
}

interface OfflineSync {
  syncId: string;
  deviceId: string;
  pendingChanges: {
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: string;
    data: any;
    timestamp: Date;
    retryCount: number;
  }[];
  lastSyncTime: Date;
  conflictResolution: 'client_wins' | 'server_wins' | 'merge' | 'manual';
}

interface DeepLink {
  linkId: string;
  path: string;
  params: Record<string, any>;
  campaign?: {
    source: string;
    medium: string;
    campaign: string;
  };
  fallbackUrl: string;
  iosUrl?: string;
  androidUrl?: string;
  createdAt: Date;
  expiresAt?: Date;
  clickCount: number;
}

interface PushNotification {
  notificationId: string;
  userId: string;
  deviceIds: string[];
  type: 'marketing' | 'transactional' | 'system' | 'emergency';
  priority: 'low' | 'normal' | 'high' | 'critical';
  payload: {
    title: string;
    body: string;
    image?: string;
    icon?: string;
    badge?: number;
    sound?: string;
    data?: Record<string, any>;
    actions?: {
      actionId: string;
      title: string;
      icon?: string;
      destructive?: boolean;
    }[];
  };
  targeting: {
    platforms?: ('ios' | 'android')[];
    appVersions?: string[];
    languages?: string[];
    countries?: string[];
    segments?: string[];
    testDevices?: string[];
  };
  scheduling: {
    sendAt?: Date;
    timezone?: string;
    ttl?: number; // Time to live in seconds
    throttleRate?: number; // Messages per second
  };
  analytics: {
    sent: number;
    delivered: number;
    opened: number;
    actioned: Record<string, number>;
    failed: number;
    uninstalled: number;
  };
}

interface InAppMessage {
  messageId: string;
  type: 'banner' | 'modal' | 'fullscreen' | 'card';
  trigger: {
    event?: string;
    screen?: string;
    userProperty?: string;
    delay?: number;
    frequency: 'once' | 'session' | 'daily' | 'always';
  };
  content: {
    title: string;
    message: string;
    image?: string;
    primaryAction?: {
      label: string;
      action: string;
      data?: any;
    };
    secondaryAction?: {
      label: string;
      action: string;
      data?: any;
    };
  };
  styling: {
    backgroundColor?: string;
    textColor?: string;
    buttonColor?: string;
    position?: 'top' | 'center' | 'bottom';
    animation?: 'slide' | 'fade' | 'bounce';
  };
  targeting: {
    segments?: string[];
    userProperties?: Record<string, any>;
    excludeUsers?: string[];
  };
}

@Service()
export class MobileAppService {
  private redis: Redis;
  private firebaseAdmin: admin.app.App;
  private apnProvider: apn.Provider;
  private oneSignal: any;
  private syncQueue: Queue.Queue;
  private notificationQueue: Queue.Queue;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);

    // Initialize Firebase Admin
    this.firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });

    // Initialize APN Provider for iOS
    this.apnProvider = new apn.Provider({
      token: {
        key: process.env.APNS_KEY,
        keyId: process.env.APNS_KEY_ID,
        teamId: process.env.APNS_TEAM_ID
      },
      production: process.env.NODE_ENV === 'production'
    });

    // Initialize OneSignal
    this.oneSignal = new OneSignal(
      process.env.ONESIGNAL_APP_ID!,
      process.env.ONESIGNAL_API_KEY!
    );

    // Initialize queues
    this.syncQueue = new Queue('mobile-sync', process.env.REDIS_URL!);
    this.notificationQueue = new Queue('push-notifications', process.env.REDIS_URL!);

    this.setupQueueProcessors();
  }

  private setupQueueProcessors(): void {
    // Process offline sync queue
    this.syncQueue.process(async (job) => {
      const { deviceId, changes } = job.data;
      return await this.processSyncChanges(deviceId, changes);
    });

    // Process notification queue
    this.notificationQueue.process(async (job) => {
      const { notification } = job.data;
      return await this.processPushNotification(notification);
    });
  }

  async registerDevice(device: Partial<MobileDevice>): Promise<MobileDevice> {
    const deviceId = device.deviceId || this.generateDeviceId();

    const fullDevice: MobileDevice = {
      deviceId,
      userId: device.userId!,
      platform: device.platform!,
      deviceInfo: device.deviceInfo!,
      pushTokens: device.pushTokens || {},
      biometrics: device.biometrics || { enabled: false },
      location: device.location || { permissionStatus: 'not_determined' },
      settings: {
        notifications: true,
        locationTracking: false,
        offlineMode: false,
        dataSaver: false,
        darkMode: false,
        language: 'en',
        currency: 'USD',
        autoBackup: true,
        ...device.settings
      },
      security: {
        jailbroken: false,
        pinEnabled: false,
        lastSecurityCheck: new Date(),
        encryptionKey: this.generateEncryptionKey(),
        ...device.security
      }
    };

    // Store device information
    await this.redis.set(
      `device:${deviceId}`,
      JSON.stringify(fullDevice),
      'EX',
      86400 * 90 // 90 days
    );

    // Update user's device list
    await this.redis.sadd(`user:${device.userId}:devices`, deviceId);

    // Initialize offline sync
    await this.initializeOfflineSync(deviceId);

    return fullDevice;
  }

  private generateDeviceId(): string {
    return `dev_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async createMobileSession(
    deviceId: string,
    userId: string,
    ipAddress: string
  ): Promise<MobileSession> {
    const sessionId = `sess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const session: MobileSession = {
      sessionId,
      deviceId,
      userId,
      startTime: new Date(),
      lastActivity: new Date(),
      ipAddress,
      actions: [],
      performance: {
        appLaunchTime: 0,
        screenLoadTimes: {},
        apiResponseTimes: {},
        crashes: 0,
        anrs: 0
      }
    };

    await this.redis.set(
      `session:${sessionId}`,
      JSON.stringify(session),
      'EX',
      3600 * 24 // 24 hours
    );

    // Track active session
    await this.redis.sadd('active:sessions', sessionId);

    return session;
  }

  async trackUserAction(
    sessionId: string,
    action: string,
    metadata?: any
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.actions.push({
      action,
      timestamp: new Date(),
      metadata
    });

    session.lastActivity = new Date();

    await this.redis.set(
      `session:${sessionId}`,
      JSON.stringify(session),
      'EX',
      3600 * 24
    );

    // Analytics tracking
    await this.trackAnalytics(session.userId, action, metadata);
  }

  private async getSession(sessionId: string): Promise<MobileSession | null> {
    const data = await this.redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  private async trackAnalytics(
    userId: string,
    action: string,
    metadata?: any
  ): Promise<void> {
    // Send to analytics service (e.g., Mixpanel, Amplitude)
    const event = {
      userId,
      action,
      metadata,
      timestamp: new Date()
    };

    await this.redis.lpush(
      'analytics:events',
      JSON.stringify(event)
    );
  }

  async initializeOfflineSync(deviceId: string): Promise<OfflineSync> {
    const syncId = `sync_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const sync: OfflineSync = {
      syncId,
      deviceId,
      pendingChanges: [],
      lastSyncTime: new Date(),
      conflictResolution: 'merge'
    };

    await this.redis.set(
      `offline:sync:${deviceId}`,
      JSON.stringify(sync)
    );

    return sync;
  }

  async queueOfflineChange(
    deviceId: string,
    change: OfflineSync['pendingChanges'][0]
  ): Promise<void> {
    const syncData = await this.redis.get(`offline:sync:${deviceId}`);
    if (!syncData) return;

    const sync: OfflineSync = JSON.parse(syncData);
    sync.pendingChanges.push(change);

    await this.redis.set(
      `offline:sync:${deviceId}`,
      JSON.stringify(sync)
    );
  }

  async syncOfflineChanges(deviceId: string): Promise<{
    synced: number;
    conflicts: any[];
    failures: any[];
  }> {
    const syncData = await this.redis.get(`offline:sync:${deviceId}`);
    if (!syncData) {
      return { synced: 0, conflicts: [], failures: [] };
    }

    const sync: OfflineSync = JSON.parse(syncData);
    const results = {
      synced: 0,
      conflicts: [] as any[],
      failures: [] as any[]
    };

    // Process each pending change
    for (const change of sync.pendingChanges) {
      try {
        const result = await this.processSyncChange(change, sync.conflictResolution);

        if (result.success) {
          results.synced++;
        } else if (result.conflict) {
          results.conflicts.push({
            change,
            conflict: result.conflict
          });
        } else {
          results.failures.push({
            change,
            error: result.error
          });
        }
      } catch (error) {
        results.failures.push({
          change,
          error: error
        });
      }
    }

    // Clear synced changes
    sync.pendingChanges = [
      ...results.conflicts.map(c => c.change),
      ...results.failures.map(f => f.change)
    ];
    sync.lastSyncTime = new Date();

    await this.redis.set(
      `offline:sync:${deviceId}`,
      JSON.stringify(sync)
    );

    return results;
  }

  private async processSyncChange(
    change: OfflineSync['pendingChanges'][0],
    conflictResolution: OfflineSync['conflictResolution']
  ): Promise<{ success: boolean; conflict?: any; error?: any }> {
    // Implement sync logic based on entity type and operation
    try {
      // Check for conflicts
      const serverVersion = await this.getServerVersion(change.entity, change.data.id);

      if (serverVersion && serverVersion.updatedAt > change.timestamp) {
        // Conflict detected
        if (conflictResolution === 'server_wins') {
          return { success: false, conflict: serverVersion };
        } else if (conflictResolution === 'client_wins') {
          await this.applyChange(change);
          return { success: true };
        } else if (conflictResolution === 'merge') {
          const merged = await this.mergeChanges(change, serverVersion);
          await this.applyChange(merged);
          return { success: true };
        } else {
          return { success: false, conflict: serverVersion };
        }
      }

      // No conflict, apply change
      await this.applyChange(change);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  private async processSyncChanges(
    deviceId: string,
    changes: any[]
  ): Promise<any> {
    // Queue processing implementation
    return this.syncOfflineChanges(deviceId);
  }

  private async getServerVersion(entity: string, id: string): Promise<any> {
    // Fetch current server version of the entity
    // This would query the actual database
    return null;
  }

  private async mergeChanges(clientChange: any, serverVersion: any): Promise<any> {
    // Implement merge logic
    return {
      ...serverVersion,
      ...clientChange.data,
      mergedAt: new Date()
    };
  }

  private async applyChange(change: any): Promise<void> {
    // Apply the change to the server database
    // This would execute the actual database operation
  }

  async sendPushNotification(notification: PushNotification): Promise<void> {
    // Queue notification for processing
    await this.notificationQueue.add('send-notification', {
      notification
    }, {
      priority: this.getPriorityValue(notification.priority),
      delay: notification.scheduling.sendAt
        ? new Date(notification.scheduling.sendAt).getTime() - Date.now()
        : 0
    });
  }

  private getPriorityValue(priority: PushNotification['priority']): number {
    const priorityMap = {
      low: 10,
      normal: 0,
      high: -5,
      critical: -10
    };
    return priorityMap[priority];
  }

  private async processPushNotification(notification: PushNotification): Promise<void> {
    const devices = await this.getDevicesForNotification(notification);

    for (const device of devices) {
      try {
        if (device.platform === 'ios') {
          await this.sendAPNS(device, notification);
        } else if (device.platform === 'android') {
          await this.sendFCM(device, notification);
        }

        // Track delivery
        notification.analytics.sent++;
      } catch (error) {
        notification.analytics.failed++;
        console.error(`Failed to send notification to device ${device.deviceId}:`, error);
      }
    }

    // Update notification analytics
    await this.redis.set(
      `notification:${notification.notificationId}:analytics`,
      JSON.stringify(notification.analytics),
      'EX',
      86400 * 30
    );
  }

  private async getDevicesForNotification(
    notification: PushNotification
  ): Promise<MobileDevice[]> {
    const devices: MobileDevice[] = [];

    if (notification.deviceIds && notification.deviceIds.length > 0) {
      // Specific devices
      for (const deviceId of notification.deviceIds) {
        const deviceData = await this.redis.get(`device:${deviceId}`);
        if (deviceData) {
          devices.push(JSON.parse(deviceData));
        }
      }
    } else {
      // Get devices for user
      const userDevices = await this.redis.smembers(
        `user:${notification.userId}:devices`
      );

      for (const deviceId of userDevices) {
        const deviceData = await this.redis.get(`device:${deviceId}`);
        if (deviceData) {
          const device = JSON.parse(deviceData);

          // Apply targeting filters
          if (this.matchesTargeting(device, notification.targeting)) {
            devices.push(device);
          }
        }
      }
    }

    return devices;
  }

  private matchesTargeting(
    device: MobileDevice,
    targeting: PushNotification['targeting']
  ): boolean {
    if (targeting.platforms && !targeting.platforms.includes(device.platform)) {
      return false;
    }

    if (targeting.appVersions && !targeting.appVersions.includes(device.deviceInfo.appVersion)) {
      return false;
    }

    if (targeting.languages && !targeting.languages.includes(device.settings.language)) {
      return false;
    }

    return true;
  }

  private async sendAPNS(device: MobileDevice, notification: PushNotification): Promise<void> {
    if (!device.pushTokens.apns) return;

    const apnsNotification = new apn.Notification();
    apnsNotification.expiry = Math.floor(Date.now() / 1000) + (notification.scheduling.ttl || 3600);
    apnsNotification.badge = notification.payload.badge;
    apnsNotification.sound = notification.payload.sound || 'default';
    apnsNotification.alert = {
      title: notification.payload.title,
      body: notification.payload.body
    };
    apnsNotification.payload = notification.payload.data || {};
    apnsNotification.topic = process.env.IOS_BUNDLE_ID;

    await this.apnProvider.send(apnsNotification, device.pushTokens.apns);
  }

  private async sendFCM(device: MobileDevice, notification: PushNotification): Promise<void> {
    if (!device.pushTokens.fcm) return;

    const message = {
      token: device.pushTokens.fcm,
      notification: {
        title: notification.payload.title,
        body: notification.payload.body,
        imageUrl: notification.payload.image
      },
      data: notification.payload.data || {},
      android: {
        priority: notification.priority === 'critical' ? 'high' : 'normal',
        ttl: (notification.scheduling.ttl || 3600) * 1000,
        notification: {
          icon: notification.payload.icon,
          sound: notification.payload.sound || 'default'
        }
      }
    };

    await this.firebaseAdmin.messaging().send(message as any);
  }

  async createDeepLink(deepLink: Partial<DeepLink>): Promise<DeepLink> {
    const linkId = `link_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const fullLink: DeepLink = {
      linkId,
      path: deepLink.path!,
      params: deepLink.params || {},
      campaign: deepLink.campaign,
      fallbackUrl: deepLink.fallbackUrl || 'https://opentable-clone.com',
      iosUrl: deepLink.iosUrl,
      androidUrl: deepLink.androidUrl,
      createdAt: new Date(),
      expiresAt: deepLink.expiresAt,
      clickCount: 0
    };

    await this.redis.set(
      `deeplink:${linkId}`,
      JSON.stringify(fullLink),
      'EX',
      86400 * 30
    );

    // Generate short URL
    const shortUrl = await this.generateShortUrl(linkId);

    return { ...fullLink, path: shortUrl };
  }

  private async generateShortUrl(linkId: string): Promise<string> {
    // Generate a short URL using a URL shortening service
    return `https://otc.link/${linkId.substring(5, 11)}`;
  }

  async handleDeepLink(linkId: string, userAgent: string): Promise<string> {
    const linkData = await this.redis.get(`deeplink:${linkId}`);
    if (!linkData) {
      return 'https://opentable-clone.com/404';
    }

    const link: DeepLink = JSON.parse(linkData);

    // Check expiration
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return link.fallbackUrl;
    }

    // Increment click count
    link.clickCount++;
    await this.redis.set(
      `deeplink:${linkId}`,
      JSON.stringify(link),
      'EX',
      86400 * 30
    );

    // Determine platform from user agent
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);

    if (isIOS && link.iosUrl) {
      return link.iosUrl;
    } else if (isAndroid && link.androidUrl) {
      return link.androidUrl;
    } else {
      // Construct universal link
      return `opentableclone://${link.path}?${new URLSearchParams(link.params).toString()}`;
    }
  }

  async createInAppMessage(message: InAppMessage): Promise<void> {
    await this.redis.set(
      `inappmessage:${message.messageId}`,
      JSON.stringify(message),
      'EX',
      86400 * 30
    );

    // Add to active messages set
    await this.redis.sadd('active:inappmessages', message.messageId);
  }

  async getInAppMessagesForUser(
    userId: string,
    currentScreen: string,
    userProperties: Record<string, any>
  ): Promise<InAppMessage[]> {
    const activeMessageIds = await this.redis.smembers('active:inappmessages');
    const eligibleMessages: InAppMessage[] = [];

    for (const messageId of activeMessageIds) {
      const messageData = await this.redis.get(`inappmessage:${messageId}`);
      if (!messageData) continue;

      const message: InAppMessage = JSON.parse(messageData);

      // Check triggers
      if (message.trigger.screen && message.trigger.screen !== currentScreen) {
        continue;
      }

      // Check targeting
      if (!this.matchesInAppTargeting(userId, userProperties, message.targeting)) {
        continue;
      }

      // Check frequency
      if (!(await this.checkMessageFrequency(userId, message))) {
        continue;
      }

      eligibleMessages.push(message);
    }

    return eligibleMessages;
  }

  private matchesInAppTargeting(
    userId: string,
    userProperties: Record<string, any>,
    targeting: InAppMessage['targeting']
  ): boolean {
    if (targeting.excludeUsers?.includes(userId)) {
      return false;
    }

    if (targeting.userProperties) {
      for (const [key, value] of Object.entries(targeting.userProperties)) {
        if (userProperties[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private async checkMessageFrequency(
    userId: string,
    message: InAppMessage
  ): Promise<boolean> {
    const viewKey = `inappmessage:${message.messageId}:user:${userId}:views`;
    const lastView = await this.redis.get(viewKey);

    if (!lastView) return true;

    const lastViewTime = new Date(lastView);
    const now = new Date();

    switch (message.trigger.frequency) {
      case 'once':
        return false;
      case 'session':
        // Check if in same session
        return false; // Would need session tracking
      case 'daily':
        return now.getDate() !== lastViewTime.getDate();
      case 'always':
        return true;
      default:
        return true;
    }
  }

  async trackInAppMessageView(
    userId: string,
    messageId: string,
    action?: string
  ): Promise<void> {
    const viewKey = `inappmessage:${messageId}:user:${userId}:views`;
    await this.redis.set(viewKey, new Date().toISOString(), 'EX', 86400 * 30);

    // Track analytics
    const analyticsKey = `inappmessage:${messageId}:analytics`;
    await this.redis.hincrby(analyticsKey, 'views', 1);

    if (action) {
      await this.redis.hincrby(analyticsKey, `action:${action}`, 1);
    }
  }
}