import { apiClient } from '../api/client';

export interface UserPreferences {
  cuisineTypes: string[];
  priceRanges: string[];
  dietaryRestrictions: string[];
  features: string[];
  location: {
    latitude: number;
    longitude: number;
    radius: number; // in miles
  };
  maxTravelTime?: number; // in minutes
  favoriteRestaurants: string[];
  blacklistedRestaurants: string[];
  averageSpending: number;
  diningFrequency: 'occasional' | 'regular' | 'frequent';
  preferredMealTimes: string[];
  groupSizes: number[];
}

export interface RestaurantRecommendation {
  restaurantId: string;
  name: string;
  cuisineType: string;
  priceRange: string;
  averageRating: number;
  totalReviews: number;
  images: string[];
  distance: number;
  estimatedTravelTime: number;
  confidence: number; // 0-1 score
  reasoning: string[];
  tags: string[];
  availability?: {
    date: string;
    timeSlots: string[];
  };
  specialOffers?: Array<{
    title: string;
    description: string;
    discount: number;
    validUntil: string;
  }>;
}

export interface SimilarUser {
  userId: string;
  similarityScore: number;
  sharedPreferences: string[];
  recommendations: string[];
}

export interface TrendingItem {
  type: 'restaurant' | 'cuisine' | 'dish';
  id: string;
  name: string;
  score: number;
  growth: number; // percentage
  timeframe: 'day' | 'week' | 'month';
  metadata?: any;
}

export interface PersonalizedSearch {
  query: string;
  filters: {
    cuisine?: string[];
    priceRange?: string[];
    rating?: number;
    distance?: number;
    features?: string[];
    openNow?: boolean;
    hasAvailability?: boolean;
  };
  userContext: {
    location: { latitude: number; longitude: number };
    timeOfDay: string;
    dayOfWeek: string;
    partySize: number;
    occasion?: string;
  };
  preferences: UserPreferences;
}

class AIRecommendationService {
  // Machine Learning Recommendations
  async getPersonalizedRecommendations(
    userId: string,
    params?: {
      location?: { latitude: number; longitude: number };
      occasion?: string;
      partySize?: number;
      date?: string;
      time?: string;
      limit?: number;
    }
  ): Promise<RestaurantRecommendation[]> {
    return await apiClient.get('/ai/recommendations/personalized', {
      userId,
      ...params,
    });
  }

  async getCollaborativeRecommendations(
    userId: string,
    limit = 10
  ): Promise<{
    recommendations: RestaurantRecommendation[];
    similarUsers: SimilarUser[];
    explanation: string;
  }> {
    return await apiClient.get('/ai/recommendations/collaborative', {
      userId,
      limit,
    });
  }

  async getContentBasedRecommendations(
    restaurantIds: string[],
    limit = 10
  ): Promise<RestaurantRecommendation[]> {
    return await apiClient.post('/ai/recommendations/content-based', {
      restaurantIds,
      limit,
    });
  }

  async getHybridRecommendations(
    userId: string,
    params?: {
      location?: { latitude: number; longitude: number };
      occasion?: string;
      partySize?: number;
      date?: string;
      time?: string;
      limit?: number;
      includeNewRestaurants?: boolean;
    }
  ): Promise<{
    recommendations: RestaurantRecommendation[];
    methodology: {
      collaborative: number;
      contentBased: number;
      locationBased: number;
      popularityBased: number;
      newRestaurantBoost: number;
    };
  }> {
    return await apiClient.get('/ai/recommendations/hybrid', {
      userId,
      ...params,
    });
  }

  // Intelligent Search
  async intelligentSearch(searchParams: PersonalizedSearch): Promise<{
    results: RestaurantRecommendation[];
    query: {
      original: string;
      interpreted: string;
      intent: string;
      entities: Array<{
        type: string;
        value: string;
        confidence: number;
      }>;
    };
    suggestions: string[];
    filters: {
      applied: any;
      suggested: any;
    };
  }> {
    return await apiClient.post('/ai/search/intelligent', searchParams);
  }

  async getSearchSuggestions(
    query: string,
    userContext?: {
      location?: { latitude: number; longitude: number };
      recentSearches?: string[];
      preferences?: Partial<UserPreferences>;
    }
  ): Promise<{
    suggestions: Array<{
      text: string;
      type: 'restaurant' | 'cuisine' | 'location' | 'feature';
      confidence: number;
      metadata?: any;
    }>;
    autoComplete: string[];
  }> {
    return await apiClient.get('/ai/search/suggestions', {
      query,
      userContext,
    });
  }

