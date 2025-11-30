import { Router } from 'express';
import { body, query } from 'express-validator';
import * as waitlistController from '../controllers/waitlist.controller';
import { authenticate, requireAdmin ,authorize} from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { UserRole } from '../models/User';

const router = Router();

// Join waitlist
router.post(
  '/',
  authenticate,
  [
    body('restaurantId').isUUID(),
    body('requestedDate').isISO8601(),
    body('preferredTimeStart').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('preferredTimeEnd').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('partySize').isInt({ min: 1, max: 20 }),
    body('notes').optional().trim(),
    body('preferences').optional().isObject()
  ],
  validate,
  waitlistController.joinWaitlist
);

// Get my waitlist entries
router.get(
  '/my-entries',
  authenticate,
  [query('active').optional().isBoolean()],
  validate,
  waitlistController.getMyWaitlistEntries
);

// Check availability and waitlist position
router.get(
  '/check-availability',
  [
    query('restaurantId').isUUID(),
    query('date').isISO8601(),
    query('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    query('partySize').isInt({ min: 1, max: 20 })
  ],
  validate,
  waitlistController.checkAvailability
);

// Get restaurant waitlist (restaurant owners only)
router.get(
  '/restaurant/:restaurantId',
  authenticate,
  authorize(UserRole.RESTAURANT_OWNER, UserRole.ADMIN),
  [query('date').optional().isISO8601()],
  validate,
  waitlistController.getRestaurantWaitlist
);

// Update waitlist status (restaurant owners only)
router.put(
  '/:id/status',
  authenticate,
  authorize(UserRole.RESTAURANT_OWNER, UserRole.ADMIN),
  [
    body('status').isIn(['waiting', 'notified', 'seated', 'cancelled', 'no_show', 'expired'])
  ],
  validate,
  waitlistController.updateWaitlistStatus
);

// Leave waitlist
router.delete('/:id', authenticate, waitlistController.leaveWaitlist);

export default router;