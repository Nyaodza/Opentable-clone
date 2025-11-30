import { Router } from 'express';
import * as reviewController from '../controllers/review.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, validateQuery } from '../validators/common.validators';
import {
  createReviewSchema,
  updateReviewSchema,
  voteReviewSchema,
  reportReviewSchema,
  searchReviewsSchema
} from '../validators/review.validators';

const router = Router();

/**
 * @route   POST /api/reviews
 * @desc    Create a new review
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate(createReviewSchema),
  reviewController.createReview
);

/**
 * @route   GET /api/reviews/restaurant/:restaurantId
 * @desc    Get reviews for a restaurant
 * @access  Public
 */
router.get(
  '/restaurant/:restaurantId',
  validateQuery(searchReviewsSchema),
  reviewController.getRestaurantReviews
);

/**
 * @route   GET /api/reviews/my-reviews
 * @desc    Get current user's reviews
 * @access  Private
 */
router.get(
  '/my-reviews',
  authenticate,
  validateQuery(searchReviewsSchema),
  reviewController.getMyReviews
);

/**
 * @route   GET /api/reviews/user/:userId/summary
 * @desc    Get user review summary
 * @access  Public
 */
router.get(
  '/user/:userId/summary',
  reviewController.getUserReviewSummary
);

/**
 * @route   GET /api/reviews/:id
 * @desc    Get review by ID
 * @access  Public
 */
router.get('/:id', reviewController.getReview);

/**
 * @route   PUT /api/reviews/:id
 * @desc    Update review
 * @access  Private (Owner/Admin)
 */
router.put(
  '/:id',
  authenticate,
  validate(updateReviewSchema),
  reviewController.updateReview
);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete review
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', authenticate, reviewController.deleteReview);

/**
 * @route   POST /api/reviews/:id/vote
 * @desc    Vote review as helpful/unhelpful
 * @access  Private
 */
router.post(
  '/:id/vote',
  authenticate,
  validate(voteReviewSchema),
  reviewController.voteReview
);

/**
 * @route   POST /api/reviews/:id/report
 * @desc    Report a review
 * @access  Private
 */
router.post(
  '/:id/report',
  authenticate,
  validate(reportReviewSchema),
  reviewController.reportReview
);

export default router;