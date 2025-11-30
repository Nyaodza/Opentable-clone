import { Request, Response, NextFunction } from 'express';
import { FloorPlan, TableAssignment } from '../models/FloorPlan';
import { Table } from '../models/Table';
import { Restaurant } from '../models/Restaurant';
import { Reservation, ReservationStatus } from '../models/Reservation';
import { AppError } from '../middleware/error.middleware';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

// Get all floor plans for a restaurant
export const getFloorPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;

    // Check if user owns this restaurant or is admin
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    if (restaurant.ownerId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('You can only manage your own restaurant floor plans', 403);
    }

    const floorPlans = await FloorPlan.findAll({
      where: { restaurantId },
      include: [{ model: Table, as: 'tables' }],
      order: [['isDefault', 'DESC'], ['createdAt', 'ASC']]
    });

    res.json({
      success: true,
      floorPlans
    });
  } catch (error) {
    next(error);
  }
};

// Create new floor plan
export const createFloorPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;
    const { name, description, width, height, layout, isDefault } = req.body;

    // Check if user owns this restaurant
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    if (restaurant.ownerId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('You can only create floor plans for your own restaurant', 403);
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await FloorPlan.update(
        { isDefault: false },
        { where: { restaurantId, isDefault: true } }
      );
    }

    const floorPlan = await FloorPlan.create({
      restaurantId,
      name,
      description,
      width: width || 800,
      height: height || 600,
      layout: layout || { tables: [], walls: [], fixtures: [], zones: [] },
      isDefault: isDefault || false
    });

    res.status(201).json({
      success: true,
      floorPlan
    });
  } catch (error) {
    next(error);
  }
};

// Update floor plan
export const updateFloorPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, width, height, layout, isDefault, isActive } = req.body;

    const floorPlan = await FloorPlan.findByPk(id, {
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!floorPlan) {
      throw new AppError('Floor plan not found', 404);
    }

    // Check ownership
    if (floorPlan.restaurant.ownerId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('You can only update your own restaurant floor plans', 403);
    }

    // If setting as default, unset other defaults
    if (isDefault && !floorPlan.isDefault) {
      await FloorPlan.update(
        { isDefault: false },
        { where: { restaurantId: floorPlan.restaurantId, isDefault: true } }
      );
    }

    await floorPlan.update({
      name: name || floorPlan.name,
      description: description !== undefined ? description : floorPlan.description,
      width: width || floorPlan.width,
      height: height || floorPlan.height,
      layout: layout || floorPlan.layout,
      isDefault: isDefault !== undefined ? isDefault : floorPlan.isDefault,
      isActive: isActive !== undefined ? isActive : floorPlan.isActive
    });

    res.json({
      success: true,
      floorPlan
    });
  } catch (error) {
    next(error);
  }
};

// Delete floor plan
export const deleteFloorPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const floorPlan = await FloorPlan.findByPk(id, {
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!floorPlan) {
      throw new AppError('Floor plan not found', 404);
    }

    // Check ownership
    if (floorPlan.restaurant.ownerId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('You can only delete your own restaurant floor plans', 403);
    }

    // Don't allow deleting default floor plan if it's the only one
    if (floorPlan.isDefault) {
      const otherFloorPlans = await FloorPlan.count({
        where: { 
          restaurantId: floorPlan.restaurantId,
          id: { [Op.ne]: id }
        }
      });

      if (otherFloorPlans === 0) {
        throw new AppError('Cannot delete the only floor plan. Create another one first.', 400);
      }
    }

    await floorPlan.destroy();

    res.json({
      success: true,
      message: 'Floor plan deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get table availability for a specific date and time
export const getTableAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;
    const { date, time } = req.query;

    if (!date || !time) {
      throw new AppError('Date and time are required', 400);
    }

    const dateTime = new Date(`${date}T${time}`);
    const startTime = new Date(dateTime);
    startTime.setHours(startTime.getHours() - 2);
    const endTime = new Date(dateTime);
    endTime.setHours(endTime.getHours() + 2);

    // Get all tables for the restaurant
    const tables = await Table.findAll({
      where: { restaurantId, isActive: true }
    });

    // Get existing reservations and assignments
    const [reservations, assignments] = await Promise.all([
      Reservation.findAll({
        where: {
          restaurantId,
          dateTime: {
            [Op.between]: [startTime, endTime]
          },
          status: {
            [Op.notIn]: [ReservationStatus.CANCELLED, ReservationStatus.COMPLETED]
          }
        }
      }),
      TableAssignment.findAll({
        where: {
          assignedAt: {
            [Op.between]: [startTime, endTime]
          },
          vacatedAt: { [Op.or]: [null, { [Op.gte]: startTime }] }
        },
        include: [{ model: Table, as: 'table', where: { restaurantId } }]
      })
    ]);

    const unavailableTableIds = new Set([
      ...reservations.map(r => r.tableId).filter(Boolean),
      ...assignments.map(a => a.tableId)
    ]);

    const tableAvailability = tables.map(table => ({
      id: table.id,
      number: table.tableNumber,
      capacity: table.capacity,
      minCapacity: table.minCapacity,
      location: table.location,
      isAvailable: !unavailableTableIds.has(table.id),
      isReserved: reservations.some(r => r.tableId === table.id),
      isOccupied: assignments.some(a => a.tableId === table.id && !a.vacatedAt)
    }));

    res.json({
      success: true,
      dateTime,
      tables: tableAvailability
    });
  } catch (error) {
    next(error);
  }
};

// Assign table to reservation
export const assignTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reservationId, tableId, estimatedDuration, notes } = req.body;

    // Verify reservation exists and is confirmed
    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!reservation) {
      throw new AppError('Reservation not found', 404);
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new AppError('Can only assign tables to confirmed reservations', 400);
    }

    // Check ownership
    if (reservation.restaurant.ownerId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('You can only manage your own restaurant tables', 403);
    }

    // Verify table exists and is available
    const table = await Table.findByPk(tableId);
    if (!table || table.restaurantId !== reservation.restaurantId) {
      throw new AppError('Table not found', 404);
    }

    // Check if table is already assigned at this time
    const existingAssignment = await TableAssignment.findOne({
      where: {
        tableId,
        assignedAt: {
          [Op.lte]: reservation.dateTime
        },
        [Op.or]: [
          { vacatedAt: null },
          { vacatedAt: { [Op.gte]: reservation.dateTime } }
        ]
      }
    });

    if (existingAssignment) {
      throw new AppError('Table is already assigned for this time slot', 400);
    }

    // Create table assignment
    const assignment = await TableAssignment.create({
      tableId,
      reservationId,
      assignedAt: reservation.dateTime,
      estimatedDuration: estimatedDuration || 120, // default 2 hours
      notes
    });

    // Update reservation with table info
    await reservation.update({ tableId });

    const fullAssignment = await TableAssignment.findByPk(assignment.id, {
      include: [{ model: Table, as: 'table' }]
    });

    res.status(201).json({
      success: true,
      assignment: fullAssignment
    });
  } catch (error) {
    next(error);
  }
};

