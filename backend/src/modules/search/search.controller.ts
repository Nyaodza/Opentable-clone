import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('search')
@Controller('search')
export class SearchController {

  @Get('restaurants')
  @ApiOperation({ summary: 'Search restaurants' })
  @ApiResponse({ status: 200 })
  async searchRestaurants(
    @Query('query') query?: string,
    @Query('location') location?: string,
    @Query('latitude') latitude?: number,
    @Query('longitude') longitude?: number,
    @Query('date') date?: string,
    @Query('time') time?: string,
    @Query('party_size') partySize?: number,
    @Query('cuisine') cuisine?: string,
    @Query('price_range') priceRange?: string,
    @Query('rating') minRating?: number,
    @Query('distance') maxDistance?: number,
    @Query('features') features?: string, // comma-separated
    @Query('sort_by') sortBy: string = 'relevance',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const cuisines = ['Italian', 'Japanese', 'Mexican', 'American', 'Indian', 'Chinese', 'French', 'Thai'];
    const priceRanges = ['$', '$$', '$$$', '$$$$'];
    const restaurantFeatures = ['outdoor_seating', 'valet_parking', 'wheelchair_accessible', 'private_dining', 'live_music', 'bar', 'brunch', 'late_night'];

    const mockRestaurants = Array.from({ length: limit }, (_, idx) => {
      const restaurantCuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
      const restaurantPrice = priceRanges[Math.floor(Math.random() * priceRanges.length)];
      const rating = Math.random() * 2 + 3; // 3-5 rating
      const reviewCount = Math.floor(Math.random() * 1000) + 50;

      return {
        id: `restaurant-${idx}`,
        name: `${restaurantCuisine} Bistro ${idx + 1}`,
        description: `Authentic ${restaurantCuisine.toLowerCase()} cuisine in a modern setting`,
        cuisine: restaurantCuisine,
        priceRange: restaurantPrice,
        rating: Math.round(rating * 10) / 10,
        reviewCount,
        image: `https://picsum.photos/400/300?random=${idx}`,
        images: Array.from({ length: 5 }, (_, i) => `https://picsum.photos/400/300?random=${idx * 10 + i}`),
        address: {
          street: `${100 + idx} Main Street`,
          city: 'New York',
          state: 'NY',
          zipCode: `1000${idx}`,
          formatted: `${100 + idx} Main Street, New York, NY 1000${idx}`,
        },
        location: {
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
        },
        distance: Math.round(Math.random() * 50 * 10) / 10, // 0-5.0 miles
        phone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        website: `https://${restaurantCuisine.toLowerCase()}bistro${idx + 1}.com`,
        hours: {
          monday: { open: '11:00', close: '22:00', closed: false },
          tuesday: { open: '11:00', close: '22:00', closed: false },
          wednesday: { open: '11:00', close: '22:00', closed: false },
          thursday: { open: '11:00', close: '23:00', closed: false },
          friday: { open: '11:00', close: '23:00', closed: false },
          saturday: { open: '10:00', close: '23:00', closed: false },
          sunday: { open: '10:00', close: '21:00', closed: false },
        },
        features: restaurantFeatures.filter(() => Math.random() > 0.6),
        reservationPolicy: {
          acceptsReservations: true,
          maxPartySize: 12,
          advanceBookingDays: 30,
          cancellationPolicy: '24 hours advance notice required',
        },
        availability: this.generateAvailability(),
        popularTimes: this.generatePopularTimes(),
        tags: ['popular', 'highly_rated', 'family_friendly'].filter(() => Math.random() > 0.5),
        promoted: Math.random() > 0.8,
        verified: Math.random() > 0.3,
      };
    });

    // Apply filters
    let filteredRestaurants = mockRestaurants;

    if (query) {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(query.toLowerCase()) ||
        r.description.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (cuisine) {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.cuisine.toLowerCase() === cuisine.toLowerCase()
      );
    }

    if (priceRange) {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.priceRange === priceRange
      );
    }

