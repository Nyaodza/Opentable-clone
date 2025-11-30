import OpenAI from 'openai';
import { Op } from 'sequelize';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { Reservation } from '../models/Reservation';
import { Review } from '../models/Review';
import { RecommendationService } from './recommendation.service';
import { ReservationService } from './reservation.service';
import { RestaurantService } from './restaurant.service';
import { WeatherService } from './weather.service';
import { redisClient } from '../config/redis';
import { logInfo, logError } from '../utils/logger';

interface ConciergeRequest {
  message: string;
  userId: string;
  context?: {
    location?: { latitude: number; longitude: number };
    currentTime?: Date;
    previousConversation?: string[];
  };
}

interface ConciergeResponse {
  message: string;
  intent: 'search' | 'book' | 'recommend' | 'modify' | 'cancel' | 'info' | 'chat';
  confidence: number;
  actions?: Array<{
    type: string;
    data: any;
  }>;
  suggestions?: string[];
  restaurants?: any[];
  reservations?: any[];
}

interface ParsedIntent {
  type: 'search' | 'book' | 'recommend' | 'modify' | 'cancel' | 'info' | 'chat';
  entities: {
    cuisine?: string;
    location?: string;
    date?: string;
    time?: string;
    partySize?: number;
    priceRange?: string;
    mood?: string;
    occasion?: string;
    dietary?: string[];
    weather?: boolean;
  };
  confidence: number;
}

export class AIConciergeService {
  private static openai: OpenAI;
  private static readonly CACHE_TTL = 300; // 5 minutes

  static async initialize(): Promise<void> {
    if (!process.env.OPENAI_API_KEY) {
      logError('OpenAI API key not configured');
      return;
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logInfo('AI Concierge service initialized');
  }

  /**
   * Process natural language request from user
   */
  static async processRequest(request: ConciergeRequest): Promise<ConciergeResponse> {
    try {
      // Parse user intent
      const intent = await this.parseIntent(request.message);
      
      // Get user context
      const userContext = await this.getUserContext(request.userId);
      
      // Process based on intent
      let response: ConciergeResponse;
      
      switch (intent.type) {
        case 'search':
          response = await this.handleSearchIntent(intent, userContext, request);
          break;
        case 'book':
          response = await this.handleBookingIntent(intent, userContext, request);
          break;
        case 'recommend':
          response = await this.handleRecommendationIntent(intent, userContext, request);
          break;
        case 'modify':
          response = await this.handleModifyIntent(intent, userContext, request);
          break;
        case 'cancel':
          response = await this.handleCancelIntent(intent, userContext, request);
          break;
        case 'info':
          response = await this.handleInfoIntent(intent, userContext, request);
          break;
        default:
          response = await this.handleChatIntent(intent, userContext, request);
      }

      // Store conversation context
      await this.storeConversationContext(request.userId, request.message, response.message);

      return response;
    } catch (error) {
      logError('Error processing concierge request:', error);
      return {
        message: "I'm sorry, I encountered an error processing your request. Please try again or contact support.",
        intent: 'chat',
        confidence: 0,
      };
    }
  }

  /**
   * Parse user intent using OpenAI
   */
  private static async parseIntent(message: string): Promise<ParsedIntent> {
    if (!this.openai) {
      // Fallback to rule-based parsing
      return this.parseIntentRuleBased(message);
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that parses restaurant booking intents. 
            Analyze the user message and extract:
            1. Intent type: search, book, recommend, modify, cancel, info, or chat
            2. Entities: cuisine, location, date, time, partySize, priceRange, mood, occasion, dietary restrictions
            3. Confidence score (0-1)
            
            Respond in JSON format only.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const result = completion.choices[0]?.message?.content;
      if (result) {
        return JSON.parse(result);
      }
    } catch (error) {
      logError('Error parsing intent with OpenAI:', error);
    }

    // Fallback to rule-based parsing
    return this.parseIntentRuleBased(message);
  }

  /**
   * Rule-based intent parsing fallback
   */
  private static parseIntentRuleBased(message: string): ParsedIntent {
    const lowerMessage = message.toLowerCase();
    
    const intent: ParsedIntent = {
      type: 'chat',
      entities: {},
      confidence: 0.7,
    };

    // Intent detection
    if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('looking for')) {
      intent.type = 'search';
    } else if (lowerMessage.includes('book') || lowerMessage.includes('reserve') || lowerMessage.includes('table')) {
      intent.type = 'book';
    } else if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('what should')) {
      intent.type = 'recommend';
    } else if (lowerMessage.includes('change') || lowerMessage.includes('modify') || lowerMessage.includes('update')) {
      intent.type = 'modify';
    } else if (lowerMessage.includes('cancel') || lowerMessage.includes('delete')) {
      intent.type = 'cancel';
    } else if (lowerMessage.includes('info') || lowerMessage.includes('details') || lowerMessage.includes('about')) {
      intent.type = 'info';
    }

