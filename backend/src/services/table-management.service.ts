import { EventEmitter } from 'events';
import { Table, Restaurant, Reservation, TableSection, FloorPlan } from '../models';
import { Op, Transaction } from 'sequelize';
import { redis } from '../config/redis';
import { websocketService } from './websocket.service';
import { logger } from '../utils/logger';

interface TablePosition {
  x: number;
  y: number;
  rotation: number;
}

interface TableShape {
  type: 'rectangle' | 'circle' | 'square' | 'ellipse' | 'custom';
  width: number;
  height: number;
  seats: number[];
}

interface FloorPlanElement {
  id: string;
  type: 'table' | 'wall' | 'bar' | 'entrance' | 'kitchen' | 'restroom' | 'waiting' | 'decoration';
  position: TablePosition;
  shape?: TableShape;
  metadata?: any;
}

interface TableAvailability {
  tableId: string;
  available: boolean;
  nextAvailable?: Date;
  currentReservation?: any;
  estimatedEndTime?: Date;
}

interface TableCombination {
  tables: string[];
  totalCapacity: number;
  configuration: 'linear' | 'cluster' | 'custom';
}

interface ServerSection {
  id: string;
  name: string;
  serverId: string;
  tables: string[];
  maxCovers: number;
  currentCovers: number;
}

