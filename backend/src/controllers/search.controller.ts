import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service';
import { CuisineType, PriceRange } from '../models/Restaurant';
import { logInfo } from '../utils/logger';

export const searchRestaurants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      query,
      cuisineTypes,
      priceRanges,
      latitude,
      longitude,
      radius,
      city,
      state,
      rating,
      amenities,
      date,
      time,
      partySize,
      availability,
      features,
      dietaryRestrictions,
      sortBy,
      page,
      limit
    } = req.query;

    // Build filters
    const filters: any = {};

    // Text search
    if (q || query) {
      filters.query = (q || query) as string;
    }

    // Cuisine types
    if (cuisineTypes) {
      filters.cuisineTypes = Array.isArray(cuisineTypes) 
        ? cuisineTypes as CuisineType[]
        : [cuisineTypes as CuisineType];
    }

    // Price ranges
    if (priceRanges) {
      filters.priceRanges = Array.isArray(priceRanges)
        ? priceRanges as PriceRange[]
        : [priceRanges as PriceRange];
    }

    // Location
    if (latitude && longitude) {
      filters.location = {
        latitude: parseFloat(latitude as string),
        longitude: parseFloat(longitude as string),
        radius: radius ? parseFloat(radius as string) : 10
      };
    }

    if (city) filters.city = city as string;
    if (state) filters.state = state as string;

    // Rating
    if (rating) {
      filters.rating = parseFloat(rating as string);
    }

    // Amenities
    if (amenities) {
      filters.amenities = Array.isArray(amenities)
        ? amenities as string[]
        : [amenities as string];
    }

    // Availability
    if (date && time && partySize) {
      const dateTime = new Date(`${date}T${time}`);
      filters.dateTime = dateTime;
      filters.partySize = parseInt(partySize as string);
      
      if (availability) {
        filters.availability = availability as 'any' | 'available' | 'waitlist';
      }
    }

    // Features
    if (features) {
      filters.features = Array.isArray(features)
        ? features as string[]
        : [features as string];
    }

    // Dietary restrictions
    if (dietaryRestrictions) {
      filters.dietaryRestrictions = Array.isArray(dietaryRestrictions)
        ? dietaryRestrictions as string[]
        : [dietaryRestrictions as string];
    }

    // Sorting
    if (sortBy) {
      filters.sortBy = sortBy as any;
    }

    // Pagination
    filters.page = page ? parseInt(page as string) : 1;
    filters.limit = limit ? parseInt(limit as string) : 20;

    const results = await SearchService.searchRestaurants(filters);

    logInfo('Restaurant search performed', {
      filters,
      resultsCount: results.restaurants.length,
      total: results.total
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

export const getSearchSuggestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, limit } = req.query;

    if (!q || (q as string).length < 2) {
      return res.json({
        success: true,
        data: {
          restaurants: [],
          cuisines: [],
          cities: []
        }
      });
    }

    const suggestions = await SearchService.getSearchSuggestions(
      q as string,
      limit ? parseInt(limit as string) : 10
    );

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    next(error);
  }
};

export const getPopularSearches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { city, state } = req.query;

    const location = (city || state) ? {
      city: city as string,
      state: state as string
    } : undefined;

    const popular = await SearchService.getPopularSearches(location);

    res.json({
      success: true,
      data: popular
    });
  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit } = req.query;

    const recommendations = await SearchService.getRecommendations(
      req.user!.id,
      limit ? parseInt(limit as string) : 10
    );

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
};

export const getCuisineTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cuisines = Object.values(CuisineType).map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
    }));

    res.json({
      success: true,
      data: cuisines
    });
  } catch (error) {
    next(error);
  }
};

export const getPriceRanges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const priceRanges = [
      { value: PriceRange.BUDGET, label: '$', description: 'Under $15 per person' },
      { value: PriceRange.MODERATE, label: '$$', description: '$15-30 per person' },
      { value: PriceRange.UPSCALE, label: '$$$', description: '$31-60 per person' },
      { value: PriceRange.FINE_DINING, label: '$$$$', description: 'Over $60 per person' }
    ];

    res.json({
      success: true,
      data: priceRanges
    });
  } catch (error) {
    next(error);
  }
};

export const getAmenities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const amenities = [
      { value: 'outdoor_seating', label: 'Outdoor Seating', icon: 'outdoor' },
      { value: 'private_dining', label: 'Private Dining', icon: 'private' },
      { value: 'bar', label: 'Bar', icon: 'bar' },
      { value: 'wine_list', label: 'Wine List', icon: 'wine' },
      { value: 'cocktails', label: 'Cocktails', icon: 'cocktail' },
      { value: 'happy_hour', label: 'Happy Hour', icon: 'happy' },
      { value: 'live_music', label: 'Live Music', icon: 'music' },
      { value: 'dj', label: 'DJ', icon: 'dj' },
      { value: 'dancing', label: 'Dancing', icon: 'dance' },
      { value: 'pool_table', label: 'Pool Table', icon: 'pool' },
      { value: 'sports_tv', label: 'Sports TV', icon: 'tv' },
      { value: 'karaoke', label: 'Karaoke', icon: 'mic' },
      { value: 'games', label: 'Games', icon: 'game' },
      { value: 'wifi', label: 'WiFi', icon: 'wifi' },
      { value: 'parking', label: 'Parking', icon: 'parking' },
      { value: 'valet', label: 'Valet Parking', icon: 'valet' },
      { value: 'wheelchair_accessible', label: 'Wheelchair Accessible', icon: 'accessible' },
      { value: 'dog_friendly', label: 'Dog Friendly', icon: 'pets' },
      { value: 'kid_friendly', label: 'Kid Friendly', icon: 'child' },
      { value: 'group_dining', label: 'Good for Groups', icon: 'group' },
      { value: 'romantic', label: 'Romantic', icon: 'heart' },
      { value: 'business_dining', label: 'Business Dining', icon: 'business' },
      { value: 'waterfront', label: 'Waterfront', icon: 'water' },
      { value: 'rooftop', label: 'Rooftop', icon: 'rooftop' },
      { value: 'fireplace', label: 'Fireplace', icon: 'fire' },
      { value: 'historic', label: 'Historic Building', icon: 'historic' }
    ];

    res.json({
      success: true,
      data: amenities
    });
  } catch (error) {
    next(error);
  }
};

export const getDietaryOptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dietaryOptions = [
      { value: 'vegetarian', label: 'Vegetarian Options' },
      { value: 'vegan', label: 'Vegan Options' },
      { value: 'gluten_free', label: 'Gluten-Free Options' },
      { value: 'dairy_free', label: 'Dairy-Free Options' },
      { value: 'nut_free', label: 'Nut-Free Options' },
      { value: 'halal', label: 'Halal Options' },
      { value: 'kosher', label: 'Kosher Options' },
      { value: 'organic', label: 'Organic Options' },
      { value: 'low_carb', label: 'Low-Carb Options' },
      { value: 'keto', label: 'Keto-Friendly' },
      { value: 'paleo', label: 'Paleo-Friendly' }
    ];

    res.json({
      success: true,
      data: dietaryOptions
    });
  } catch (error) {
    next(error);
  }
};