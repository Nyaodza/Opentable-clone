import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Waitlist, WaitlistStatus } from '../models/Waitlist';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { Reservation, ReservationStatus } from '../models/Reservation';
import { AppError } from '../middleware/error.middleware';
import { generateConfirmationCode } from '../utils/helpers';
import { io } from '../server';
import { emitToUser, emitToRestaurant } from '../config/socket';
import { addDays, format } from 'date-fns';

export const joinWaitlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      restaurantId,
      requestedDate,
      preferredTimeStart,
      preferredTimeEnd,
      partySize,
      notes,
      preferences
    } = req.body;

    // Check if restaurant exists
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      throw new AppError('Restaurant not found or unavailable', 404);
    }

    // Check if user already on waitlist for this date/restaurant
    const existingWaitlist = await Waitlist.findOne({
      where: {
        userId: req.user!.id,
        restaurantId,
        requestedDate: new Date(requestedDate),
        status: WaitlistStatus.WAITING
      }
    });

    if (existingWaitlist) {
      throw new AppError('You are already on the waitlist for this date', 400);
    }

    // Get current position in waitlist
    const position = await getNextWaitlistPosition(restaurantId, requestedDate);

    // Calculate expiration (24 hours from now)
    const expiresAt = addDays(new Date(), 1);

    // Create waitlist entry
    const waitlistEntry = await Waitlist.create({
      userId: req.user!.id,
      restaurantId,
      requestedDate: new Date(requestedDate),
      preferredTimeStart,
      preferredTimeEnd,
      partySize,
      position,
      notes,
      preferences,
      expiresAt,
      estimatedWaitMinutes: position * 15 // Rough estimate: 15 min per position
    });

    // Load full details
    const fullEntry = await Waitlist.findByPk(waitlistEntry.id, {
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }
      ]
    });

    // Send notification to user
    emitToUser(io, req.user!.id, 'waitlist-joined', {
      position,
      estimatedWait: position * 15,
      restaurant: restaurant.name
    });

    // Send notification to restaurant
    emitToRestaurant(io, restaurantId, 'new-waitlist-entry', {
      guestName: `${fullEntry!.user!.firstName} ${fullEntry!.user!.lastName}`,
      partySize,
      requestedDate: format(new Date(requestedDate), 'MMM d, yyyy')
    });

    res.status(201).json({
      success: true,
      waitlistEntry: fullEntry
    });
  } catch (error) {
    next(error);
  }
};

export const getMyWaitlistEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { active } = req.query;
    
    const where: any = { userId: req.user!.id };
    if (active === 'true') {
      where.status = { [Op.in]: [WaitlistStatus.WAITING, WaitlistStatus.NOTIFIED] };
      where.expiresAt = { [Op.gt]: new Date() };
    }

    const entries = await Waitlist.findAll({
      where,
      include: [{ model: Restaurant, as: 'restaurant' }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      waitlistEntries: entries
    });
  } catch (error) {
    next(error);
  }
};

export const updateWaitlistStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const entry = await Waitlist.findByPk(id, {
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: User, as: 'user' }
      ]
    });

    if (!entry) {
      throw new AppError('Waitlist entry not found', 404);
    }

    // Check if user is restaurant owner or admin
    const restaurant = entry.restaurant!;
    if (restaurant.ownerId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('You can only update waitlist for your own restaurants', 403);
    }

    const oldStatus = entry.status;
    entry.status = status;

    if (status === WaitlistStatus.NOTIFIED) {
      entry.notifiedAt = new Date();
      // Give user 30 minutes to respond
      entry.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    }

    await entry.save();

    // Update positions for remaining entries if someone was seated/cancelled
    if (status === WaitlistStatus.SEATED || status === WaitlistStatus.CANCELLED) {
      await updateWaitlistPositions(entry.restaurantId, entry.requestedDate);
    }

    // Send notifications
    if (status === WaitlistStatus.NOTIFIED) {
      emitToUser(io, entry.userId, 'waitlist-available', {
        restaurant: restaurant.name,
        expiresAt: entry.expiresAt
      });
    }

    res.json({
      success: true,
      waitlistEntry: entry
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantWaitlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;
    const { date } = req.query;

    // Verify ownership
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    if (restaurant.ownerId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('You can only view waitlist for your own restaurants', 403);
    }

    const where: any = { 
      restaurantId,
      status: { [Op.in]: [WaitlistStatus.WAITING, WaitlistStatus.NOTIFIED] }
    };

    if (date) {
      where.requestedDate = new Date(date as string);
    }

    const waitlistEntries = await Waitlist.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email', 'phone'] }
      ],
      order: [['position', 'ASC']]
    });

    res.json({
      success: true,
      waitlistEntries
    });
  } catch (error) {
    next(error);
  }
};

export const leaveWaitlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const entry = await Waitlist.findByPk(id);
    if (!entry) {
      throw new AppError('Waitlist entry not found', 404);
    }

    if (entry.userId !== req.user!.id) {
      throw new AppError('You can only cancel your own waitlist entries', 403);
    }

    entry.status = WaitlistStatus.CANCELLED;
    await entry.save();

    // Update positions for remaining entries
    await updateWaitlistPositions(entry.restaurantId, entry.requestedDate);

    res.json({
      success: true,
      message: 'Successfully left waitlist'
    });
  } catch (error) {
    next(error);
  }
};

export const checkAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId, date, time, partySize } = req.query;

    // Check for available tables
    const dateTime = new Date(`${date}T${time}`);
    
    // Simple availability check (can be enhanced with actual table logic)
    const existingReservations = await Reservation.count({
      where: {
        restaurantId,
        dateTime: {
          [Op.between]: [
            new Date(dateTime.getTime() - 90 * 60 * 1000), // 1.5 hours before
            new Date(dateTime.getTime() + 90 * 60 * 1000)  // 1.5 hours after
          ]
        },
        status: { [Op.notIn]: [ReservationStatus.CANCELLED, ReservationStatus.COMPLETED] }
      }
    });

    const restaurant = await Restaurant.findByPk(restaurantId as string);
    const isAvailable = existingReservations < (restaurant?.totalCapacity || 50) / 4; // Rough estimate

    res.json({
      success: true,
      available: isAvailable,
      waitlistPosition: isAvailable ? 0 : await getNextWaitlistPosition(restaurantId as string, new Date(date as string))
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
async function getNextWaitlistPosition(restaurantId: string, requestedDate: Date): Promise<number> {
  const maxPosition = await Waitlist.max('position', {
    where: {
      restaurantId,
      requestedDate,
      status: { [Op.in]: [WaitlistStatus.WAITING, WaitlistStatus.NOTIFIED] }
    }
  }) as number;

  return (maxPosition || 0) + 1;
}

async function updateWaitlistPositions(restaurantId: string, requestedDate: Date) {
  const entries = await Waitlist.findAll({
    where: {
      restaurantId,
      requestedDate,
      status: { [Op.in]: [WaitlistStatus.WAITING, WaitlistStatus.NOTIFIED] }
    },
    order: [['createdAt', 'ASC']]
  });

  for (let i = 0; i < entries.length; i++) {
    entries[i].position = i + 1;
    entries[i].estimatedWaitMinutes = (i + 1) * 15;
    await entries[i].save();
  }
}