import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a restaurant' })
  @ApiResponse({ status: 201, type: ReviewResponseDto })
  async createReview(@Body() createReviewDto: CreateReviewDto, @Req() req: any) {
    const review = {
      id: 'review-' + Date.now(),
      restaurantId: createReviewDto.restaurantId,
      userId: req.user.sub,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
      visitDate: createReviewDto.visitDate,
      wouldRecommend: createReviewDto.wouldRecommend,
      serviceRating: createReviewDto.serviceRating,
      foodRating: createReviewDto.foodRating,
      ambianceRating: createReviewDto.ambianceRating,
      valueRating: createReviewDto.valueRating,
      isVerified: false,
      likes: 0,
      dislikes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      success: true,
      data: review,
      message: 'Review created successfully',
    };
  }

  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Get reviews for a restaurant' })
  @ApiResponse({ status: 200, type: [ReviewResponseDto] })
  async getRestaurantReviews(
    @Param('restaurantId') restaurantId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('rating') rating?: number,
    @Query('verified') verified?: boolean,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const mockReviews = Array.from({ length: limit }, (_, idx) => ({
      id: `review-${restaurantId}-${idx}`,
      restaurantId,
      userId: `user-${idx}`,
      rating: Math.floor(Math.random() * 5) + 1,
      comment: `Great experience at this restaurant! Review ${idx + 1}`,
      visitDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      wouldRecommend: Math.random() > 0.3,
      serviceRating: Math.floor(Math.random() * 5) + 1,
      foodRating: Math.floor(Math.random() * 5) + 1,
      ambianceRating: Math.floor(Math.random() * 5) + 1,
      valueRating: Math.floor(Math.random() * 5) + 1,
      isVerified: verified ?? Math.random() > 0.5,
      likes: Math.floor(Math.random() * 20),
      dislikes: Math.floor(Math.random() * 5),
      userName: `User ${idx + 1}`,
      userAvatar: `https://ui-avatars.com/api/?name=User+${idx + 1}`,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    }));

    return {
      success: true,
      data: {
        reviews: mockReviews,
        pagination: {
          page,
          limit,
          total: 150,
          totalPages: Math.ceil(150 / limit),
        },
        summary: {
          averageRating: 4.2,
          totalReviews: 150,
          ratingDistribution: {
            5: 45,
            4: 40,
            3: 35,
            2: 20,
            1: 10,
          },
          verifiedReviews: 120,
        },
      },
    };
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reviews by user' })
  @ApiResponse({ status: 200, type: [ReviewResponseDto] })
  async getUserReviews(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const mockReviews = Array.from({ length: limit }, (_, idx) => ({
      id: `review-${userId}-${idx}`,
      restaurantId: `restaurant-${idx}`,
      restaurantName: `Restaurant ${idx + 1}`,
      restaurantImage: `https://picsum.photos/300/200?random=${idx}`,
      userId,
      rating: Math.floor(Math.random() * 5) + 1,
      comment: `My review for Restaurant ${idx + 1}`,
      visitDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
    }));

    return {
      success: true,
      data: {
        reviews: mockReviews,
        pagination: {
          page,
          limit,
          total: 25,
          totalPages: Math.ceil(25 / limit),
        },
      },
    };
  }

  @Put(':reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  async updateReview(
    @Param('reviewId') reviewId: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Req() req: any,
  ) {
    return {
      success: true,
      data: {
        id: reviewId,
        ...updateReviewDto,
        updatedAt: new Date(),
      },
      message: 'Review updated successfully',
    };
  }

  @Delete(':reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 200 })
  async deleteReview(@Param('reviewId') reviewId: string, @Req() req: any) {
    return {
      success: true,
      message: 'Review deleted successfully',
    };
  }

  @Post(':reviewId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a review' })
  @ApiResponse({ status: 200 })
  async likeReview(@Param('reviewId') reviewId: string, @Req() req: any) {
    return {
      success: true,
      data: {
        reviewId,
        likes: Math.floor(Math.random() * 50) + 1,
        userLiked: true,
      },
      message: 'Review liked successfully',
    };
  }

  @Post(':reviewId/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a review' })
  @ApiResponse({ status: 200 })
  async reportReview(
    @Param('reviewId') reviewId: string,
    @Body() reportData: { reason: string; description?: string },
    @Req() req: any,
  ) {
    return {
      success: true,
      message: 'Review reported successfully',
    };
  }

  @Get(':reviewId/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark review as helpful' })
  @ApiResponse({ status: 200 })
  async markHelpful(@Param('reviewId') reviewId: string, @Req() req: any) {
    return {
      success: true,
      data: {
        reviewId,
        helpfulCount: Math.floor(Math.random() * 20) + 1,
        userMarkedHelpful: true,
      },
      message: 'Review marked as helpful',
    };
  }

  @Get('restaurant/:restaurantId/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'restaurant_staff', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get review analytics for restaurant' })
  @ApiResponse({ status: 200 })
  async getReviewAnalytics(@Param('restaurantId') restaurantId: string) {
    return {
      success: true,
      data: {
        totalReviews: 245,
        averageRating: 4.3,
        ratingTrend: {
          thisMonth: 4.5,
          lastMonth: 4.2,
          change: '+0.3',
        },
        categoryRatings: {
          food: 4.4,
          service: 4.2,
          ambiance: 4.3,
          value: 4.1,
        },
        reviewsByMonth: [
          { month: 'Jan', count: 20, avgRating: 4.2 },
          { month: 'Feb', count: 25, avgRating: 4.3 },
          { month: 'Mar', count: 30, avgRating: 4.5 },
        ],
        sentimentAnalysis: {
          positive: 75,
          neutral: 20,
          negative: 5,
        },
        commonKeywords: [
          { word: 'delicious', count: 45 },
          { word: 'excellent service', count: 38 },
          { word: 'great atmosphere', count: 32 },
        ],
      },
    };
  }
}