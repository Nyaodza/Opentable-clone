import { Service } from 'typedi';
import { Op } from 'sequelize';
import * as moment from 'moment-timezone';
import { Redis } from 'ioredis';
import Queue from 'bull';
import { Server as SocketServer } from 'socket.io';
import * as geolib from 'geolib';

interface LastMinuteSlot {
  slotId: string;
  restaurantId: string;
  dateTime: Date;
  partySize: number;
  tableId?: string;
  duration: number; // minutes
  type: 'cancellation' | 'no_show' | 'new_release' | 'walk_in' | 'bar_seating';
  discount?: number; // percentage
  minimumSpend?: number;
  maximumPartySize?: number;
  releasedAt: Date;
  expiresAt: Date;
  status: 'available' | 'hold' | 'reserved' | 'expired';
  visibility: 'public' | 'members_only' | 'vip_only' | 'app_only';
  priority: number; // 1-10, higher is more urgent
  incentives: {
    type: 'discount' | 'points' | 'complimentary' | 'upgrade';
    value: number | string;
    description: string;
  }[];
  restrictions?: {
    requiresCreditCard: boolean;
    cancellationFee?: number;
    minimumNotice?: number; // hours
    blackoutDates?: Date[];
  };
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    neighborhood: string;
    city: string;
  };
}

interface FlashDeal {
  dealId: string;
  restaurantId: string;
  title: string;
  description: string;
  slots: string[]; // slotIds
  startTime: Date;
  endTime: Date;
  discount: number;
  minimumSpend?: number;
  maximumRedemptions: number;
  currentRedemptions: number;
  terms: string[];
  media: {
    image?: string;
    video?: string;
  };
  targetAudience: {
    segments?: string[];
    previousDiners?: boolean;
    newCustomers?: boolean;
    membershipTier?: string[];
  };
}

interface UserAlert {
  alertId: string;
  userId: string;
  preferences: {
    restaurants?: string[];
    cuisines?: string[];
    neighborhoods?: string[];
    maxDistance?: number; // km
    partySizes?: number[];
    timeWindows?: {
      dayOfWeek: number[];
      startTime: string;
      endTime: string;
    }[];
    minDiscount?: number;
    acceptWalkIn?: boolean;
    acceptBarSeating?: boolean;
  };
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  frequency: 'instant' | 'hourly' | 'daily';
  active: boolean;
  createdAt: Date;
  lastNotified?: Date;
}

interface RealTimeAvailability {
  restaurantId: string;
  timestamp: Date;
  currentOccupancy: number;
  maxOccupancy: number;
  estimatedWaitTime: number; // minutes
  acceptingWalkIns: boolean;
  barSeatingAvailable: boolean;
  communalTableAvailable: boolean;
  nextAvailableTime?: Date;
  turnoverRate: number; // tables per hour
  weatherImpact?: 'low' | 'medium' | 'high';
  eventImpact?: string; // nearby event affecting availability
}

interface WaitlistEntry {
  entryId: string;
  restaurantId: string;
  userId: string;
  partySize: number;
  requestedTime: Date;
  flexibilityWindow: number; // minutes +/-
  preferences: {
    seatingArea?: 'indoor' | 'outdoor' | 'bar' | 'any';
    tableType?: 'booth' | 'table' | 'high_top' | 'any';
    specialRequests?: string[];
  };
  status: 'waiting' | 'notified' | 'accepted' | 'declined' | 'expired' | 'seated';
  position: number;
  estimatedSeatTime?: Date;
  notificationsSent: {
    type: 'initial' | 'update' | 'available' | 'final';
    timestamp: Date;
    channel: 'push' | 'sms' | 'email';
  }[];
  joinedAt: Date;
  seatedAt?: Date;
}

@Service()
export class LastMinuteAvailabilityService {
  private redis: Redis;
  private io: SocketServer;
  private notificationQueue: Queue.Queue;
  private slotExpirationQueue: Queue.Queue;
  private waitlistQueue: Queue.Queue;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.io = new SocketServer();

