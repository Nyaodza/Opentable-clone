import { Table } from '../models/Table';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { NotFoundError, BadRequestError, ForbiddenError } from '../middleware/errorHandler';
import { cache, CACHE_KEYS } from '../config/redis';
import { logInfo } from '../utils/logger';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';

interface CreateTableData {
  restaurantId: string;
  tableNumber: string;
  capacity: number;
  minCapacity: number;
  location?: string;
  notes?: string;
  isActive?: boolean;
}

interface TableAvailability {
  tableId: string;
  tableNumber: string;
  capacity: number;
  location: string;
  isAvailable: boolean;
  nextAvailableTime?: string;
  currentReservation?: {
    id: string;
    guestName: string;
    partySize: number;
    startTime: string;
    endTime: string;
  };
}

export class TableService {
  /**
   * Create a new table
   */
  static async createTable(data: CreateTableData, userId: string, isAdmin: boolean): Promise<Table> {
    // Verify restaurant ownership
    const restaurant = await Restaurant.findByPk(data.restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }

    if (!isAdmin && restaurant.ownerId !== userId) {
      throw new ForbiddenError('You do not have permission to manage tables for this restaurant');
    }

    // Check if table number already exists
    const existingTable = await Table.findOne({
      where: {
        restaurantId: data.restaurantId,
        tableNumber: data.tableNumber
      }
    });

    if (existingTable) {
      throw new BadRequestError('Table number already exists in this restaurant');
    }

    // Create table
    const table = await Table.create(data);

    // Update restaurant total capacity
    await this.updateRestaurantCapacity(data.restaurantId);

    // Clear cache
    await cache.del(CACHE_KEYS.RESTAURANT(data.restaurantId));

    logInfo('Table created successfully', { tableId: table.id, restaurantId: data.restaurantId });

    return table;
  }