// Mark table as seated
export const seatTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await TableAssignment.findByPk(assignmentId, {
      include: [
        { 
          model: Table, 
          as: 'table',
          include: [{ model: Restaurant, as: 'restaurant' }]
        }
      ]
    });

    if (!assignment) {
      throw new AppError('Table assignment not found', 404);
    }

    // Check ownership
    if (assignment.table.restaurant.ownerId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('You can only manage your own restaurant tables', 403);
    }

    if (assignment.seatedAt) {
      throw new AppError('Table is already seated', 400);
    }

    await assignment.update({ seatedAt: new Date() });

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    next(error);
  }
};

// Mark table as vacated
export const vacateTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await TableAssignment.findByPk(assignmentId, {
      include: [
        { 
          model: Table, 
          as: 'table',
          include: [{ model: Restaurant, as: 'restaurant' }]
        }
      ]
    });

    if (!assignment) {
      throw new AppError('Table assignment not found', 404);
    }

    // Check ownership
    if (assignment.table.restaurant.ownerId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('You can only manage your own restaurant tables', 403);
    }

    if (assignment.vacatedAt) {
      throw new AppError('Table is already vacated', 400);
    }

    await assignment.update({ vacatedAt: new Date() });

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    next(error);
  }
};

// Get real-time floor plan status
export const getFloorPlanStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { floorPlanId } = req.params;
    const { date } = req.query;

    const floorPlan = await FloorPlan.findByPk(floorPlanId, {
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!floorPlan) {
      throw new AppError('Floor plan not found', 404);
    }

    // Check ownership for detailed view
    if (floorPlan.restaurant.ownerId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('You can only view your own restaurant floor plans', 403);
    }

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all tables for this restaurant
    const tables = await Table.findAll({
      where: { restaurantId: floorPlan.restaurantId }
    });

    // Get current assignments and reservations
    const [assignments, reservations] = await Promise.all([
      TableAssignment.findAll({
        where: {
          assignedAt: {
            [Op.between]: [startOfDay, endOfDay]
          },
          [Op.or]: [
            { vacatedAt: null },
            { vacatedAt: { [Op.gte]: new Date() } }
          ]
        },
        include: [{ model: Table, as: 'table', where: { restaurantId: floorPlan.restaurantId } }]
      }),
      Reservation.findAll({
        where: {
          restaurantId: floorPlan.restaurantId,
          dateTime: {
            [Op.between]: [startOfDay, endOfDay]
          },
          status: {
            [Op.notIn]: [ReservationStatus.CANCELLED, ReservationStatus.COMPLETED]
          }
        }
      })
    ]);

    // Build status for each table in the layout
    const tableStatuses = floorPlan.layout.tables.map(layoutTable => {
      const table = tables.find(t => t.id === layoutTable.id);
      const assignment = assignments.find(a => a.tableId === layoutTable.id);
      const reservation = reservations.find(r => r.tableId === layoutTable.id);

      return {
        ...layoutTable,
        table: table ? {
          tableNumber: table.tableNumber,
          capacity: table.capacity
        } : null,
        status: assignment ? (assignment.seatedAt ? 'occupied' : 'reserved') : 'available',
        assignment: assignment ? {
          id: assignment.id,
          reservationId: assignment.reservationId,
          assignedAt: assignment.assignedAt,
          seatedAt: assignment.seatedAt,
          estimatedDuration: assignment.estimatedDuration
        } : null,
        reservation: reservation ? {
          id: reservation.id,
          partySize: reservation.partySize,
          dateTime: reservation.dateTime
        } : null
      };
    });

    res.json({
      success: true,
      floorPlan: {
        ...floorPlan.toJSON(),
        layout: {
          ...floorPlan.layout,
          tables: tableStatuses
        }
      }
    });
  } catch (error) {
    next(error);
  }
};