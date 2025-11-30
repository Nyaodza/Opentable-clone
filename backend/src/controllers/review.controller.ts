import { Request, Response, NextFunction } from 'express';
import { ReviewService } from '../services/review.service';
import { UserRole } from '../models/User';
import { logInfo } from '../utils/logger';

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      reservationId,
      rating,
      foodRating,
      serviceRating,
      ambianceRating,
      valueRating,
      title,
      content,
      wouldRecommend,
      photos
    } = req.body;

    const review = await ReviewService.createReview({
      reservationId,
      userId: req.user!.id,
      rating,
      foodRating,
      serviceRating,
      ambianceRating,
      valueRating,
      title,
      content,
      wouldRecommend,
      photos,
      verifiedDining: true
    });

    logInfo('Review created via API', {
      reviewId: review.id,
      userId: req.user!.id
    });

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;
    const {
      minRating,
      maxRating,
      verified,
      hasPhotos,
      startDate,
      endDate,
      page,
      limit,
      sort
    } = req.query;

    const result = await ReviewService.searchReviews({
      restaurantId,
      minRating: minRating ? parseInt(minRating as string) : undefined,
      maxRating: maxRating ? parseInt(maxRating as string) : undefined,
      verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
      hasPhotos: hasPhotos === 'true',
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      sort: sort as any
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const review = await ReviewService.updateReview(
      id,
      req.user!.id,
      req.body,
      isAdmin
    );

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    await ReviewService.deleteReview(id, req.user!.id, isAdmin);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const voteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isHelpful } = req.body;

    const review = await ReviewService.voteReview(id, req.user!.id, isHelpful);

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

export const reportReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, details } = req.body;

    await ReviewService.reportReview(id, req.user!.id, reason, details);

    res.json({
      success: true,
      message: 'Review reported successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ReviewService.searchReviews({
      userId: req.user!.id,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const review = await ReviewService.getReviewById(id);

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

export const getUserReviewSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const summary = await ReviewService.getUserReviewSummary(userId || req.user!.id);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};