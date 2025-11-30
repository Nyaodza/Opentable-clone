import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantController {
  constructor() {}

  @Get()
  @ApiOperation({ summary: 'Search restaurants' })
  @ApiResponse({ status: 200, description: 'List of restaurants' })
  async searchRestaurants(
    @Query('q') query?: string,
    @Query('location') location?: string,
    @Query('cuisine') cuisine?: string,
    @Query('price') priceRange?: string,
    @Query('rating') minRating?: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    // Mock data for now
    const mockRestaurants = [
      {
        id: '1',
        name: 'The Gourmet Kitchen',
        cuisine: 'Italian',
        rating: 4.8,
        reviewCount: 342,
        priceRange: 3,
        location: 'Downtown',
        image: 'https://via.placeholder.com/300x200',
        availableTimes: ['6:00 PM', '6:30 PM', '7:00 PM'],
      },
      {
        id: '2',
        name: 'Sakura Sushi Bar',
        cuisine: 'Japanese',
        rating: 4.6,
        reviewCount: 186,
        priceRange: 2,
        location: 'Midtown',
        image: 'https://via.placeholder.com/300x200',
        availableTimes: ['5:30 PM', '6:00 PM', '7:30 PM'],
      },
    ];

    return {
      restaurants: mockRestaurants,
      total: mockRestaurants.length,
      page,
      limit,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant details' })
  @ApiResponse({ status: 200, description: 'Restaurant details' })
  async getRestaurant(@Param('id') id: string) {
    // Mock restaurant data
    return {
      id,
      name: 'The Gourmet Kitchen',
      cuisine: 'Italian',
      rating: 4.8,
      reviewCount: 342,
      priceRange: 3,
      location: 'Downtown',
      address: '123 Main St, Downtown',
      phone: '(555) 123-4567',
      website: 'https://example.com',
      description: 'Authentic Italian cuisine in the heart of downtown.',
      images: ['https://via.placeholder.com/600x400'],
      amenities: ['Outdoor Seating', 'Full Bar', 'Valet Parking'],
      operatingHours: {
        monday: '5:00 PM - 10:00 PM',
        tuesday: '5:00 PM - 10:00 PM',
        wednesday: '5:00 PM - 10:00 PM',
        thursday: '5:00 PM - 10:00 PM',
        friday: '5:00 PM - 11:00 PM',
        saturday: '5:00 PM - 11:00 PM',
        sunday: '5:00 PM - 9:00 PM',
      },
      menu: [
        {
          category: 'Appetizers',
          items: [
            {
              name: 'Bruschetta',
              description: 'Grilled bread with tomatoes and basil',
              price: 12,
            },
          ],
        },
      ],
    };
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create new restaurant' })
  @ApiResponse({ status: 201, description: 'Restaurant created successfully' })
  async createRestaurant(@Body() createRestaurantDto: any, @Req() req: Request) {
    // Implementation for creating restaurant
    return {
      success: true,
      message: 'Restaurant created successfully',
      restaurant: {
        id: 'new-restaurant-id',
        ...createRestaurantDto,
        ownerId: req.user['id'],
      },
    };
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update restaurant' })
  @ApiResponse({ status: 200, description: 'Restaurant updated successfully' })
  async updateRestaurant(
    @Param('id') id: string,
    @Body() updateRestaurantDto: any,
    @Req() req: Request,
  ) {
    return {
      success: true,
      message: 'Restaurant updated successfully',
      restaurant: {
        id,
        ...updateRestaurantDto,
        updatedAt: new Date(),
      },
    };
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get restaurant availability' })
  @ApiResponse({ status: 200, description: 'Restaurant availability' })
  async getAvailability(
    @Param('id') id: string,
    @Query('date') date: string,
    @Query('partySize') partySize: number = 2,
  ) {
    // Mock availability data
    const availableTimes = [
      '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
      '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'
    ];

    return {
      date,
      partySize,
      availableTimes,
    };
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get restaurant reviews' })
  @ApiResponse({ status: 200, description: 'Restaurant reviews' })
  async getReviews(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    // Mock reviews data
    const mockReviews = [
      {
        id: '1',
        author: 'Alice M.',
        rating: 5,
        title: 'Amazing experience!',
        comment: 'The food was incredible and the service was excellent.',
        date: '2023-12-01',
        verified: true,
      },
      {
        id: '2',
        author: 'Bob K.',
        rating: 4,
        title: 'Great atmosphere',
        comment: 'Loved the ambiance, will definitely come back.',
        date: '2023-11-28',
        verified: true,
      },
    ];

    return {
      reviews: mockReviews,
      total: mockReviews.length,
      page,
      limit,
      averageRating: 4.8,
    };
  }

  @Post(':id/reviews')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create restaurant review' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  async createReview(
    @Param('id') restaurantId: string,
    @Body() createReviewDto: any,
    @Req() req: Request,
  ) {
    return {
      success: true,
      message: 'Review submitted successfully',
      review: {
        id: 'new-review-id',
        restaurantId,
        userId: req.user['id'],
        ...createReviewDto,
        createdAt: new Date(),
      },
    };
  }

  @Post(':id/favorite')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add restaurant to favorites' })
  @ApiResponse({ status: 200, description: 'Restaurant added to favorites' })
  async addToFavorites(@Param('id') restaurantId: string, @Req() req: Request) {
    return {
      success: true,
      message: 'Restaurant added to favorites',
      isFavorite: true,
    };
  }

  @Delete(':id/favorite')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Remove restaurant from favorites' })
  @ApiResponse({ status: 200, description: 'Restaurant removed from favorites' })
  async removeFromFavorites(@Param('id') restaurantId: string, @Req() req: Request) {
    return {
      success: true,
      message: 'Restaurant removed from favorites',
      isFavorite: false,
    };
  }
}