export class TableManagementService extends EventEmitter {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly TURN_TIME_BUFFER = 15; // minutes between reservations
  private floorPlanCache: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeRealtimeSync();
  }

  // Floor Plan Management
  async createFloorPlan(restaurantId: string, data: any): Promise<FloorPlan> {
    const floorPlan = await FloorPlan.create({
      restaurantId,
      name: data.name,
      isActive: data.isActive || false,
      elements: data.elements || [],
      sections: data.sections || [],
      metadata: {
        gridSize: data.gridSize || 20,
        snapToGrid: data.snapToGrid !== false,
        dimensions: data.dimensions || { width: 1000, height: 800 },
        background: data.background,
        createdBy: data.userId,
        version: 1
      }
    });

    // Create tables from floor plan
    if (data.elements) {
      await this.createTablesFromFloorPlan(restaurantId, floorPlan.id, data.elements);
    }

    this.clearFloorPlanCache(restaurantId);
    this.emitFloorPlanUpdate(restaurantId, floorPlan);

    return floorPlan;
  }

  async updateFloorPlan(floorPlanId: string, updates: any): Promise<FloorPlan> {
    const floorPlan = await FloorPlan.findByPk(floorPlanId);
    if (!floorPlan) {
      throw new Error('Floor plan not found');
    }

    // Version control for concurrent edits
    const currentVersion = floorPlan.metadata?.version || 1;
    if (updates.version && updates.version !== currentVersion) {
      throw new Error('Floor plan has been modified by another user');
    }

    floorPlan.elements = updates.elements || floorPlan.elements;
    floorPlan.sections = updates.sections || floorPlan.sections;
    floorPlan.metadata = {
      ...floorPlan.metadata,
      ...updates.metadata,
      version: currentVersion + 1,
      lastModified: new Date(),
      modifiedBy: updates.userId
    };

    await floorPlan.save();

    // Update tables if elements changed
    if (updates.elements) {
      await this.syncTablesWithFloorPlan(floorPlan.restaurantId, floorPlanId, updates.elements);
    }

    this.clearFloorPlanCache(floorPlan.restaurantId);
    this.emitFloorPlanUpdate(floorPlan.restaurantId, floorPlan);

    return floorPlan;
  }

  private async createTablesFromFloorPlan(
    restaurantId: string,
    floorPlanId: string,
    elements: FloorPlanElement[]
  ): Promise<void> {
    const tableElements = elements.filter(el => el.type === 'table');

    for (const element of tableElements) {
      await Table.create({
        restaurantId,
        floorPlanId,
        tableNumber: element.id,
        capacity: element.shape?.seats.reduce((a, b) => a + b, 0) || 2,
        position: element.position,
        shape: element.shape,
        status: 'available',
        isActive: true,
        metadata: element.metadata
      });
    }
  }

  private async syncTablesWithFloorPlan(
    restaurantId: string,
    floorPlanId: string,
    elements: FloorPlanElement[]
  ): Promise<void> {
    const tableElements = elements.filter(el => el.type === 'table');
    const existingTables = await Table.findAll({
      where: { restaurantId, floorPlanId }
    });

    const existingIds = new Set(existingTables.map(t => t.tableNumber));
    const newIds = new Set(tableElements.map(el => el.id));

    // Delete removed tables
    const toDelete = existingTables.filter(t => !newIds.has(t.tableNumber));
    for (const table of toDelete) {
      await table.update({ isActive: false, deletedAt: new Date() });
    }

    // Update or create tables
    for (const element of tableElements) {
      const existing = existingTables.find(t => t.tableNumber === element.id);

      if (existing) {
        await existing.update({
          position: element.position,
          shape: element.shape,
          capacity: element.shape?.seats.reduce((a, b) => a + b, 0) || existing.capacity
        });
      } else {
        await Table.create({
          restaurantId,
          floorPlanId,
          tableNumber: element.id,
          capacity: element.shape?.seats.reduce((a, b) => a + b, 0) || 2,
          position: element.position,
          shape: element.shape,
          status: 'available',
          isActive: true
        });
      }
    }
  }

  // Real-time Table Status
  async getTableAvailability(
    restaurantId: string,
    date: Date,
    time: string,
    partySize: number,
    duration?: number
  ): Promise<TableAvailability[]> {
    const cacheKey = `availability:${restaurantId}:${date.toISOString()}:${time}:${partySize}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const tables = await Table.findAll({
      where: {
        restaurantId,
        isActive: true,
        capacity: { [Op.gte]: partySize }
      },
      order: [['capacity', 'ASC']]
    });

    const requestedDateTime = this.parseDateTime(date, time);
    const estimatedDuration = duration || this.getEstimatedDuration(partySize, restaurant.avgTurnTime);
    const endTime = new Date(requestedDateTime.getTime() + estimatedDuration * 60000);

    const reservations = await Reservation.findAll({
      where: {
        restaurantId,
        date: date,
        status: { [Op.in]: ['confirmed', 'seated'] },
        [Op.or]: [
          {
            startTime: {
              [Op.between]: [requestedDateTime, endTime]
            }
          },
          {
            estimatedEndTime: {
              [Op.between]: [requestedDateTime, endTime]
            }
          }
        ]
      },
      include: ['Table']
    });

    const occupiedTables = new Set(reservations.map(r => r.tableId));

    const availability: TableAvailability[] = tables.map(table => {
      const isOccupied = occupiedTables.has(table.id);
      const reservation = reservations.find(r => r.tableId === table.id);

      return {
        tableId: table.id,
        available: !isOccupied,
        nextAvailable: reservation ? reservation.estimatedEndTime : undefined,
        currentReservation: reservation ? {
          id: reservation.id,
          guestName: reservation.guestName,
          partySize: reservation.partySize,
          startTime: reservation.startTime,
          estimatedEndTime: reservation.estimatedEndTime
        } : undefined,
        estimatedEndTime: reservation?.estimatedEndTime
      };
    });

    // Check for table combinations if no single table available
    if (!availability.some(a => a.available)) {
      const combinations = await this.findTableCombinations(tables, partySize, occupiedTables);
      if (combinations.length > 0) {
        // Add combination options to availability
        combinations.forEach(combo => {
          availability.push({
            tableId: combo.tables.join('+'),
            available: true,
            nextAvailable: undefined,
            currentReservation: undefined,
            estimatedEndTime: undefined
          });
        });
      }
    }

    await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(availability));

    return availability;
  }

  async updateTableStatus(
    tableId: string,
    status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance',
    metadata?: any
  ): Promise<Table> {
    const table = await Table.findByPk(tableId);
    if (!table) {
      throw new Error('Table not found');
    }

    const previousStatus = table.status;
    table.status = status;
    table.lastStatusChange = new Date();

    if (metadata) {
      table.metadata = { ...table.metadata, ...metadata };
    }

    // Track status duration for analytics
    if (previousStatus !== status) {
      await this.trackStatusDuration(table.id, previousStatus, table.lastStatusChange);
    }

    await table.save();

    // Real-time update
    this.emitTableStatusUpdate(table.restaurantId, {
      tableId: table.id,
      tableNumber: table.tableNumber,
      status,
      previousStatus,
      timestamp: new Date()
    });

    // Clear related caches
    await this.clearTableCache(table.restaurantId);

    return table;
  }

  // Table Combination Logic
  async findTableCombinations(
    tables: Table[],
    partySize: number,
    occupiedTables: Set<string>
  ): Promise<TableCombination[]> {
    const availableTables = tables.filter(t => !occupiedTables.has(t.id));
    const combinations: TableCombination[] = [];

    // Try to find adjacent tables
    for (let i = 0; i < availableTables.length; i++) {
      for (let j = i + 1; j < availableTables.length; j++) {
        const table1 = availableTables[i];
        const table2 = availableTables[j];

        if (this.areTablesAdjacent(table1, table2)) {
          const totalCapacity = table1.capacity + table2.capacity;

          if (totalCapacity >= partySize && totalCapacity <= partySize + 2) {
            combinations.push({
              tables: [table1.id, table2.id],
              totalCapacity,
              configuration: 'linear'
            });
          }

          // Try adding a third table for larger parties
          if (totalCapacity < partySize) {
            for (let k = j + 1; k < availableTables.length; k++) {
              const table3 = availableTables[k];
              if (this.areTablesAdjacent(table2, table3) || this.areTablesAdjacent(table1, table3)) {
                const tripleCapacity = totalCapacity + table3.capacity;
                if (tripleCapacity >= partySize && tripleCapacity <= partySize + 3) {
                  combinations.push({
                    tables: [table1.id, table2.id, table3.id],
                    totalCapacity: tripleCapacity,
                    configuration: 'cluster'
                  });
                }
              }
            }
          }
        }
      }
    }

    return combinations.sort((a, b) => a.totalCapacity - b.totalCapacity);
  }

  private areTablesAdjacent(table1: Table, table2: Table): boolean {
    if (!table1.position || !table2.position) return false;

    const distance = Math.sqrt(
      Math.pow(table1.position.x - table2.position.x, 2) +
      Math.pow(table1.position.y - table2.position.y, 2)
    );

    // Tables are adjacent if within 100 pixels
    return distance < 100;
  }

  async combineTablesForReservation(
    reservationId: string,
    tableIds: string[]
  ): Promise<void> {
    const transaction = await Table.sequelize!.transaction();

    try {
      const reservation = await Reservation.findByPk(reservationId, { transaction });
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      const tables = await Table.findAll({
        where: { id: tableIds },
        transaction
      });

      if (tables.length !== tableIds.length) {
        throw new Error('One or more tables not found');
      }

      // Update reservation with combined tables
      reservation.tableId = tables[0].id; // Primary table
      reservation.combinedTables = tableIds;
      await reservation.save({ transaction });

      // Update all tables status
      for (const table of tables) {
        await table.update({
          status: 'occupied',
          currentReservationId: reservationId,
          combinedWith: tableIds.filter(id => id !== table.id)
        }, { transaction });
      }

      await transaction.commit();

      // Notify real-time updates
      this.emitTablesCombined(reservation.restaurantId, {
        reservationId,
        tableIds,
        timestamp: new Date()
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Server Section Management
  async assignServerSection(
    restaurantId: string,
    serverId: string,
    sectionData: any
  ): Promise<ServerSection> {
    const section: ServerSection = {
      id: `section_${Date.now()}`,
      name: sectionData.name,
      serverId,
      tables: sectionData.tableIds,
      maxCovers: sectionData.maxCovers || 40,
      currentCovers: 0
    };

    // Update tables with server assignment
    await Table.update(
      {
        serverId,
        sectionId: section.id
      },
      {
        where: {
          id: sectionData.tableIds,
          restaurantId
        }
      }
    );

    // Store section in Redis for quick access
    await redis.hset(
      `sections:${restaurantId}`,
      section.id,
      JSON.stringify(section)
    );

    // Calculate current covers
    const reservations = await Reservation.count({
      where: {
        tableId: sectionData.tableIds,
        status: 'seated',
        date: new Date()
      }
    });

    section.currentCovers = reservations;

    this.emitSectionUpdate(restaurantId, section);

    return section;
  }

  async getServerWorkload(restaurantId: string, serverId: string): Promise<any> {
    const sections = await redis.hgetall(`sections:${restaurantId}`);
    const serverSections = Object.values(sections)
      .map(s => JSON.parse(s))
      .filter((s: ServerSection) => s.serverId === serverId);

    const tables = await Table.findAll({
      where: {
        restaurantId,
        serverId
      },
      include: [{
        model: Reservation,
        as: 'currentReservation',
        where: {
          status: 'seated',
          date: new Date()
        },
        required: false
      }]
    });

    const workload = {
      serverId,
      sections: serverSections,
      totalTables: tables.length,
      occupiedTables: tables.filter(t => t.currentReservation).length,
      totalCovers: tables.reduce((sum, t) =>
        sum + (t.currentReservation?.partySize || 0), 0
      ),
      utilization: 0
    };

    const maxCovers = serverSections.reduce((sum, s) => sum + s.maxCovers, 0);
    workload.utilization = maxCovers > 0 ? (workload.totalCovers / maxCovers) * 100 : 0;

    return workload;
  }

  // Turn Time Analytics
  async calculateAverageTurnTime(restaurantId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    const startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const reservations = await Reservation.findAll({
      where: {
        restaurantId,
        status: 'completed',
        actualEndTime: { [Op.ne]: null },
        createdAt: { [Op.gte]: startDate }
      },
      attributes: ['partySize', 'startTime', 'actualEndTime', 'dayOfWeek', 'mealPeriod']
    });

    const turnTimes = reservations.map(r => ({
      duration: (r.actualEndTime.getTime() - r.startTime.getTime()) / 60000, // minutes
      partySize: r.partySize,
      dayOfWeek: r.dayOfWeek,
      mealPeriod: r.mealPeriod
    }));

    // Calculate averages by different dimensions
    const byPartySize: any = {};
    const byDayOfWeek: any = {};
    const byMealPeriod: any = {};

    turnTimes.forEach(tt => {
      // By party size
      if (!byPartySize[tt.partySize]) {
        byPartySize[tt.partySize] = [];
      }
      byPartySize[tt.partySize].push(tt.duration);

      // By day of week
      if (!byDayOfWeek[tt.dayOfWeek]) {
        byDayOfWeek[tt.dayOfWeek] = [];
      }
      byDayOfWeek[tt.dayOfWeek].push(tt.duration);

      // By meal period
      if (!byMealPeriod[tt.mealPeriod]) {
        byMealPeriod[tt.mealPeriod] = [];
      }
      byMealPeriod[tt.mealPeriod].push(tt.duration);
    });

    const calculateAverage = (arr: number[]) =>
      arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      overall: calculateAverage(turnTimes.map(t => t.duration)),
      byPartySize: Object.entries(byPartySize).reduce((acc, [size, times]) => ({
        ...acc,
        [size]: calculateAverage(times as number[])
      }), {}),
      byDayOfWeek: Object.entries(byDayOfWeek).reduce((acc, [day, times]) => ({
        ...acc,
        [day]: calculateAverage(times as number[])
      }), {}),
      byMealPeriod: Object.entries(byMealPeriod).reduce((acc, [period, times]) => ({
        ...acc,
        [period]: calculateAverage(times as number[])
      }), {}),
      sampleSize: reservations.length
    };
  }

  private getEstimatedDuration(partySize: number, avgTurnTime?: number): number {
    // Default turn times in minutes
    const defaultTurnTimes: { [key: number]: number } = {
      1: 45,
      2: 60,
      3: 75,
      4: 90,
      5: 90,
      6: 105,
      7: 105,
      8: 120
    };

    if (avgTurnTime) {
      return avgTurnTime;
    }

    return defaultTurnTimes[Math.min(partySize, 8)] || 120;
  }

  // Waitlist Management
  async addToWaitlist(data: any): Promise<any> {
    const waitlistEntry = {
      id: `wait_${Date.now()}`,
      restaurantId: data.restaurantId,
      guestName: data.guestName,
      phoneNumber: data.phoneNumber,
      partySize: data.partySize,
      estimatedWait: this.calculateEstimatedWaitTime(data.restaurantId, data.partySize),
      preferredSeating: data.preferredSeating,
      notes: data.notes,
      status: 'waiting',
      addedAt: new Date(),
      position: await this.getWaitlistPosition(data.restaurantId)
    };

    // Store in Redis for real-time access
    await redis.zadd(
      `waitlist:${data.restaurantId}`,
      Date.now(),
      JSON.stringify(waitlistEntry)
    );

    // Send notification to guest
    if (data.phoneNumber) {
      await this.sendWaitlistNotification(waitlistEntry);
    }

    this.emitWaitlistUpdate(data.restaurantId, waitlistEntry);

    return waitlistEntry;
  }

  private async calculateEstimatedWaitTime(restaurantId: string, partySize: number): Promise<number> {
    // Get current waitlist
    const waitlist = await redis.zrange(`waitlist:${restaurantId}`, 0, -1);
    const waitlistSize = waitlist.length;

    // Get average turn time
    const avgTurnTime = await redis.get(`avg_turn_time:${restaurantId}:${partySize}`);
    const turnTime = avgTurnTime ? parseInt(avgTurnTime) : this.getEstimatedDuration(partySize);

    // Get available tables
    const tables = await Table.count({
      where: {
        restaurantId,
        capacity: { [Op.gte]: partySize },
        status: 'available'
      }
    });

    // Simple estimation: position in line * average turn time / number of suitable tables
    const estimatedWait = tables > 0
      ? (waitlistSize * turnTime) / tables
      : (waitlistSize + 1) * turnTime;

    return Math.round(estimatedWait);
  }

  private async getWaitlistPosition(restaurantId: string): Promise<number> {
    const count = await redis.zcard(`waitlist:${restaurantId}`);
    return count + 1;
  }

  // Real-time synchronization
  private initializeRealtimeSync(): void {
    // Subscribe to table updates from other services
    redis.subscribe('table:updates', (err, count) => {
      if (err) {
        logger.error('Failed to subscribe to table updates:', err);
      }
    });

    redis.on('message', (channel, message) => {
      if (channel === 'table:updates') {
        this.handleTableUpdate(JSON.parse(message));
      }
    });
  }

  private handleTableUpdate(update: any): void {
    // Process external table updates
    this.emit('externalUpdate', update);
  }

  private emitFloorPlanUpdate(restaurantId: string, floorPlan: any): void {
    websocketService.emitToRestaurant(restaurantId, 'floorPlan:update', floorPlan);
    redis.publish('table:updates', JSON.stringify({ type: 'floorPlan', restaurantId, floorPlan }));
  }

  private emitTableStatusUpdate(restaurantId: string, update: any): void {
    websocketService.emitToRestaurant(restaurantId, 'table:statusUpdate', update);
    redis.publish('table:updates', JSON.stringify({ type: 'status', restaurantId, ...update }));
  }

  private emitTablesCombined(restaurantId: string, data: any): void {
    websocketService.emitToRestaurant(restaurantId, 'tables:combined', data);
  }

  private emitSectionUpdate(restaurantId: string, section: any): void {
    websocketService.emitToRestaurant(restaurantId, 'section:update', section);
  }

  private emitWaitlistUpdate(restaurantId: string, entry: any): void {
    websocketService.emitToRestaurant(restaurantId, 'waitlist:update', entry);
  }

  private async sendWaitlistNotification(entry: any): Promise<void> {
    // Implementation would send SMS/notification to guest
    logger.info(`Sending waitlist notification to ${entry.phoneNumber}`);
  }

  private async trackStatusDuration(tableId: string, status: string, endTime: Date): Promise<void> {
    // Track how long table was in each status for analytics
    const key = `table_status_duration:${tableId}:${status}`;
    const startTime = await redis.get(`table_status_start:${tableId}`);

    if (startTime) {
      const duration = endTime.getTime() - parseInt(startTime);
      await redis.hincrby(`table_analytics:${tableId}`, `${status}_total`, duration);
      await redis.hincrby(`table_analytics:${tableId}`, `${status}_count`, 1);
    }

    await redis.set(`table_status_start:${tableId}`, endTime.getTime());
  }

  private clearFloorPlanCache(restaurantId: string): void {
    this.floorPlanCache.delete(restaurantId);
    redis.del(`floor_plan:${restaurantId}`);
  }

  private async clearTableCache(restaurantId: string): Promise<void> {
    const keys = await redis.keys(`availability:${restaurantId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  private parseDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

export const tableManagementService = new TableManagementService();