    this.notificationQueue = new Queue('lastminute-notifications', process.env.REDIS_URL!);
    this.slotExpirationQueue = new Queue('slot-expiration', process.env.REDIS_URL!);
    this.waitlistQueue = new Queue('waitlist-processing', process.env.REDIS_URL!);

    this.setupQueueProcessors();
    this.setupRealTimeMonitoring();
  }

  private setupQueueProcessors(): void {
    // Process notifications
    this.notificationQueue.process(async (job) => {
      const { userId, slot } = job.data;
      return await this.sendNotification(userId, slot);
    });

    // Process slot expiration
    this.slotExpirationQueue.process(async (job) => {
      const { slotId } = job.data;
      return await this.expireSlot(slotId);
    });

    // Process waitlist
    this.waitlistQueue.process(async (job) => {
      const { restaurantId } = job.data;
      return await this.processWaitlist(restaurantId);
    });
  }

  private setupRealTimeMonitoring(): void {
    // Monitor real-time availability changes
    setInterval(async () => {
      const restaurants = await this.getActiveRestaurants();
      for (const restaurantId of restaurants) {
        await this.updateRealTimeAvailability(restaurantId);
      }
    }, 60000); // Every minute

    // Clean up expired slots
    setInterval(async () => {
      await this.cleanupExpiredSlots();
    }, 300000); // Every 5 minutes
  }

  async releaseLastMinuteSlot(
    restaurantId: string,
    slot: Partial<LastMinuteSlot>
  ): Promise<LastMinuteSlot> {
    const slotId = `lms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get restaurant location
    const location = await this.getRestaurantLocation(restaurantId);

    const fullSlot: LastMinuteSlot = {
      slotId,
      restaurantId,
      dateTime: slot.dateTime!,
      partySize: slot.partySize!,
      tableId: slot.tableId,
      duration: slot.duration || 90,
      type: slot.type || 'cancellation',
      discount: slot.discount,
      minimumSpend: slot.minimumSpend,
      maximumPartySize: slot.maximumPartySize || slot.partySize,
      releasedAt: new Date(),
      expiresAt: slot.expiresAt || new Date(Date.now() + 3600000), // 1 hour default
      status: 'available',
      visibility: slot.visibility || 'public',
      priority: this.calculatePriority(slot),
      incentives: slot.incentives || [],
      restrictions: slot.restrictions,
      location
    };

    // Store slot
    await this.redis.set(
      `slot:${slotId}`,
      JSON.stringify(fullSlot),
      'EX',
      Math.floor((fullSlot.expiresAt.getTime() - Date.now()) / 1000)
    );

    // Add to availability index
    await this.addToAvailabilityIndex(fullSlot);

    // Notify matched users
    await this.notifyMatchedUsers(fullSlot);

    // Check waitlist
    await this.checkWaitlistForSlot(fullSlot);

    // Emit real-time update
    this.io.emit('lastMinuteSlot:new', {
      restaurantId,
      slot: fullSlot
    });

    // Schedule expiration
    const delay = fullSlot.expiresAt.getTime() - Date.now();
    await this.slotExpirationQueue.add(
      'expire-slot',
      { slotId },
      { delay }
    );

    return fullSlot;
  }

  private async getRestaurantLocation(restaurantId: string): Promise<LastMinuteSlot['location']> {
    // Fetch from database
    // Mock implementation
    return {
      address: '123 Main St',
      coordinates: {
        lat: 37.7749,
        lng: -122.4194
      },
      neighborhood: 'SOMA',
      city: 'San Francisco'
    };
  }

  private calculatePriority(slot: Partial<LastMinuteSlot>): number {
    let priority = 5;

    // Increase priority for sooner slots
    const hoursUntil = (slot.dateTime!.getTime() - Date.now()) / 3600000;
    if (hoursUntil < 2) priority += 3;
    else if (hoursUntil < 4) priority += 2;
    else if (hoursUntil < 8) priority += 1;

    // Increase priority for larger discounts
    if (slot.discount) {
      if (slot.discount >= 30) priority += 2;
      else if (slot.discount >= 20) priority += 1;
    }

    // Cap at 10
    return Math.min(priority, 10);
  }

  private async addToAvailabilityIndex(slot: LastMinuteSlot): Promise<void> {
    // Add to time-based index
    const timeKey = moment(slot.dateTime).format('YYYY-MM-DD:HH');
    await this.redis.zadd(
      `availability:time:${timeKey}`,
      slot.priority,
      slot.slotId
    );

    // Add to location-based index
    await this.redis.geoadd(
      'availability:location',
      slot.location.coordinates.lng,
      slot.location.coordinates.lat,
      slot.slotId
    );

    // Add to restaurant index
    await this.redis.sadd(
      `availability:restaurant:${slot.restaurantId}`,
      slot.slotId
    );

    // Add to type index
    await this.redis.sadd(
      `availability:type:${slot.type}`,
      slot.slotId
    );
  }

  async searchLastMinuteAvailability(
    filters: {
      dateTime?: Date;
      partySize?: number;
      location?: { lat: number; lng: number };
      radius?: number; // km
      cuisines?: string[];
      priceRange?: number[];
      minDiscount?: number;
      types?: LastMinuteSlot['type'][];
    }
  ): Promise<LastMinuteSlot[]> {
    let slotIds: Set<string> = new Set();

    // Search by time
    if (filters.dateTime) {
      const timeKey = moment(filters.dateTime).format('YYYY-MM-DD:HH');
      const timeSlots = await this.redis.zrange(
        `availability:time:${timeKey}`,
        0,
        -1
      );
      timeSlots.forEach(id => slotIds.add(id));
    } else {
      // Get all upcoming slots
      const now = moment();
      for (let i = 0; i < 24; i++) {
        const timeKey = now.add(i, 'hours').format('YYYY-MM-DD:HH');
        const timeSlots = await this.redis.zrange(
          `availability:time:${timeKey}`,
          0,
          -1
        );
        timeSlots.forEach(id => slotIds.add(id));
      }
    }

    // Filter by location
    if (filters.location && filters.radius) {
      const nearbySlots = await this.redis.georadius(
        'availability:location',
        filters.location.lng,
        filters.location.lat,
        filters.radius,
        'km'
      );

      // Intersect with existing results
      if (slotIds.size > 0) {
        slotIds = new Set(
          nearbySlots.filter(id => slotIds.has(id))
        );
      } else {
        nearbySlots.forEach(id => slotIds.add(id));
      }
    }

    // Get full slot details
    const slots: LastMinuteSlot[] = [];
    for (const slotId of slotIds) {
      const slotData = await this.redis.get(`slot:${slotId}`);
      if (slotData) {
        const slot: LastMinuteSlot = JSON.parse(slotData);

        // Apply additional filters
        if (filters.partySize && slot.partySize < filters.partySize) continue;
        if (filters.minDiscount && (!slot.discount || slot.discount < filters.minDiscount)) continue;
        if (filters.types && !filters.types.includes(slot.type)) continue;

        slots.push(slot);
      }
    }

    // Sort by priority and time
    slots.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.dateTime.getTime() - b.dateTime.getTime();
    });

    return slots;
  }

  async createUserAlert(
    userId: string,
    preferences: UserAlert['preferences'],
    notifications: UserAlert['notifications']
  ): Promise<UserAlert> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: UserAlert = {
      alertId,
      userId,
      preferences,
      notifications,
      frequency: 'instant',
      active: true,
      createdAt: new Date()
    };

    // Store alert
    await this.redis.set(
      `alert:${alertId}`,
      JSON.stringify(alert)
    );

    // Add to user's alerts
    await this.redis.sadd(`user:${userId}:alerts`, alertId);

    // Index by preferences for matching
    if (preferences.restaurants) {
      for (const restaurantId of preferences.restaurants) {
        await this.redis.sadd(`alerts:restaurant:${restaurantId}`, alertId);
      }
    }

    if (preferences.neighborhoods) {
      for (const neighborhood of preferences.neighborhoods) {
        await this.redis.sadd(`alerts:neighborhood:${neighborhood}`, alertId);
      }
    }

    return alert;
  }

  private async notifyMatchedUsers(slot: LastMinuteSlot): Promise<void> {
    const matchedAlerts = await this.findMatchingAlerts(slot);

    for (const alertId of matchedAlerts) {
      const alertData = await this.redis.get(`alert:${alertId}`);
      if (!alertData) continue;

      const alert: UserAlert = JSON.parse(alertData);

      // Check notification frequency
      if (!this.shouldNotify(alert)) continue;

      // Queue notification
      await this.notificationQueue.add(
        'send-notification',
        { userId: alert.userId, slot },
        { priority: slot.priority }
      );

      // Update last notified
      alert.lastNotified = new Date();
      await this.redis.set(
        `alert:${alertId}`,
        JSON.stringify(alert)
      );
    }
  }

  private async findMatchingAlerts(slot: LastMinuteSlot): Promise<string[]> {
    const matchedAlerts: Set<string> = new Set();

    // Match by restaurant
    const restaurantAlerts = await this.redis.smembers(
      `alerts:restaurant:${slot.restaurantId}`
    );
    restaurantAlerts.forEach(id => matchedAlerts.add(id));

    // Match by neighborhood
    const neighborhoodAlerts = await this.redis.smembers(
      `alerts:neighborhood:${slot.location.neighborhood}`
    );
    neighborhoodAlerts.forEach(id => matchedAlerts.add(id));

    // Filter by additional criteria
    const filteredAlerts: string[] = [];
    for (const alertId of matchedAlerts) {
      const alertData = await this.redis.get(`alert:${alertId}`);
      if (!alertData) continue;

      const alert: UserAlert = JSON.parse(alertData);

      // Check party size
      if (alert.preferences.partySizes &&
          !alert.preferences.partySizes.includes(slot.partySize)) {
        continue;
      }

      // Check time window
      if (alert.preferences.timeWindows) {
        const slotTime = moment(slot.dateTime);
        const matchesWindow = alert.preferences.timeWindows.some(window => {
          if (!window.dayOfWeek.includes(slotTime.day())) return false;

          const startTime = moment(window.startTime, 'HH:mm');
          const endTime = moment(window.endTime, 'HH:mm');
          const slotTimeOnly = moment(slotTime.format('HH:mm'), 'HH:mm');

          return slotTimeOnly.isBetween(startTime, endTime);
        });

        if (!matchesWindow) continue;
      }

      // Check discount
      if (alert.preferences.minDiscount &&
          (!slot.discount || slot.discount < alert.preferences.minDiscount)) {
        continue;
      }

      // Check slot type
      if (!alert.preferences.acceptWalkIn && slot.type === 'walk_in') continue;
      if (!alert.preferences.acceptBarSeating && slot.type === 'bar_seating') continue;

      filteredAlerts.push(alertId);
    }

    return filteredAlerts;
  }

  private shouldNotify(alert: UserAlert): boolean {
    if (!alert.active) return false;

    if (alert.frequency === 'instant') return true;

    if (!alert.lastNotified) return true;

    const hoursSinceLastNotification =
      (Date.now() - alert.lastNotified.getTime()) / 3600000;

    if (alert.frequency === 'hourly' && hoursSinceLastNotification >= 1) return true;
    if (alert.frequency === 'daily' && hoursSinceLastNotification >= 24) return true;

    return false;
  }

  private async sendNotification(userId: string, slot: LastMinuteSlot): Promise<void> {
    const userPreferences = await this.getUserNotificationPreferences(userId);

    const message = {
      title: 'Last-Minute Table Available!',
      body: `${slot.partySize} seats available at ${
        await this.getRestaurantName(slot.restaurantId)
      } on ${moment(slot.dateTime).format('MMM DD at h:mm A')}`,
      data: {
        slotId: slot.slotId,
        restaurantId: slot.restaurantId,
        dateTime: slot.dateTime,
        discount: slot.discount
      }
    };

    // Send through appropriate channels
    if (userPreferences.push) {
      await this.sendPushNotification(userId, message);
    }

    if (userPreferences.email) {
      await this.sendEmailNotification(userId, message);
    }

    if (userPreferences.sms) {
      await this.sendSMSNotification(userId, message);
    }

    if (userPreferences.inApp) {
      await this.sendInAppNotification(userId, message);
    }
  }

  private async getUserNotificationPreferences(userId: string): Promise<any> {
    // Get user notification preferences
    return {
      push: true,
      email: true,
      sms: false,
      inApp: true
    };
  }

  private async getRestaurantName(restaurantId: string): Promise<string> {
    // Fetch restaurant name
    return 'The French Laundry';
  }

  private async sendPushNotification(userId: string, message: any): Promise<void> {
    // Implementation for push notifications
    console.log(`Sending push to ${userId}:`, message);
  }

  private async sendEmailNotification(userId: string, message: any): Promise<void> {
    // Implementation for email notifications
    console.log(`Sending email to ${userId}:`, message);
  }

  private async sendSMSNotification(userId: string, message: any): Promise<void> {
    // Implementation for SMS notifications
    console.log(`Sending SMS to ${userId}:`, message);
  }

  private async sendInAppNotification(userId: string, message: any): Promise<void> {
    // Store in-app notification
    await this.redis.lpush(
      `user:${userId}:notifications`,
      JSON.stringify({
        ...message,
        timestamp: new Date(),
        read: false
      })
    );

    // Send through socket if connected
    this.io.to(`user:${userId}`).emit('notification', message);
  }

  async reserveLastMinuteSlot(
    slotId: string,
    userId: string
  ): Promise<{ success: boolean; confirmationCode?: string; error?: string }> {
    const slotData = await this.redis.get(`slot:${slotId}`);
    if (!slotData) {
      return { success: false, error: 'Slot not found' };
    }

    const slot: LastMinuteSlot = JSON.parse(slotData);

    if (slot.status !== 'available') {
      return { success: false, error: 'Slot no longer available' };
    }

    // Put slot on hold
    slot.status = 'hold';
    await this.redis.set(
      `slot:${slotId}`,
      JSON.stringify(slot),
      'EX',
      300 // 5 minute hold
    );

    // Create reservation
    const confirmationCode = await this.createReservation(slot, userId);

    // Mark slot as reserved
    slot.status = 'reserved';
    await this.redis.set(
      `slot:${slotId}`,
      JSON.stringify(slot),
      'EX',
      Math.floor((slot.dateTime.getTime() - Date.now()) / 1000)
    );

    // Remove from availability indexes
    await this.removeFromAvailabilityIndex(slot);

    // Emit update
    this.io.emit('lastMinuteSlot:reserved', {
      slotId,
      restaurantId: slot.restaurantId
    });

    return { success: true, confirmationCode };
  }

  private async createReservation(
    slot: LastMinuteSlot,
    userId: string
  ): Promise<string> {
    // Create actual reservation in the system
    const confirmationCode = `LM${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Store reservation details
    await this.redis.set(
      `reservation:${confirmationCode}`,
      JSON.stringify({
        userId,
        slotId: slot.slotId,
        restaurantId: slot.restaurantId,
        dateTime: slot.dateTime,
        partySize: slot.partySize,
        discount: slot.discount,
        type: 'last_minute',
        createdAt: new Date()
      }),
      'EX',
      86400 * 7 // 7 days
    );

    return confirmationCode;
  }

  private async removeFromAvailabilityIndex(slot: LastMinuteSlot): Promise<void> {
    const timeKey = moment(slot.dateTime).format('YYYY-MM-DD:HH');
    await this.redis.zrem(`availability:time:${timeKey}`, slot.slotId);
    await this.redis.zrem('availability:location', slot.slotId);
    await this.redis.srem(`availability:restaurant:${slot.restaurantId}`, slot.slotId);
    await this.redis.srem(`availability:type:${slot.type}`, slot.slotId);
  }

  private async expireSlot(slotId: string): Promise<void> {
    const slotData = await this.redis.get(`slot:${slotId}`);
    if (!slotData) return;

    const slot: LastMinuteSlot = JSON.parse(slotData);

    if (slot.status === 'available') {
      slot.status = 'expired';
      await this.removeFromAvailabilityIndex(slot);

      // Emit expiration event
      this.io.emit('lastMinuteSlot:expired', {
        slotId,
        restaurantId: slot.restaurantId
      });
    }

    await this.redis.del(`slot:${slotId}`);
  }

  private async cleanupExpiredSlots(): Promise<void> {
    // Clean up expired slots from all indexes
    const now = moment();
    for (let i = -24; i < 0; i++) {
      const timeKey = now.add(i, 'hours').format('YYYY-MM-DD:HH');
      await this.redis.del(`availability:time:${timeKey}`);
    }
  }

  private async getActiveRestaurants(): Promise<string[]> {
    // Get list of active restaurants
    // Mock implementation
    return ['rest_1', 'rest_2', 'rest_3'];
  }

  private async updateRealTimeAvailability(restaurantId: string): Promise<void> {
    // Update real-time availability for a restaurant
    const availability: RealTimeAvailability = {
      restaurantId,
      timestamp: new Date(),
      currentOccupancy: Math.floor(Math.random() * 100),
      maxOccupancy: 100,
      estimatedWaitTime: Math.floor(Math.random() * 60),
      acceptingWalkIns: Math.random() > 0.5,
      barSeatingAvailable: Math.random() > 0.3,
      communalTableAvailable: Math.random() > 0.7,
      nextAvailableTime: new Date(Date.now() + Math.random() * 7200000),
      turnoverRate: Math.random() * 5
    };

    await this.redis.set(
      `realtime:${restaurantId}`,
      JSON.stringify(availability),
      'EX',
      300 // 5 minutes
    );

    // Emit real-time update
    this.io.emit('realtime:update', availability);
  }

  async addToWaitlist(
    restaurantId: string,
    userId: string,
    preferences: Partial<WaitlistEntry>
  ): Promise<WaitlistEntry> {
    const entryId = `wait_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const position = await this.getNextWaitlistPosition(restaurantId);

    const entry: WaitlistEntry = {
      entryId,
      restaurantId,
      userId,
      partySize: preferences.partySize!,
      requestedTime: preferences.requestedTime!,
      flexibilityWindow: preferences.flexibilityWindow || 30,
      preferences: preferences.preferences || {},
      status: 'waiting',
      position,
      estimatedSeatTime: await this.estimateSeatTime(restaurantId, position),
      notificationsSent: [{
        type: 'initial',
        timestamp: new Date(),
        channel: 'push'
      }],
      joinedAt: new Date()
    };

    // Store waitlist entry
    await this.redis.set(
      `waitlist:${entryId}`,
      JSON.stringify(entry)
    );

    // Add to restaurant's waitlist
    await this.redis.zadd(
      `restaurant:${restaurantId}:waitlist`,
      position,
      entryId
    );

    // Send initial notification
    await this.sendWaitlistNotification(userId, entry, 'initial');

    // Queue for processing
    await this.waitlistQueue.add(
      'process-waitlist',
      { restaurantId },
      { delay: 60000 } // Check in 1 minute
    );

    return entry;
  }

  private async getNextWaitlistPosition(restaurantId: string): Promise<number> {
    const entries = await this.redis.zrange(
      `restaurant:${restaurantId}:waitlist`,
      -1,
      -1,
      'WITHSCORES'
    );

    if (entries.length === 0) return 1;
    return parseInt(entries[1]) + 1;
  }

  private async estimateSeatTime(
    restaurantId: string,
    position: number
  ): Promise<Date> {
    // Estimate based on average turnover time and position
    const avgTurnoverMinutes = 90;
    const estimatedMinutes = position * avgTurnoverMinutes * 0.7; // Some overlap
    return new Date(Date.now() + estimatedMinutes * 60000);
  }

  private async sendWaitlistNotification(
    userId: string,
    entry: WaitlistEntry,
    type: 'initial' | 'update' | 'available' | 'final'
  ): Promise<void> {
    let message: any = {};

    switch (type) {
      case 'initial':
        message = {
          title: 'Added to Waitlist',
          body: `You're #${entry.position} in line. Estimated wait: ${
            moment(entry.estimatedSeatTime).fromNow()
          }`
        };
        break;
      case 'update':
        message = {
          title: 'Waitlist Update',
          body: `You're now #${entry.position} in line`
        };
        break;
      case 'available':
        message = {
          title: 'Your Table is Ready!',
          body: 'Please confirm within 5 minutes'
        };
        break;
      case 'final':
        message = {
          title: 'Thanks for Waiting',
          body: 'Enjoy your meal!'
        };
        break;
    }

    await this.sendNotification(userId, message as any);
  }

  private async processWaitlist(restaurantId: string): Promise<void> {
    const entries = await this.redis.zrange(
      `restaurant:${restaurantId}:waitlist`,
      0,
      -1
    );

    for (const entryId of entries) {
      const entryData = await this.redis.get(`waitlist:${entryId}`);
      if (!entryData) continue;

      const entry: WaitlistEntry = JSON.parse(entryData);

      // Check for available slots matching preferences
      const availableSlot = await this.findSlotForWaitlistEntry(entry);

      if (availableSlot) {
        entry.status = 'notified';
        await this.sendWaitlistNotification(entry.userId, entry, 'available');
      }

      // Update position
      const newPosition = entries.indexOf(entryId) + 1;
      if (newPosition !== entry.position) {
        entry.position = newPosition;
        entry.estimatedSeatTime = await this.estimateSeatTime(restaurantId, newPosition);
        await this.sendWaitlistNotification(entry.userId, entry, 'update');
      }

      await this.redis.set(
        `waitlist:${entryId}`,
        JSON.stringify(entry)
      );
    }
  }

  private async findSlotForWaitlistEntry(
    entry: WaitlistEntry
  ): Promise<LastMinuteSlot | null> {
    const slots = await this.searchLastMinuteAvailability({
      dateTime: entry.requestedTime,
      partySize: entry.partySize
    });

    for (const slot of slots) {
      if (slot.restaurantId === entry.restaurantId &&
          slot.partySize >= entry.partySize) {
        return slot;
      }
    }

    return null;
  }

  private async checkWaitlistForSlot(slot: LastMinuteSlot): Promise<void> {
    const waitlistEntries = await this.redis.zrange(
      `restaurant:${slot.restaurantId}:waitlist`,
      0,
      -1
    );

    for (const entryId of waitlistEntries) {
      const entryData = await this.redis.get(`waitlist:${entryId}`);
      if (!entryData) continue;

      const entry: WaitlistEntry = JSON.parse(entryData);

      // Check if entry matches slot
      if (entry.partySize <= slot.partySize &&
          entry.status === 'waiting') {
        // Check time flexibility
        const requestedTime = moment(entry.requestedTime);
        const slotTime = moment(slot.dateTime);
        const diff = Math.abs(slotTime.diff(requestedTime, 'minutes'));

        if (diff <= entry.flexibilityWindow) {
          // Notify user about available slot
          entry.status = 'notified';
          await this.sendWaitlistNotification(entry.userId, entry, 'available');

          await this.redis.set(
            `waitlist:${entryId}`,
            JSON.stringify(entry)
          );

          // Give them priority to book
          break;
        }
      }
    }
  }
}