import { Request, Response, NextFunction } from 'express';
import { RestaurantService } from '../services/restaurant.service';
import { TableService } from '../services/table.service';
import { logInfo } from '../utils/logger';
import { UserRole } from '../models/User';

export const createRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurant = await RestaurantService.createRestaurant({
      ...req.body,
      ownerId: req.user!.id
    });

    logInfo('Restaurant created via API', {
      restaurantId: restaurant.id,
      userId: req.user!.id
    });

    res.status(201).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

export const searchRestaurants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await RestaurantService.searchRestaurants(req.query as any);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isOwnerOrAdmin = req.user?.role === UserRole.ADMIN || 
      (req.user?.role === UserRole.RESTAURANT_OWNER);

    const restaurant = await RestaurantService.getRestaurantById(id, isOwnerOrAdmin);

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

export const updateRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const restaurant = await RestaurantService.updateRestaurant(
      id,
      req.user!.id,
      isAdmin,
      req.body
    );

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    await RestaurantService.deleteRestaurant(id, req.user!.id, isAdmin);

    res.json({
      success: true,
      message: 'Restaurant deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getMyRestaurants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurants = await RestaurantService.getRestaurantsByOwner(req.user!.id);

    res.json({
      success: true,
      data: restaurants
    });
  } catch (error) {
    next(error);
  }
};

export const updateRestaurantHours = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const hours = await RestaurantService.updateRestaurantHours(
      id,
      req.user!.id,
      isAdmin,
      req.body.hours
    );

    res.json({
      success: true,
      data: hours
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { date, partySize } = req.query;

    const availability = await RestaurantService.getRestaurantAvailability(
      id,
      new Date(date as string),
      parseInt(partySize as string)
    );

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await RestaurantService.getRestaurantStats(
      id,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const updateRestaurantPhotos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const restaurant = await RestaurantService.updateRestaurantPhotos(
      id,
      req.user!.id,
      isAdmin,
      req.body.photos
    );

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// Table management endpoints
export const createTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const table = await TableService.createTable(
      { ...req.body, restaurantId },
      req.user!.id,
      isAdmin
    );

    res.status(201).json({
      success: true,
      data: table
    });
  } catch (error) {
    next(error);
  }
};

export const updateTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableId } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const table = await TableService.updateTable(
      tableId,
      req.body,
      req.user!.id,
      isAdmin
    );

    res.json({
      success: true,
      data: table
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableId } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    await TableService.deleteTable(tableId, req.user!.id, isAdmin);

    res.json({
      success: true,
      message: 'Table deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;

    const tables = await TableService.getTablesByRestaurant(restaurantId);

    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    next(error);
  }
};

export const getTableAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;
    const { date, duration } = req.query;

    const availability = await TableService.getTableAvailability(
      restaurantId,
      new Date(date as string),
      duration ? parseInt(duration as string) : 120
    );

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    next(error);
  }
};

export const findBestTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;
    const { date, partySize, duration } = req.query;

    const table = await TableService.findBestTable(
      restaurantId,
      new Date(date as string),
      parseInt(partySize as string),
      duration ? parseInt(duration as string) : 120
    );

    res.json({
      success: true,
      data: table
    });
  } catch (error) {
    next(error);
  }
};

export const getTableOccupancy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate } = req.query;

    const occupancy = await TableService.getTableOccupancy(
      restaurantId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: occupancy
    });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const tables = await TableService.bulkUpdateTables(
      restaurantId,
      req.user!.id,
      isAdmin,
      req.body.tables
    );

    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    next(error);
  }
};