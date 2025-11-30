import { Service } from 'typedi';
import { Op } from 'sequelize';
import * as moment from 'moment-timezone';
import { Redis } from 'ioredis';
import Queue from 'bull';
import { Server as SocketServer } from 'socket.io';
import * as ml from 'ml-regression';

interface TransparentWaitlist {
  waitlistId: string;
  restaurantId: string;
  currentDate: Date;
  status: 'open' | 'closed' | 'paused';
  visibility: {
    showPosition: boolean;
    showEstimatedTime: boolean;
    showAheadCount: boolean;
    showAverageWait: boolean;
    showTableTurnover: boolean;
    anonymizeNames: boolean;
  };
  entries: WaitlistPosition[];
  statistics: {
    averageWaitTime: number;
    currentWaitTime: number;
    tablesAvailable: number;
    partiesWaiting: number;
    longestWait: number;
    shortestWait: number;
    accuracyScore: number; // How accurate estimates have been
  };
  predictions: {
    nextAvailable: Date;
    expectedClearTime: Date;
    rushPeriodEnd?: Date;
    confidenceLevel: number;
  };
}

interface WaitlistPosition {
  positionId: string;
  userId: string;
  displayName: string;
  position: number;
  partySize: number;
  joinedAt: Date;
  estimatedSeatTime: Date;
  actualSeatTime?: Date;
  status: 'waiting' | 'notified' | 'seated' | 'cancelled' | 'no_show';
  visibility: 'public' | 'private';
  preferences: {
    seatingArea?: string;
    specialRequests?: string[];
    accessibility?: boolean;
  };
  notifications: {
    positionUpdates: boolean;
    fiveMinuteWarning: boolean;
    tableReady: boolean;
  };
  history: {
    timestamp: Date;
    event: string;
    details?: any;
  }[];
}

interface WaitTimeModel {
  restaurantId: string;
  dayOfWeek: number;
  hourOfDay: number;
  partySize: number;
  features: {
    weatherCondition?: string;
    specialEvent?: boolean;
    holidayPeriod?: boolean;
    schoolVacation?: boolean;
    reservationCount: number;
    walkInRatio: number;
  };
  historicalWaitTimes: number[];
  accuracy: number;
}

interface RealTimeUpdate {
  updateId: string;
  waitlistId: string;
  timestamp: Date;
  type: 'position_change' | 'time_update' | 'table_ready' | 'system_update';
  affectedPositions: string[];
  message?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface FairnessMetrics {
  restaurantId: string;
  period: Date;
  metrics: {
    averageDeviationFromEstimate: number;
    skipRateByPartySize: Record<number, number>;
    vipPriorityPercentage: number;
    walkInVsReservation: {
      walkInWaitTime: number;
      reservationWaitTime: number;
    };
    cancellationRate: number;
    noShowRate: number;
    satisfactionScore?: number;
  };
  anomalies: {
    timestamp: Date;
    type: 'skip' | 'excessive_wait' | 'preferential_treatment';
    details: any;
  }[];
}

@Service()
export class WaitlistTransparencyService {
  private redis: Redis;
  private io: SocketServer;
  private updateQueue: Queue.Queue;
  private predictionQueue: Queue.Queue;
  private waitTimeModels: Map<string, any>;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.io = new SocketServer();
    this.updateQueue = new Queue('waitlist-updates', process.env.REDIS_URL!);
    this.predictionQueue = new Queue('waitlist-predictions', process.env.REDIS_URL!);
    this.waitTimeModels = new Map();

    this.setupQueueProcessors();
    this.initializeRealTimeUpdates();
    this.loadWaitTimeModels();
  }

  private setupQueueProcessors(): void {
    // Process real-time updates
    this.updateQueue.process(async (job) => {
      const { update } = job.data;
      return await this.processRealTimeUpdate(update);
    });

    // Process prediction updates
    this.predictionQueue.process(async (job) => {
      const { waitlistId } = job.data;
      return await this.updatePredictions(waitlistId);
    });
  }