    // Entity extraction
    const cuisines = ['italian', 'chinese', 'japanese', 'mexican', 'indian', 'french', 'thai', 'american'];
    for (const cuisine of cuisines) {
      if (lowerMessage.includes(cuisine)) {
        intent.entities.cuisine = cuisine;
        break;
      }
    }

    // Time extraction
    const timeMatch = lowerMessage.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    if (timeMatch) {
      intent.entities.time = timeMatch[0];
    }

    // Date extraction
    if (lowerMessage.includes('today')) {
      intent.entities.date = 'today';
    } else if (lowerMessage.includes('tomorrow')) {
      intent.entities.date = 'tomorrow';
    } else if (lowerMessage.includes('tonight')) {
      intent.entities.date = 'today';
      intent.entities.time = 'evening';
    }

    // Party size extraction
    const partySizeMatch = lowerMessage.match(/(\d+)\s*(people|person|guests?)/);
    if (partySizeMatch) {
      intent.entities.partySize = parseInt(partySizeMatch[1]);
    }

    // Price range extraction
    if (lowerMessage.includes('cheap') || lowerMessage.includes('budget')) {
      intent.entities.priceRange = 'BUDGET';
    } else if (lowerMessage.includes('expensive') || lowerMessage.includes('fancy') || lowerMessage.includes('upscale')) {
      intent.entities.priceRange = 'EXPENSIVE';
    }

    // Mood/occasion extraction
    if (lowerMessage.includes('romantic') || lowerMessage.includes('date')) {
      intent.entities.mood = 'romantic';
      intent.entities.occasion = 'date';
    } else if (lowerMessage.includes('business') || lowerMessage.includes('meeting')) {
      intent.entities.occasion = 'business';
    } else if (lowerMessage.includes('celebration') || lowerMessage.includes('birthday')) {
      intent.entities.occasion = 'celebration';
    }