    if (minRating) {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.rating >= minRating
      );
    }

    if (maxDistance && location) {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.distance <= maxDistance
      );
    }

    if (features) {
      const requestedFeatures = features.split(',');
      filteredRestaurants = filteredRestaurants.filter(r =>
        requestedFeatures.every(feature => r.features.includes(feature.trim()))
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'distance':
        filteredRestaurants.sort((a, b) => a.distance - b.distance);
        break;
      case 'rating':
        filteredRestaurants.sort((a, b) => b.rating - a.rating);
        break;
      case 'price_low':
        filteredRestaurants.sort((a, b) => a.priceRange.length - b.priceRange.length);
        break;
      case 'price_high':
        filteredRestaurants.sort((a, b) => b.priceRange.length - a.priceRange.length);
        break;
      case 'review_count':
        filteredRestaurants.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      default: // relevance
        filteredRestaurants.sort((a, b) => {
          // Promoted restaurants first, then by rating
          if (a.promoted !== b.promoted) return b.promoted ? 1 : -1;
          return b.rating - a.rating;
        });
    }

    return {
      success: true,
      data: {
        restaurants: filteredRestaurants,
        pagination: {
          page,
          limit,
          total: filteredRestaurants.length * 3, // Simulate more results
          totalPages: Math.ceil((filteredRestaurants.length * 3) / limit),
        },
        filters: {
          appliedFilters: {
            query,
            location,
            cuisine,
            priceRange,
            minRating,
            maxDistance,
            features: features?.split(',') || [],
          },
          availableOptions: {
            cuisines,
            priceRanges,
            features: restaurantFeatures,
            sortOptions: ['relevance', 'distance', 'rating', 'price_low', 'price_high', 'review_count'],
          },
        },
        searchMetadata: {
          query,
          resultsFound: filteredRestaurants.length,
          searchTime: Math.random() * 0.5 + 0.1, // 0.1-0.6 seconds
          location: location || 'Current Location',
          radius: maxDistance || 25,
        },
      },
    };
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiResponse({ status: 200 })
  async getSearchSuggestions(@Query('query') query: string) {
    const restaurantSuggestions = [
      'Italian Bistro', 'Sushi Palace', 'Taco Bell', 'French Quarter', 'Indian Spice',
      'Thai Garden', 'Pizza Corner', 'Burger House', 'Steak House', 'Chinese Dragon',
    ].filter(name => name.toLowerCase().includes(query?.toLowerCase() || ''));

    const cuisineSuggestions = [
      'Italian', 'Japanese', 'Mexican', 'French', 'Indian', 'Thai', 'Chinese', 'American',
    ].filter(cuisine => cuisine.toLowerCase().includes(query?.toLowerCase() || ''));

    const locationSuggestions = [
      'Manhattan, NY', 'Brooklyn, NY', 'Queens, NY', 'Bronx, NY', 'Staten Island, NY',
      'Upper East Side', 'Lower East Side', 'SoHo', 'Greenwich Village', 'Chelsea',
    ].filter(location => location.toLowerCase().includes(query?.toLowerCase() || ''));

    return {
      success: true,
      data: {
        restaurants: restaurantSuggestions.slice(0, 5),
        cuisines: cuisineSuggestions.slice(0, 5),
        locations: locationSuggestions.slice(0, 5),
        trending: ['Italian', 'Sushi', 'Pizza', 'Steakhouse', 'Brunch'],
        recentSearches: ['Italian near me', 'Best sushi', 'Romantic dinner', 'Family restaurant'],
      },
    };
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular searches and trending restaurants' })
  @ApiResponse({ status: 200 })
  async getPopularSearches(@Query('location') location?: string) {
    return {
      success: true,
      data: {
        trendingSearches: [
          'Italian near me',
          'Best sushi restaurant',
          'Romantic dinner spots',
          'Brunch places',
          'Family restaurants',
          'Date night restaurants',
          'Happy hour specials',
          'Outdoor dining',
        ],
        popularCuisines: [
          { name: 'Italian', count: 245, trend: '+5%' },
          { name: 'Japanese', count: 189, trend: '+12%' },
          { name: 'Mexican', count: 156, trend: '+3%' },
          { name: 'American', count: 134, trend: '-2%' },
          { name: 'Indian', count: 98, trend: '+8%' },
        ],
        featuredRestaurants: Array.from({ length: 6 }, (_, idx) => ({
          id: `featured-${idx}`,
          name: `Featured Restaurant ${idx + 1}`,
          cuisine: ['Italian', 'Japanese', 'Mexican'][idx % 3],
          rating: 4.5 + Math.random() * 0.5,
          reviewCount: Math.floor(Math.random() * 500) + 200,
          image: `https://picsum.photos/300/200?random=${idx + 100}`,
          priceRange: ['$$', '$$$', '$$$$'][idx % 3],
          distance: Math.round(Math.random() * 30 * 10) / 10,
          promoted: true,
        })),
        recentlyViewed: [], // Would be populated from user session
      },
    };
  }

  @Post('save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save search query' })
  @ApiResponse({ status: 201 })
  async saveSearch(
    @Body() body: {
      query?: string;
      location?: string;
      filters?: any;
      results?: number;
    },
    @Req() req: any,
  ) {
    const savedSearch = {
      id: 'search-' + Date.now(),
      userId: req.user.sub,
      query: body.query,
      location: body.location,
      filters: body.filters,
      resultsCount: body.results,
      createdAt: new Date(),
    };

    return {
      success: true,
      data: savedSearch,
      message: 'Search saved successfully',
    };
  }

  @Get('saved/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved searches' })
  @ApiResponse({ status: 200 })
  async getSavedSearches(@Param('userId') userId: string, @Req() req: any) {
    const mockSavedSearches = Array.from({ length: 8 }, (_, idx) => ({
      id: `search-${idx}`,
      query: ['Italian near me', 'Best sushi', 'Romantic dinner', 'Family restaurant'][idx % 4],
      location: 'New York, NY',
      filters: {
        cuisine: ['Italian', 'Japanese', 'French', 'American'][idx % 4],
        priceRange: ['$$', '$$$'][idx % 2],
      },
      resultsCount: Math.floor(Math.random() * 50) + 10,
      lastUsed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
    }));

    return {
      success: true,
      data: mockSavedSearches,
    };
  }

  @Get('filters')
  @ApiOperation({ summary: 'Get available search filters' })
  @ApiResponse({ status: 200 })
  async getAvailableFilters(@Query('location') location?: string) {
    return {
      success: true,
      data: {
        cuisines: [
          { name: 'Italian', count: 245 },
          { name: 'Japanese', count: 189 },
          { name: 'Mexican', count: 156 },
          { name: 'American', count: 134 },
          { name: 'Indian', count: 98 },
          { name: 'Chinese', count: 87 },
          { name: 'French', count: 76 },
          { name: 'Thai', count: 65 },
        ],
        priceRanges: [
          { range: '$', description: 'Under $30', count: 234 },
          { range: '$$', description: '$30-60', count: 456 },
          { range: '$$$', description: '$60-100', count: 234 },
          { range: '$$$$', description: '$100+', count: 123 },
        ],
        features: [
          { name: 'outdoor_seating', label: 'Outdoor Seating', count: 167 },
          { name: 'valet_parking', label: 'Valet Parking', count: 89 },
          { name: 'wheelchair_accessible', label: 'Wheelchair Accessible', count: 234 },
          { name: 'private_dining', label: 'Private Dining', count: 45 },
          { name: 'live_music', label: 'Live Music', count: 67 },
          { name: 'bar', label: 'Full Bar', count: 189 },
          { name: 'brunch', label: 'Brunch Available', count: 134 },
          { name: 'late_night', label: 'Late Night Dining', count: 78 },
        ],
        neighborhoods: [
          { name: 'Manhattan', count: 456 },
          { name: 'Brooklyn', count: 234 },
          { name: 'Queens', count: 123 },
          { name: 'Upper East Side', count: 89 },
          { name: 'SoHo', count: 67 },
        ],
        sortOptions: [
          { value: 'relevance', label: 'Most Relevant' },
          { value: 'distance', label: 'Nearest' },
          { value: 'rating', label: 'Highest Rated' },
          { value: 'price_low', label: 'Price: Low to High' },
          { value: 'price_high', label: 'Price: High to Low' },
          { value: 'review_count', label: 'Most Reviewed' },
        ],
      },
    };
  }

  private generateAvailability() {
    const timeSlots = ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'];
    return timeSlots.filter(() => Math.random() > 0.3).map(time => ({
      time,
      available: true,
      partySize: Math.floor(Math.random() * 6) + 2,
    }));
  }

  private generatePopularTimes() {
    return {
      monday: [20, 25, 30, 35, 40, 45, 50, 55, 60, 55, 50, 45],
      tuesday: [25, 30, 35, 40, 45, 50, 55, 60, 65, 60, 55, 50],
      wednesday: [30, 35, 40, 45, 50, 55, 60, 65, 70, 65, 60, 55],
      thursday: [35, 40, 45, 50, 55, 60, 65, 70, 75, 70, 65, 60],
      friday: [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 80, 75],
      saturday: [45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 85, 80],
      sunday: [25, 30, 35, 40, 45, 50, 55, 60, 65, 60, 55, 50],
    };
  }
}