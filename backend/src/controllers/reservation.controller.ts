import { Request, Response, NextFunction } from 'express';
import { ReservationService } from '../services/reservation.service';
import { ReservationStatus } from '../models/Reservation';
import { UserRole } from '../models/User';
import { logInfo } from '../utils/logger';

export const createReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      restaurantId,
      dateTime,
      partySize,
      guestInfo,
      specialRequests,
      occasion,
      dietaryRestrictions,
      newsletterOptIn,
      smsOptIn
    } = req.body;

    const reservation = await ReservationService.createReservation({
      restaurantId,
      userId: req.user!.id,
      dateTime: new Date(dateTime),
      partySize,
      guestInfo: guestInfo || {
        firstName: req.user!.firstName,
        lastName: req.user!.lastName,
        email: req.user!.email,
        phone: req.user!.phone
      },
      specialRequests,
      occasion,
      dietaryRestrictions,
      newsletterOptIn,
      smsOptIn
    });

    logInfo('Reservation created via API', {
      reservationId: reservation.id,
      userId: req.user!.id
    });

    res.status(201).json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

export const getMyReservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, startDate, endDate, page, limit } = req.query;

    const result = await ReservationService.searchReservations({
      userId: req.user!.id,
      status: status ? [status as ReservationStatus] : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      includeDetails: true
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getUpcomingReservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reservations = await ReservationService.getUserUpcomingReservations(req.user!.id);

    res.json({
      success: true,
      data: reservations
    });
  } catch (error) {
    next(error);
  }
};

export const getReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const reservation = await ReservationService.getReservationById(id, req.user!.id, isAdmin);

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

export const updateReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const reservation = await ReservationService.updateReservation(
      id,
      req.user!.id,
      req.body,
      isAdmin
    );

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

export const cancelReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const reservation = await ReservationService.cancelReservation(
      id,
      req.user!.id,
      reason,
      isAdmin
    );

    res.json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

// Restaurant owner endpoints
export const getRestaurantReservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;
    const { date } = req.query;

    const reservations = await ReservationService.getRestaurantReservations(
      restaurantId,
      new Date(date as string)
    );

    res.json({
      success: true,
      data: reservations
    });
  } catch (error) {
    next(error);
  }
};

export const markAsSeated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const reservation = await ReservationService.markAsSeated(id, req.user!.id, isAdmin);

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

export const markAsCompleted = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const reservation = await ReservationService.markAsCompleted(id, req.user!.id, isAdmin);

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

export const markAsNoShow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const reservation = await ReservationService.markAsNoShow(id, req.user!.id, isAdmin);

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