  private initializeRealTimeUpdates(): void {
    // Update positions every 30 seconds
    setInterval(async () => {
      const activeWaitlists = await this.getActiveWaitlists();
      for (const waitlistId of activeWaitlists) {
        await this.recalculatePositions(waitlistId);
      }
    }, 30000);

    // Update predictions every 5 minutes
    setInterval(async () => {
      const activeWaitlists = await this.getActiveWaitlists();
      for (const waitlistId of activeWaitlists) {
        await this.predictionQueue.add('update-predictions', { waitlistId });
      }
    }, 300000);
  }

  private async loadWaitTimeModels(): Promise<void> {
    // Load pre-trained models for wait time prediction
    const restaurants = await this.getAllRestaurants();

    for (const restaurantId of restaurants) {
      const modelData = await this.redis.get(`model:waittime:${restaurantId}`);
      if (modelData) {
        this.waitTimeModels.set(restaurantId, JSON.parse(modelData));
      } else {
        // Train initial model
        await this.trainWaitTimeModel(restaurantId);
      }
    }
  }

  async createTransparentWaitlist(
    restaurantId: string,
    visibility: TransparentWaitlist['visibility']
  ): Promise<TransparentWaitlist> {
    const waitlistId = `twl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const waitlist: TransparentWaitlist = {
      waitlistId,
      restaurantId,
      currentDate: new Date(),
      status: 'open',
      visibility,
      entries: [],
      statistics: {
        averageWaitTime: 0,
        currentWaitTime: 0,
        tablesAvailable: await this.getAvailableTableCount(restaurantId),
        partiesWaiting: 0,
        longestWait: 0,
        shortestWait: 0,
        accuracyScore: 100
      },
      predictions: {
        nextAvailable: new Date(),
        expectedClearTime: new Date(),
        confidenceLevel: 0
      }
    };

    // Store waitlist
    await this.redis.set(
      `waitlist:transparent:${waitlistId}`,
      JSON.stringify(waitlist)
    );

    // Set as active for restaurant
    await this.redis.set(
      `restaurant:${restaurantId}:active_waitlist`,
      waitlistId
    );

    // Initialize real-time room
    this.io.of(`/waitlist/${waitlistId}`);

    return waitlist;
  }

  async joinWaitlist(
    waitlistId: string,
    userId: string,
    partyDetails: {
      partySize: number;
      displayName: string;
      preferences?: WaitlistPosition['preferences'];
      notifications?: WaitlistPosition['notifications'];
    }
  ): Promise<WaitlistPosition> {
    const positionId = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const waitlist = await this.getWaitlist(waitlistId);
    const position = waitlist.entries.length + 1;
    const estimatedWaitTime = await this.estimateWaitTime(
      waitlist.restaurantId,
      partyDetails.partySize,
      position
    );

    const waitlistPosition: WaitlistPosition = {
      positionId,
      userId,
      displayName: waitlist.visibility.anonymizeNames
        ? this.anonymizeName(partyDetails.displayName)
        : partyDetails.displayName,
      position,
      partySize: partyDetails.partySize,
      joinedAt: new Date(),
      estimatedSeatTime: new Date(Date.now() + estimatedWaitTime * 60000),
      status: 'waiting',
      visibility: 'public',
      preferences: partyDetails.preferences || {},
      notifications: partyDetails.notifications || {
        positionUpdates: true,
        fiveMinuteWarning: true,
        tableReady: true
      },
      history: [{
        timestamp: new Date(),
        event: 'joined_waitlist',
        details: { initialPosition: position }
      }]
    };

    // Add to waitlist
    waitlist.entries.push(waitlistPosition);
    waitlist.statistics.partiesWaiting++;

    // Update statistics
    await this.updateWaitlistStatistics(waitlist);

    // Store updated waitlist
    await this.redis.set(
      `waitlist:transparent:${waitlistId}`,
      JSON.stringify(waitlist)
    );

    // Store individual position
    await this.redis.set(
      `position:${positionId}`,
      JSON.stringify(waitlistPosition),
      'EX',
      86400 // 24 hours
    );

    // Send real-time update
    this.broadcastUpdate(waitlistId, {
      updateId: `upd_${Date.now()}`,
      waitlistId,
      timestamp: new Date(),
      type: 'position_change',
      affectedPositions: [positionId],
      message: 'New party joined the waitlist',
      priority: 'low'
    });

    // Schedule notifications
    await this.scheduleNotifications(waitlistPosition);

    return waitlistPosition;
  }

  private anonymizeName(name: string): string {
    // Anonymize name while keeping it recognizable
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}. ${parts[parts.length - 1][0]}.`;
    }
    return `${name[0]}.`;
  }

  private async estimateWaitTime(
    restaurantId: string,
    partySize: number,
    position: number
  ): Promise<number> {
    const model = this.waitTimeModels.get(restaurantId);

    if (!model) {
      // Fallback to simple estimation
      return position * 15 * (1 + (partySize - 2) * 0.1);
    }

    // Use ML model for prediction
    const features = await this.extractFeatures(restaurantId, partySize);
    const prediction = model.predict([[
      position,
      partySize,
      new Date().getHours(),
      new Date().getDay(),
      ...Object.values(features)
    ]]);

    return Math.max(5, Math.round(prediction[0]));
  }

  private async extractFeatures(
    restaurantId: string,
    partySize: number
  ): Promise<any> {
    const now = new Date();

    return {
      reservationCount: await this.getReservationCount(restaurantId, now),
      walkInRatio: await this.getWalkInRatio(restaurantId),
      weatherCondition: await this.getWeatherCondition(),
      specialEvent: await this.hasSpecialEvent(restaurantId, now),
      holidayPeriod: this.isHolidayPeriod(now),
      schoolVacation: this.isSchoolVacation(now)
    };
  }

  async updatePosition(
    positionId: string,
    status: WaitlistPosition['status']
  ): Promise<void> {
    const positionData = await this.redis.get(`position:${positionId}`);
    if (!positionData) return;

    const position: WaitlistPosition = JSON.parse(positionData);
    position.status = status;

    if (status === 'seated') {
      position.actualSeatTime = new Date();
    }

    // Add to history
    position.history.push({
      timestamp: new Date(),
      event: `status_changed_to_${status}`
    });

    // Update position
    await this.redis.set(
      `position:${positionId}`,
      JSON.stringify(position),
      'EX',
      86400
    );

    // Update waitlist
    const waitlistId = await this.findWaitlistForPosition(positionId);
    if (waitlistId) {
      const waitlist = await this.getWaitlist(waitlistId);
      const entry = waitlist.entries.find(e => e.positionId === positionId);
      if (entry) {
        Object.assign(entry, position);

        // Recalculate positions if someone left
        if (status === 'cancelled' || status === 'no_show') {
          await this.recalculatePositions(waitlistId);
        }

        // Update accuracy score if seated
        if (status === 'seated' && position.actualSeatTime) {
          await this.updateAccuracyScore(waitlist, position);
        }

        await this.redis.set(
          `waitlist:transparent:${waitlistId}`,
          JSON.stringify(waitlist)
        );

        // Broadcast update
        this.broadcastUpdate(waitlistId, {
          updateId: `upd_${Date.now()}`,
          waitlistId,
          timestamp: new Date(),
          type: status === 'seated' ? 'table_ready' : 'position_change',
          affectedPositions: [positionId],
          priority: status === 'seated' ? 'high' : 'medium'
        });
      }
    }
  }

  private async recalculatePositions(waitlistId: string): Promise<void> {
    const waitlist = await this.getWaitlist(waitlistId);

    // Filter active entries
    const activeEntries = waitlist.entries.filter(
      e => e.status === 'waiting' || e.status === 'notified'
    );

    // Update positions
    activeEntries.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

    const positionChanges: string[] = [];
    activeEntries.forEach((entry, index) => {
      const newPosition = index + 1;
      if (entry.position !== newPosition) {
        entry.position = newPosition;
        positionChanges.push(entry.positionId);

        // Recalculate estimated time
        this.estimateWaitTime(
          waitlist.restaurantId,
          entry.partySize,
          newPosition
        ).then(waitTime => {
          entry.estimatedSeatTime = new Date(Date.now() + waitTime * 60000);
        });

        // Add to history
        entry.history.push({
          timestamp: new Date(),
          event: 'position_updated',
          details: { newPosition }
        });
      }
    });

    // Update waitlist
    waitlist.entries = [
      ...activeEntries,
      ...waitlist.entries.filter(e =>
        e.status !== 'waiting' && e.status !== 'notified'
      )
    ];

    await this.updateWaitlistStatistics(waitlist);

    await this.redis.set(
      `waitlist:transparent:${waitlistId}`,
      JSON.stringify(waitlist)
    );

    // Broadcast if changes occurred
    if (positionChanges.length > 0) {
      this.broadcastUpdate(waitlistId, {
        updateId: `upd_${Date.now()}`,
        waitlistId,
        timestamp: new Date(),
        type: 'position_change',
        affectedPositions: positionChanges,
        message: 'Positions have been updated',
        priority: 'medium'
      });

      // Notify affected users
      for (const positionId of positionChanges) {
        const position = activeEntries.find(e => e.positionId === positionId);
        if (position && position.notifications.positionUpdates) {
          await this.sendPositionUpdateNotification(position);
        }
      }
    }
  }

  private async updateWaitlistStatistics(waitlist: TransparentWaitlist): Promise<void> {
    const activeEntries = waitlist.entries.filter(
      e => e.status === 'waiting' || e.status === 'notified'
    );

    if (activeEntries.length === 0) {
      waitlist.statistics = {
        ...waitlist.statistics,
        averageWaitTime: 0,
        currentWaitTime: 0,
        partiesWaiting: 0,
        longestWait: 0,
        shortestWait: 0
      };
      return;
    }

    const waitTimes = activeEntries.map(e => {
      const wait = e.estimatedSeatTime.getTime() - e.joinedAt.getTime();
      return wait / 60000; // Convert to minutes
    });

    waitlist.statistics = {
      ...waitlist.statistics,
      averageWaitTime: waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length,
      currentWaitTime: waitTimes[0] || 0,
      partiesWaiting: activeEntries.length,
      longestWait: Math.max(...waitTimes),
      shortestWait: Math.min(...waitTimes)
    };
  }

  private async updateAccuracyScore(
    waitlist: TransparentWaitlist,
    position: WaitlistPosition
  ): Promise<void> {
    if (!position.actualSeatTime) return;

    const estimatedWait = position.estimatedSeatTime.getTime() - position.joinedAt.getTime();
    const actualWait = position.actualSeatTime.getTime() - position.joinedAt.getTime();
    const deviation = Math.abs(estimatedWait - actualWait) / estimatedWait;

    // Update accuracy score (weighted average)
    const weight = 0.9; // Give more weight to recent estimates
    waitlist.statistics.accuracyScore =
      waitlist.statistics.accuracyScore * weight +
      (1 - deviation) * 100 * (1 - weight);

    // Store for model training
    await this.storeWaitTimeData(waitlist.restaurantId, {
      partySize: position.partySize,
      position: position.position,
      estimatedWait: estimatedWait / 60000,
      actualWait: actualWait / 60000,
      timestamp: new Date()
    });
  }

  async getPublicWaitlistView(waitlistId: string): Promise<{
    waitlist: Partial<TransparentWaitlist>;
    userPosition?: WaitlistPosition;
  }> {
    const waitlist = await this.getWaitlist(waitlistId);

    // Filter based on visibility settings
    const publicView: Partial<TransparentWaitlist> = {
      waitlistId: waitlist.waitlistId,
      restaurantId: waitlist.restaurantId,
      status: waitlist.status,
      statistics: {}
    };

    if (waitlist.visibility.showPosition) {
      publicView.entries = waitlist.entries
        .filter(e => e.visibility === 'public' &&
                     (e.status === 'waiting' || e.status === 'notified'))
        .map(e => ({
          ...e,
          userId: undefined, // Hide user ID
          displayName: waitlist.visibility.anonymizeNames
            ? this.anonymizeName(e.displayName)
            : e.displayName
        })) as WaitlistPosition[];
    }

    if (waitlist.visibility.showEstimatedTime) {
      publicView.statistics!.averageWaitTime = waitlist.statistics.averageWaitTime;
      publicView.statistics!.currentWaitTime = waitlist.statistics.currentWaitTime;
    }

    if (waitlist.visibility.showAheadCount) {
      publicView.statistics!.partiesWaiting = waitlist.statistics.partiesWaiting;
    }

    if (waitlist.visibility.showAverageWait) {
      publicView.statistics!.averageWaitTime = waitlist.statistics.averageWaitTime;
      publicView.statistics!.longestWait = waitlist.statistics.longestWait;
      publicView.statistics!.shortestWait = waitlist.statistics.shortestWait;
    }

    if (waitlist.visibility.showTableTurnover) {
      publicView.predictions = waitlist.predictions;
    }

    return { waitlist: publicView };
  }

  async getUserWaitlistPosition(
    userId: string,
    waitlistId: string
  ): Promise<WaitlistPosition | null> {
    const waitlist = await this.getWaitlist(waitlistId);
    return waitlist.entries.find(e => e.userId === userId) || null;
  }

  private async getWaitlist(waitlistId: string): Promise<TransparentWaitlist> {
    const data = await this.redis.get(`waitlist:transparent:${waitlistId}`);
    return JSON.parse(data!);
  }

  private async findWaitlistForPosition(positionId: string): Promise<string | null> {
    // Search for waitlist containing this position
    const waitlists = await this.getActiveWaitlists();

    for (const waitlistId of waitlists) {
      const waitlist = await this.getWaitlist(waitlistId);
      if (waitlist.entries.find(e => e.positionId === positionId)) {
        return waitlistId;
      }
    }

    return null;
  }

  private async getActiveWaitlists(): Promise<string[]> {
    const keys = await this.redis.keys('waitlist:transparent:*');
    const waitlistIds: string[] = [];

    for (const key of keys) {
      const waitlistId = key.split(':')[2];
      const data = await this.redis.get(key);
      if (data) {
        const waitlist = JSON.parse(data);
        if (waitlist.status === 'open') {
          waitlistIds.push(waitlistId);
        }
      }
    }

    return waitlistIds;
  }

  private broadcastUpdate(waitlistId: string, update: RealTimeUpdate): void {
    // Broadcast to all connected clients
    this.io.of(`/waitlist/${waitlistId}`).emit('update', update);

    // Store update for history
    this.redis.lpush(
      `waitlist:${waitlistId}:updates`,
      JSON.stringify(update)
    );
  }

  private async scheduleNotifications(position: WaitlistPosition): Promise<void> {
    if (!position.notifications.fiveMinuteWarning) return;

    const warningTime = position.estimatedSeatTime.getTime() - 5 * 60000;
    const delay = warningTime - Date.now();

    if (delay > 0) {
      setTimeout(async () => {
        await this.sendFiveMinuteWarning(position);
      }, delay);
    }
  }

  private async sendPositionUpdateNotification(position: WaitlistPosition): Promise<void> {
    // Send notification about position change
    console.log(`Position update for ${position.userId}: Now #${position.position}`);
  }

  private async sendFiveMinuteWarning(position: WaitlistPosition): Promise<void> {
    // Send 5-minute warning notification
    console.log(`5-minute warning for ${position.userId}`);
  }

  private async processRealTimeUpdate(update: RealTimeUpdate): Promise<void> {
    // Process and broadcast real-time updates
    this.broadcastUpdate(update.waitlistId, update);
  }

  private async updatePredictions(waitlistId: string): Promise<void> {
    const waitlist = await this.getWaitlist(waitlistId);

    // Calculate predictions based on current state
    const activeEntries = waitlist.entries.filter(
      e => e.status === 'waiting' || e.status === 'notified'
    );

    if (activeEntries.length === 0) {
      waitlist.predictions = {
        nextAvailable: new Date(),
        expectedClearTime: new Date(),
        confidenceLevel: 100
      };
    } else {
      // Predict next available time
      const nextEntry = activeEntries[0];
      waitlist.predictions.nextAvailable = nextEntry.estimatedSeatTime;

      // Predict when waitlist will clear
      const lastEntry = activeEntries[activeEntries.length - 1];
      waitlist.predictions.expectedClearTime = lastEntry.estimatedSeatTime;

      // Calculate confidence based on accuracy score
      waitlist.predictions.confidenceLevel = waitlist.statistics.accuracyScore;

      // Check for rush period
      const currentHour = new Date().getHours();
      if (currentHour >= 18 && currentHour <= 21) {
        waitlist.predictions.rushPeriodEnd = new Date();
        waitlist.predictions.rushPeriodEnd.setHours(21, 30);
      }
    }

    await this.redis.set(
      `waitlist:transparent:${waitlistId}`,
      JSON.stringify(waitlist)
    );

    // Broadcast prediction update
    this.broadcastUpdate(waitlistId, {
      updateId: `upd_${Date.now()}`,
      waitlistId,
      timestamp: new Date(),
      type: 'system_update',
      affectedPositions: [],
      message: 'Predictions updated',
      priority: 'low'
    });
  }

  async generateFairnessReport(
    restaurantId: string,
    period: Date
  ): Promise<FairnessMetrics> {
    const metrics: FairnessMetrics = {
      restaurantId,
      period,
      metrics: {
        averageDeviationFromEstimate: 0,
        skipRateByPartySize: {},
        vipPriorityPercentage: 0,
        walkInVsReservation: {
          walkInWaitTime: 0,
          reservationWaitTime: 0
        },
        cancellationRate: 0,
        noShowRate: 0
      },
      anomalies: []
    };

    // Analyze historical data
    const historicalData = await this.getHistoricalWaitlistData(restaurantId, period);

    // Calculate metrics
    metrics.metrics = await this.calculateFairnessMetrics(historicalData);

    // Detect anomalies
    metrics.anomalies = await this.detectAnomalies(historicalData);

    // Store report
    await this.redis.set(
      `fairness:${restaurantId}:${period.toISOString()}`,
      JSON.stringify(metrics),
      'EX',
      86400 * 30
    );

    return metrics;
  }

  private async trainWaitTimeModel(restaurantId: string): Promise<void> {
    // Train ML model for wait time prediction
    const historicalData = await this.getHistoricalWaitTimeData(restaurantId);

    if (historicalData.length < 100) {
      // Not enough data for training
      return;
    }

    // Prepare features and labels
    const features = historicalData.map(d => [
      d.position,
      d.partySize,
      d.hourOfDay,
      d.dayOfWeek,
      d.reservationCount,
      d.walkInRatio
    ]);

    const labels = historicalData.map(d => d.actualWait);

    // Train regression model
    const regression = new ml.MultivariateLinearRegression(features, labels);

    // Store model
    this.waitTimeModels.set(restaurantId, regression);
    await this.redis.set(
      `model:waittime:${restaurantId}`,
      JSON.stringify(regression),
      'EX',
      86400 * 7
    );
  }

  // Helper methods (simplified implementations)
  private async getAvailableTableCount(restaurantId: string): Promise<number> {
    return 10;
  }

  private async getAllRestaurants(): Promise<string[]> {
    return ['rest_1', 'rest_2', 'rest_3'];
  }

  private async getReservationCount(restaurantId: string, date: Date): Promise<number> {
    return Math.floor(Math.random() * 50);
  }

  private async getWalkInRatio(restaurantId: string): Promise<number> {
    return 0.3;
  }

  private async getWeatherCondition(): Promise<string> {
    return 'sunny';
  }

  private async hasSpecialEvent(restaurantId: string, date: Date): Promise<boolean> {
    return false;
  }

  private isHolidayPeriod(date: Date): boolean {
    return false;
  }

  private isSchoolVacation(date: Date): boolean {
    return false;
  }

  private async storeWaitTimeData(restaurantId: string, data: any): Promise<void> {
    await this.redis.lpush(
      `waittime:data:${restaurantId}`,
      JSON.stringify(data)
    );
  }

  private async getHistoricalWaitlistData(
    restaurantId: string,
    period: Date
  ): Promise<any[]> {
    return [];
  }

  private async calculateFairnessMetrics(data: any[]): Promise<FairnessMetrics['metrics']> {
    return {
      averageDeviationFromEstimate: 5,
      skipRateByPartySize: { 2: 0.05, 4: 0.08, 6: 0.12 },
      vipPriorityPercentage: 10,
      walkInVsReservation: {
        walkInWaitTime: 45,
        reservationWaitTime: 30
      },
      cancellationRate: 15,
      noShowRate: 8
    };
  }

  private async detectAnomalies(data: any[]): Promise<FairnessMetrics['anomalies']> {
    return [];
  }

  private async getHistoricalWaitTimeData(restaurantId: string): Promise<any[]> {
    return [];
  }
}