    return intent;
  }

  /**
   * Get user context and preferences
   */
  private static async getUserContext(userId: string): Promise<any> {
    const cacheKey = `concierge:context:${userId}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'cuisinePreferences', 'dietaryRestrictions', 'priceRangePreferences'],
    });

    const recentReservations = await Reservation.findAll({
      where: { userId },
      include: [{ model: Restaurant, attributes: ['name', 'cuisine', 'priceRange'] }],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    const context = {
      user,
      recentReservations,
      preferences: {
        cuisines: user?.cuisinePreferences || [],
        dietary: user?.dietaryRestrictions || [],
        priceRanges: user?.priceRangePreferences || [],
      },
    };

    await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(context));
    return context;
  }

  /**
   * Handle search intent
   */
  private static async handleSearchIntent(
    intent: ParsedIntent,
    userContext: any,
    request: ConciergeRequest
  ): Promise<ConciergeResponse> {
    const searchParams: any = {
      limit: 10,
    };

    // Apply extracted entities
    if (intent.entities.cuisine) {
      searchParams.cuisine = intent.entities.cuisine;
    }
    if (intent.entities.priceRange) {
      searchParams.priceRange = intent.entities.priceRange;
    }
    if (intent.entities.location) {
      searchParams.city = intent.entities.location;
    }
    if (request.context?.location) {
      searchParams.latitude = request.context.location.latitude;
      searchParams.longitude = request.context.location.longitude;
      searchParams.radius = 5000; // 5km
    }

    // Apply user preferences if no specific criteria
    if (!intent.entities.cuisine && userContext.preferences.cuisines.length > 0) {
      searchParams.cuisine = userContext.preferences.cuisines[0];
    }

    const restaurants = await RestaurantService.searchRestaurants(searchParams);

    let message = `I found ${restaurants.total} restaurants`;
    if (intent.entities.cuisine) {
      message += ` serving ${intent.entities.cuisine} cuisine`;
    }
    if (intent.entities.location) {
      message += ` in ${intent.entities.location}`;
    }
    message += '. Here are the top options:';

    const suggestions = [
      'Would you like to book a table at any of these?',
      'Need more details about any restaurant?',
      'Want to see restaurants with different criteria?',
    ];

    return {
      message,
      intent: 'search',
      confidence: intent.confidence,
      restaurants: restaurants.restaurants.slice(0, 5),
      suggestions,
    };
  }

  /**
   * Handle booking intent
   */
  private static async handleBookingIntent(
    intent: ParsedIntent,
    userContext: any,
    request: ConciergeRequest
  ): Promise<ConciergeResponse> {
    // Check if we have enough information to make a booking
    const missingInfo = [];
    
    if (!intent.entities.date) missingInfo.push('date');
    if (!intent.entities.time) missingInfo.push('time');
    if (!intent.entities.partySize) missingInfo.push('party size');

    if (missingInfo.length > 0) {
      return {
        message: `I'd be happy to help you book a table! I need a bit more information: ${missingInfo.join(', ')}. For example, "Book a table for 4 people tomorrow at 7 PM".`,
        intent: 'book',
        confidence: intent.confidence,
        suggestions: [
          'Book for 2 people tonight at 7 PM',
          'Reserve a table for 4 tomorrow at 6:30 PM',
          'Book lunch for 3 people today at 12:30 PM',
        ],
      };
    }

    // If we have restaurant criteria, search first
    if (intent.entities.cuisine || intent.entities.location || intent.entities.priceRange) {
      const searchParams: any = {
        limit: 5,
        cuisine: intent.entities.cuisine,
        priceRange: intent.entities.priceRange,
        city: intent.entities.location,
      };

      const restaurants = await RestaurantService.searchRestaurants(searchParams);
      
      if (restaurants.restaurants.length === 0) {
        return {
          message: "I couldn't find any restaurants matching your criteria. Would you like to try different options?",
          intent: 'book',
          confidence: intent.confidence,
          suggestions: [
            'Show me all available restaurants',
            'Try a different cuisine type',
            'Search in a different area',
          ],
        };
      }

      return {
        message: `I found several restaurants for your booking. Which one would you prefer?`,
        intent: 'book',
        confidence: intent.confidence,
        restaurants: restaurants.restaurants,
        actions: [{
          type: 'SELECT_RESTAURANT_FOR_BOOKING',
          data: {
            date: intent.entities.date,
            time: intent.entities.time,
            partySize: intent.entities.partySize,
          },
        }],
      };
    }

    return {
      message: "I'd be happy to help you book a table! Which restaurant would you like to book at?",
      intent: 'book',
      confidence: intent.confidence,
      suggestions: [
        'Show me Italian restaurants',
        'Find restaurants near me',
        'Recommend something for tonight',
      ],
    };
  }

  /**
   * Handle recommendation intent
   */
  private static async handleRecommendationIntent(
    intent: ParsedIntent,
    userContext: any,
    request: ConciergeRequest
  ): Promise<ConciergeResponse> {
    // Get personalized recommendations
    const recommendations = await RecommendationService.getPersonalizedRecommendations(
      request.userId,
      {
        limit: 5,
        location: request.context?.location,
      }
    );

    // Consider weather if requested
    let weatherContext = '';
    if (intent.entities.weather && request.context?.location) {
      try {
        const weather = await WeatherService.getCurrentWeather(
          request.context.location.latitude,
          request.context.location.longitude
        );
        
        if (weather.temperature > 75) {
          weatherContext = ' Since it\'s nice weather, I\'ve included restaurants with outdoor seating.';
        } else if (weather.condition.includes('rain')) {
          weatherContext = ' Given the rainy weather, I\'ve focused on cozy indoor spots.';
        }
      } catch (error) {
        // Weather service error, continue without weather context
      }
    }

    let message = `Based on your preferences and dining history, here are my top recommendations`;
    if (intent.entities.mood) {
      message += ` for a ${intent.entities.mood} experience`;
    }
    if (intent.entities.occasion) {
      message += ` for your ${intent.entities.occasion}`;
    }
    message += `:${weatherContext}`;

    const restaurants = await Promise.all(
      recommendations.map(async (rec) => {
        const restaurant = await Restaurant.findByPk(rec.restaurantId);
        return {
          ...restaurant?.toJSON(),
          matchPercentage: rec.matchPercentage,
          reasons: rec.reasons,
        };
      })
    );

    return {
      message,
      intent: 'recommend',
      confidence: intent.confidence,
      restaurants: restaurants.filter(Boolean),
      suggestions: [
        'Book a table at one of these restaurants',
        'Tell me more about any of these options',
        'Show me different recommendations',
      ],
    };
  }

  /**
   * Handle modify intent
   */
  private static async handleModifyIntent(
    intent: ParsedIntent,
    userContext: any,
    request: ConciergeRequest
  ): Promise<ConciergeResponse> {
    // Get user's upcoming reservations
    const upcomingReservations = await Reservation.findAll({
      where: {
        userId: request.userId,
        date: { [Op.gte]: new Date() },
        status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
      },
      include: [{ model: Restaurant, attributes: ['name'] }],
      order: [['date', 'ASC']],
      limit: 5,
    });

    if (upcomingReservations.length === 0) {
      return {
        message: "You don't have any upcoming reservations to modify. Would you like to make a new booking?",
        intent: 'modify',
        confidence: intent.confidence,
        suggestions: [
          'Make a new reservation',
          'View past reservations',
          'Search for restaurants',
        ],
      };
    }

    return {
      message: `Here are your upcoming reservations. Which one would you like to modify?`,
      intent: 'modify',
      confidence: intent.confidence,
      reservations: upcomingReservations,
      actions: [{
        type: 'SELECT_RESERVATION_TO_MODIFY',
        data: {
          newDate: intent.entities.date,
          newTime: intent.entities.time,
          newPartySize: intent.entities.partySize,
        },
      }],
    };
  }

  /**
   * Handle cancel intent
   */
  private static async handleCancelIntent(
    intent: ParsedIntent,
    userContext: any,
    request: ConciergeRequest
  ): Promise<ConciergeResponse> {
    // Get user's upcoming reservations
    const upcomingReservations = await Reservation.findAll({
      where: {
        userId: request.userId,
        date: { [Op.gte]: new Date() },
        status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
      },
      include: [{ model: Restaurant, attributes: ['name'] }],
      order: [['date', 'ASC']],
      limit: 5,
    });

    if (upcomingReservations.length === 0) {
      return {
        message: "You don't have any upcoming reservations to cancel.",
        intent: 'cancel',
        confidence: intent.confidence,
        suggestions: [
          'Make a new reservation',
          'Search for restaurants',
          'View past reservations',
        ],
      };
    }

    return {
      message: `Here are your upcoming reservations. Which one would you like to cancel?`,
      intent: 'cancel',
      confidence: intent.confidence,
      reservations: upcomingReservations,
      actions: [{
        type: 'SELECT_RESERVATION_TO_CANCEL',
        data: {},
      }],
    };
  }

  /**
   * Handle info intent
   */
  private static async handleInfoIntent(
    intent: ParsedIntent,
    userContext: any,
    request: ConciergeRequest
  ): Promise<ConciergeResponse> {
    return {
      message: "I can help you with restaurant information! What would you like to know about?",
      intent: 'info',
      confidence: intent.confidence,
      suggestions: [
        'Tell me about a specific restaurant',
        'What are the hours for [restaurant name]?',
        'Show me reviews for [restaurant name]',
      ],
    };
  }

  /**
   * Handle general chat intent
   */
  private static async handleChatIntent(
    intent: ParsedIntent,
    userContext: any,
    request: ConciergeRequest
  ): Promise<ConciergeResponse> {
    const greetings = [
      `Hi ${userContext.user?.firstName || 'there'}! I'm your dining concierge. How can I help you find the perfect restaurant today?`,
      `Hello! I'm here to help you discover amazing dining experiences. What are you in the mood for?`,
      `Welcome! I can help you search for restaurants, make reservations, or get personalized recommendations. What would you like to do?`,
    ];

    return {
      message: greetings[Math.floor(Math.random() * greetings.length)],
      intent: 'chat',
      confidence: 0.8,
      suggestions: [
        'Find Italian restaurants near me',
        'Book a table for tonight',
        'Recommend something romantic',
        'Show me my reservations',
      ],
    };
  }

  /**
   * Store conversation context for continuity
   */
  private static async storeConversationContext(
    userId: string,
    userMessage: string,
    botResponse: string
  ): Promise<void> {
    const key = `concierge:conversation:${userId}`;
    const conversation = {
      timestamp: new Date().toISOString(),
      user: userMessage,
      bot: botResponse,
    };

    // Keep last 10 messages
    const existingConversation = await redisClient.lrange(key, 0, -1);
    await redisClient.lpush(key, JSON.stringify(conversation));
    await redisClient.ltrim(key, 0, 9);
    await redisClient.expire(key, 3600); // 1 hour TTL
  }

  /**
   * Get conversation history
   */
  static async getConversationHistory(userId: string): Promise<any[]> {
    const key = `concierge:conversation:${userId}`;
    const messages = await redisClient.lrange(key, 0, -1);
    return messages.map(msg => JSON.parse(msg)).reverse();
  }
}

// Weather service placeholder
class WeatherService {
  static async getCurrentWeather(lat: number, lon: number) {
    // Mock weather data - in production, integrate with weather API
    return {
      temperature: 72,
      condition: 'sunny',
      humidity: 45,
    };
  }
}