  async getNaturalLanguageSearch(
    naturalQuery: string,
    userContext: {
      location: { latitude: number; longitude: number };
      userId?: string;
      currentTime?: string;
    }
  ): Promise<{
    interpretedQuery: {
      cuisine?: string;
      priceRange?: string;
      location?: string;
      time?: string;
      partySize?: number;
      occasion?: string;
      features?: string[];
    };
    results: RestaurantRecommendation[];
    confidence: number;
    explanation: string;
  }> {
    return await apiClient.post('/ai/search/natural-language', {
      query: naturalQuery,
      userContext,
    });
  }

  // Trending and Discovery
  async getTrendingNow(
    location?: { latitude: number; longitude: number },
    timeframe: 'hour' | 'day' | 'week' = 'day'
  ): Promise<{
    trending: TrendingItem[];
    hotspots: Array<{
      name: string;
      location: { latitude: number; longitude: number };
      restaurantCount: number;
      averageRating: number;
      trending: boolean;
    }>;
  }> {
    return await apiClient.get('/ai/trending', {
      location,
      timeframe,
    });
  }

  async getDiscoveryRecommendations(
    userId: string,
    params?: {
      exploreRadius?: number;
      includeNewCuisines?: boolean;
      adventureLevel?: 'conservative' | 'moderate' | 'adventurous';
      limit?: number;
    }
  ): Promise<{
    recommendations: RestaurantRecommendation[];
    discoveryReason: Array<{
      restaurantId: string;
      reasons: string[];
      noveltyScore: number;
    }>;
  }> {
    return await apiClient.get('/ai/discovery', {
      userId,
      ...params,
    });
  }

  async getSeasonalRecommendations(
    location: { latitude: number; longitude: number },
    userId?: string
  ): Promise<{
    seasonal: RestaurantRecommendation[];
    weather: {
      current: any;
      recommendations: string[];
    };
    events: Array<{
      name: string;
      date: string;
      relevantRestaurants: string[];
    }>;
  }> {
    return await apiClient.get('/ai/seasonal', {
      location,
      userId,
    });
  }

  // Prediction and Analytics
  async predictUserPreferences(
    userId: string,
    behaviorData: {
      reservations: any[];
      searches: any[];
      reviews: any[];
      favorites: any[];
    }
  ): Promise<{
    predictedPreferences: UserPreferences;
    confidence: number;
    changesFromCurrent: Array<{
      category: string;
      old: any;
      new: any;
      confidence: number;
    }>;
  }> {
    return await apiClient.post('/ai/predict/preferences', {
      userId,
      behaviorData,
    });
  }

  async getDemandPrediction(
    restaurantId: string,
    date: string,
    timeWindow: string
  ): Promise<{
    prediction: {
      expectedDemand: number;
      confidence: number;
      factors: Array<{
        factor: string;
        impact: number;
        description: string;
      }>;
    };
    recommendations: {
      staffing: number;
      inventory: string[];
      pricing: {
        suggested: number;
        reasoning: string;
      };
    };
  }> {
    return await apiClient.get('/ai/predict/demand', {
      restaurantId,
      date,
      timeWindow,
    });
  }