  /**
   * Update table
   */
  static async updateTable(
    tableId: string,
    data: Partial<CreateTableData>,
    userId: string,
    isAdmin: boolean
  ): Promise<Table> {
    const table = await Table.findByPk(tableId, {
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!table) {
      throw new NotFoundError('Table not found');
    }

    // Verify ownership
    if (!isAdmin && table.restaurant.ownerId !== userId) {
      throw new ForbiddenError('You do not have permission to manage this table');
    }

    // Check if new table number already exists
    if (data.tableNumber && data.tableNumber !== table.tableNumber) {
      const existingTable = await Table.findOne({
        where: {
          restaurantId: table.restaurantId,
          tableNumber: data.tableNumber,
          id: { [Op.ne]: tableId }
        }
      });

      if (existingTable) {
        throw new BadRequestError('Table number already exists in this restaurant');
      }
    }

    // Update table
    await table.update(data);

    // Update restaurant capacity if needed
    if (data.capacity !== undefined) {
      await this.updateRestaurantCapacity(table.restaurantId);
    }

    // Clear cache
    await cache.del(CACHE_KEYS.RESTAURANT(table.restaurantId));

    logInfo('Table updated successfully', { tableId });

    return table;
  }

  /**
   * Delete table
   */
  static async deleteTable(tableId: string, userId: string, isAdmin: boolean): Promise<void> {
    const table = await Table.findByPk(tableId, {
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!table) {
      throw new NotFoundError('Table not found');
    }

    // Verify ownership
    if (!isAdmin && table.restaurant.ownerId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this table');
    }

    // Check if table has active reservations
    const activeReservations = await Reservation.count({
      where: {
        tableId,
        status: { [Op.in]: ['confirmed', 'seated'] },
        dateTime: { [Op.gte]: new Date() }
      }
    });

    if (activeReservations > 0) {
      throw new BadRequestError('Cannot delete table with active reservations');
    }

    // Soft delete
    await table.update({ isActive: false });

    // Update restaurant capacity
    await this.updateRestaurantCapacity(table.restaurantId);

    // Clear cache
    await cache.del(CACHE_KEYS.RESTAURANT(table.restaurantId));

    logInfo('Table deleted successfully', { tableId });
  }

  /**
   * Get tables by restaurant
   */
  static async getTablesByRestaurant(restaurantId: string): Promise<Table[]> {
    return await Table.findAll({
      where: { restaurantId, isActive: true },
      order: [['tableNumber', 'ASC']]
    });
  }

  /**
   * Get table availability for a specific date/time
   */
  static async getTableAvailability(
    restaurantId: string,
    date: Date,
    duration: number = 120 // minutes
  ): Promise<TableAvailability[]> {
    const tables = await Table.findAll({
      where: { restaurantId, isActive: true },
      order: [['tableNumber', 'ASC']]
    });

    const endTime = new Date(date.getTime() + duration * 60000);

    // Get reservations that overlap with the requested time
    const reservations = await Reservation.findAll({
      where: {
        restaurantId,
        status: { [Op.in]: ['confirmed', 'seated'] },
        [Op.or]: [
          {
            dateTime: {
              [Op.between]: [date, endTime]
            }
          },
          {
            [Op.and]: [
              { dateTime: { [Op.lte]: date } },
              sequelize.literal(`"dateTime" + INTERVAL '${duration} minutes' >= '${date.toISOString()}'`)
            ]
          }
        ]
      },
      include: [
        {
          model: Table,
          as: 'table'
        }
      ]
    });

    // Map table availability
    const availability: TableAvailability[] = tables.map(table => {
      const reservation = reservations.find(r => r.tableId === table.id);
      
      const tableAvail: TableAvailability = {
        tableId: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        location: table.location,
        isAvailable: !reservation
      };

      if (reservation) {
        const resEndTime = new Date(reservation.dateTime.getTime() + duration * 60000);
        tableAvail.nextAvailableTime = resEndTime.toISOString();
        tableAvail.currentReservation = {
          id: reservation.id,
          guestName: `${reservation.guestInfo.firstName} ${reservation.guestInfo.lastName}`,
          partySize: reservation.partySize,
          startTime: reservation.dateTime.toISOString(),
          endTime: resEndTime.toISOString()
        };
      }

      return tableAvail;
    });

    return availability;
  }

  /**
   * Find best available table for party size
   */
  static async findBestTable(
    restaurantId: string,
    date: Date,
    partySize: number,
    duration: number = 120
  ): Promise<Table | null> {
    const availability = await this.getTableAvailability(restaurantId, date, duration);
    
    // Filter available tables that can accommodate the party
    const availableTables = availability
      .filter(a => a.isAvailable && a.capacity >= partySize)
      .sort((a, b) => {
        // Prefer tables that are closest to party size
        const aDiff = a.capacity - partySize;
        const bDiff = b.capacity - partySize;
        return aDiff - bDiff;
      });

    if (availableTables.length === 0) {
      return null;
    }

    // Return the best fitting table
    return await Table.findByPk(availableTables[0].tableId);
  }

  /**
   * Get table occupancy statistics
   */
  static async getTableOccupancy(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    tableId: string;
    tableNumber: string;
    totalReservations: number;
    occupancyRate: number;
    averagePartySize: number;
  }[]> {
    const tables = await Table.findAll({
      where: { restaurantId, isActive: true }
    });

    const reservations = await Reservation.findAll({
      where: {
        restaurantId,
        dateTime: {
          [Op.between]: [startDate, endDate]
        },
        status: 'completed'
      },
      attributes: [
        'tableId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('partySize')), 'avgPartySize']
      ],
      group: ['tableId']
    });

    // Calculate total possible slots
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const slotsPerDay = 10; // Assuming 10 time slots per day
    const totalSlots = totalDays * slotsPerDay;

    return tables.map(table => {
      const tableRes = reservations.find((r: any) => r.tableId === table.id);
      const resCount = tableRes ? parseInt(tableRes.get('count')) : 0;
      const avgParty = tableRes ? parseFloat(tableRes.get('avgPartySize')) : 0;

      return {
        tableId: table.id,
        tableNumber: table.tableNumber,
        totalReservations: resCount,
        occupancyRate: Math.round((resCount / totalSlots) * 100),
        averagePartySize: Math.round(avgParty * 10) / 10
      };
    });
  }

  /**
   * Update restaurant total capacity
   */
  private static async updateRestaurantCapacity(restaurantId: string): Promise<void> {
    const totalCapacity = await Table.sum('capacity', {
      where: { restaurantId, isActive: true }
    }) || 0;

    await Restaurant.update(
      { totalCapacity },
      { where: { id: restaurantId } }
    );

    logInfo('Restaurant capacity updated', { restaurantId, totalCapacity });
  }

  /**
   * Bulk update tables
   */
  static async bulkUpdateTables(
    restaurantId: string,
    userId: string,
    isAdmin: boolean,
    tables: Array<{
      id?: string;
      tableNumber: string;
      capacity: number;
      minCapacity: number;
      location?: string;
      notes?: string;
      isActive?: boolean;
    }>
  ): Promise<Table[]> {
    // Verify restaurant ownership
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }

    if (!isAdmin && restaurant.ownerId !== userId) {
      throw new ForbiddenError('You do not have permission to manage tables for this restaurant');
    }

    const transaction = await sequelize.transaction();

    try {
      // Get existing tables
      const existingTables = await Table.findAll({
        where: { restaurantId },
        transaction
      });

      const existingIds = existingTables.map(t => t.id);
      const updatedIds: string[] = [];

      // Process each table
      for (const tableData of tables) {
        if (tableData.id) {
          // Update existing table
          const table = existingTables.find(t => t.id === tableData.id);
          if (table) {
            await table.update(tableData, { transaction });
            updatedIds.push(tableData.id);
          }
        } else {
          // Create new table
          const newTable = await Table.create({
            ...tableData,
            restaurantId
          }, { transaction });
          updatedIds.push(newTable.id);
        }
      }

      // Deactivate tables not in the update list
      const tablesToDeactivate = existingIds.filter(id => !updatedIds.includes(id));
      if (tablesToDeactivate.length > 0) {
        await Table.update(
          { isActive: false },
          {
            where: { id: { [Op.in]: tablesToDeactivate } },
            transaction
          }
        );
      }

      await transaction.commit();

      // Update restaurant capacity
      await this.updateRestaurantCapacity(restaurantId);

      // Clear cache
      await cache.del(CACHE_KEYS.RESTAURANT(restaurantId));

      logInfo('Tables bulk updated successfully', { restaurantId, count: tables.length });

      // Return updated tables
      return await this.getTablesByRestaurant(restaurantId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}