  async getOptimalReservationTimes(
    restaurantId: string,
    date: string,
    partySize: number
  ): Promise<{
    optimalTimes: Array<{
      time: string;
      score: number;
      reasoning: string[];
      alternativeOptions: string[];
    }>;
    busyPeriods: Array<{
      start: string;
      end: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  }> {
    return await apiClient.get('/ai/optimal-times', {
      restaurantId,
      date,
      partySize,
    });
  }

  // User Behavior Analysis
  async getUserInsights(userId: string): Promise<{
    profile: {
      diningPersonality: string;
      adventurousness: number;
      priceConsciousness: number;
      loyaltyTendency: number;
      socialDiner: boolean;
    };
    patterns: {
      preferredDays: string[];
      preferredTimes: string[];
      averageSpending: number;
      bookingLeadTime: number;
      noShowRate: number;
    };
    recommendations: {
      suggestedCuisines: string[];
      newRestaurants: string[];
      optimalBookingTimes: string[];
    };
  }> {
    return await apiClient.get('/ai/user/insights', { userId });
  }

  async getGroupDiningRecommendations(
    userIds: string[],
    constraints?: {
      location?: { latitude: number; longitude: number };
      maxDistance?: number;
      budgetRange?: [number, number];
      dietaryRestrictions?: string[];
      occasion?: string;
    }
  ): Promise<{
    recommendations: RestaurantRecommendation[];
    consensus: {
      sharedPreferences: string[];
      conflicts: Array<{
        category: string;
        preferences: Array<{
          userId: string;
          preference: string;
        }>;
        resolution: string;
      }>;
    };
    alternatives: Array<{
      restaurantId: string;
      compromiseScore: number;
      reasoning: string;
    }>;
  }> {
    return await apiClient.post('/ai/group-dining', {
      userIds,
      constraints,
    });
  }

  // Real-time Learning
  async recordInteraction(
    userId: string,
    interaction: {
      type: 'view' | 'click' | 'book' | 'favorite' | 'review' | 'search';
      target: {
        restaurantId?: string;
        query?: string;
        filters?: any;
      };
      context: {
        location?: { latitude: number; longitude: number };
        timeOfDay: string;
        dayOfWeek: string;
        sessionDuration?: number;
      };
      outcome?: 'positive' | 'negative' | 'neutral';
    }
  ): Promise<{ recorded: boolean; userId: string }> {
    return await apiClient.post('/ai/interactions', {
      userId,
      interaction,
    });
  }

  async getFeedbackImpact(
    userId: string,
    feedback: {
      restaurantId: string;
      rating: number;
      aspects: Array<{
        category: string;
        rating: number;
        comment?: string;
      }>;
    }
  ): Promise<{
    impact: {
      personalRecommendations: string;
      similarUsers: string;
      globalModel: string;
    };
    updatedPreferences: Partial<UserPreferences>;
  }> {
    return await apiClient.post('/ai/feedback', {
      userId,
      feedback,
    });
  }

  // A/B Testing and Experimentation
  async getRecommendationVariant(
    userId: string,
    experimentId: string
  ): Promise<{
    variant: string;
    recommendations: RestaurantRecommendation[];
    metadata: {
      algorithm: string;
      parameters: any;
      personalizationLevel: number;
    };
  }> {
    return await apiClient.get('/ai/experiments/variant', {
      userId,
      experimentId,
    });
  }

  async recordExperimentResult(
    userId: string,
    experimentId: string,
    variant: string,
    outcome: {
      clicked: boolean;
      booked: boolean;
      timeToDecision?: number;
      rating?: number;
    }
  ): Promise<{ recorded: boolean }> {
    return await apiClient.post('/ai/experiments/result', {
      userId,
      experimentId,
      variant,
      outcome,
    });
  }

  // Explanation and Transparency
  async explainRecommendation(
    userId: string,
    restaurantId: string
  ): Promise<{
    explanation: {
      primary: string;
      factors: Array<{
        factor: string;
        weight: number;
        explanation: string;
        userSpecific: boolean;
      }>;
      confidence: number;
    };
    alternatives: Array<{
      restaurantId: string;
      reason: string;
    }>;
    improvementSuggestions: string[];
  }> {
    return await apiClient.get('/ai/explain', {
      userId,
      restaurantId,
    });
  }

  async getModelMetadata(): Promise<{
    version: string;
    lastTrained: string;
    accuracy: {
      overall: number;
      bySegment: Array<{
        segment: string;
        accuracy: number;
        sampleSize: number;
      }>;
    };
    features: string[];
    capabilities: string[];
  }> {
    return await apiClient.get('/ai/model/metadata');
  }
}

// Singleton instance
export const aiRecommendationService = new AIRecommendationService();

// React hooks for AI recommendations
export function usePersonalizedRecommendations(
  userId: string,
  params?: Parameters<AIRecommendationService['getPersonalizedRecommendations']>[1]
) {
  const [recommendations, setRecommendations] = React.useState<RestaurantRecommendation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (userId) {
      setLoading(true);
      aiRecommendationService
        .getPersonalizedRecommendations(userId, params)
        .then(setRecommendations)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [userId, JSON.stringify(params)]);

  return { recommendations, loading, error };
}

export function useIntelligentSearch() {
  const [results, setResults] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const search = React.useCallback(async (searchParams: PersonalizedSearch) => {
    setLoading(true);
    setError(null);
    try {
      const searchResults = await aiRecommendationService.intelligentSearch(searchParams);
      setResults(searchResults);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

export function useTrending(
  location?: { latitude: number; longitude: number },
  timeframe: 'hour' | 'day' | 'week' = 'day'
) {
  const [trending, setTrending] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    aiRecommendationService
      .getTrendingNow(location, timeframe)
      .then(setTrending)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [JSON.stringify(location), timeframe]);

  return { trending, loading, error };
}

export default aiRecommendationService;