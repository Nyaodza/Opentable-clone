import { Configuration, OpenAIApi } from 'openai';
import { redisClient } from '../config/redis';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { ReservationService } from './reservation.service';
import { TranslationService } from './translation.service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatContext {
  userId?: string;
  sessionId: string;
  locale: string;
  messages: ChatMessage[];
  metadata?: {
    restaurantId?: string;
    reservationId?: string;
    intent?: string;
  };
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  actions?: ChatAction[];
  requiresHumanAgent?: boolean;
}

export interface ChatAction {
  type: 'book_reservation' | 'show_restaurant' | 'cancel_reservation' | 'modify_reservation';
  data: any;
}

export class ChatbotService {
  private static openai: OpenAIApi;
  private static readonly CONTEXT_TTL = 1800; // 30 minutes
  private static readonly MAX_CONTEXT_LENGTH = 20;

  static initialize() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  static async processMessage(
    sessionId: string,
    message: string,
    userId?: string,
    locale: string = 'en'
  ): Promise<ChatResponse> {
    // Get or create context
    const context = await this.getContext(sessionId, userId, locale);
    
    // Add user message to context
    context.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Detect intent
    const intent = await this.detectIntent(message, context);
    context.metadata = { ...context.metadata, intent };

    // Process based on intent
    let response: ChatResponse;
    
    switch (intent) {
      case 'book_reservation':
        response = await this.handleBookingIntent(message, context);
        break;
      case 'check_availability':
        response = await this.handleAvailabilityIntent(message, context);
        break;
      case 'cancel_reservation':
        response = await this.handleCancellationIntent(message, context);
        break;
      case 'modify_reservation':
        response = await this.handleModificationIntent(message, context);
        break;
      case 'restaurant_info':
        response = await this.handleRestaurantInfoIntent(message, context);
        break;
      case 'menu_inquiry':
        response = await this.handleMenuInquiryIntent(message, context);
        break;
      case 'dietary_restrictions':
        response = await this.handleDietaryIntent(message, context);
        break;
      case 'general_help':
        response = await this.handleGeneralHelpIntent(message, context);
        break;
      default:
        response = await this.handleGeneralQuery(message, context);
    }

    // Translate response if needed
    if (locale !== 'en') {
      response.message = await TranslationService.autoTranslate(
        response.message,
        'en',
        locale
      );
      if (response.suggestions) {
        response.suggestions = await Promise.all(
          response.suggestions.map(s => 
            TranslationService.autoTranslate(s, 'en', locale)
          )
        );
      }
    }

    // Add assistant response to context
    context.messages.push({
      role: 'assistant',
      content: response.message,
      timestamp: new Date(),
    });

    // Save context
    await this.saveContext(context);

    return response;
  }

  static async detectIntent(message: string, context: ChatContext): Promise<string> {
    const prompt = `
      Analyze the following user message and conversation context to determine the user's intent.
      
      User message: "${message}"
      
      Previous messages:
      ${context.messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}
      
      Possible intents:
      - book_reservation: User wants to make a restaurant reservation
      - check_availability: User wants to check if a restaurant has availability
      - cancel_reservation: User wants to cancel an existing reservation
      - modify_reservation: User wants to change an existing reservation
      - restaurant_info: User wants information about a restaurant
      - menu_inquiry: User wants to see menu or specific dish information
      - dietary_restrictions: User has questions about dietary accommodations
      - general_help: User needs help using the platform
      - other: General conversation or unclear intent
      
      Return only the intent name.
    `;

    try {
      const completion = await this.openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 10,
        temperature: 0.3,
      });

      return completion.data.choices[0].text?.trim() || 'other';
    } catch (error) {
      console.error('Intent detection failed:', error);
      return 'other';
    }
  }

  static async handleBookingIntent(
    message: string,
    context: ChatContext
  ): Promise<ChatResponse> {
    // Extract booking details from message
    const bookingDetails = await this.extractBookingDetails(message, context);
    
    if (!bookingDetails.complete) {
      return {
        message: this.getMissingInfoMessage(bookingDetails),
        suggestions: this.getBookingSuggestions(bookingDetails),
      };
    }

    // Check availability
    const availability = await ReservationService.getAvailableSlots(
      bookingDetails.restaurantId,
      bookingDetails.date,
      bookingDetails.partySize
    );

    if (availability.length === 0) {
      return {
        message: "I'm sorry, but there are no available tables for your requested time. Would you like to try a different time or date?",
        suggestions: [
          'Show me availability for tomorrow',
          'Check nearby restaurants',
          'Join the waitlist',
        ],
      };
    }

    // Find closest available time
    const requestedTime = bookingDetails.time;
    const closestSlot = availability.reduce((prev, curr) => {
      const prevDiff = Math.abs(this.timeToMinutes(prev.time) - this.timeToMinutes(requestedTime));
      const currDiff = Math.abs(this.timeToMinutes(curr.time) - this.timeToMinutes(requestedTime));
      return currDiff < prevDiff ? curr : prev;
    });

    return {
      message: `Great! I found availability at ${closestSlot.time} for ${bookingDetails.partySize} ${bookingDetails.partySize === 1 ? 'person' : 'people'} on ${bookingDetails.date}. Would you like me to book this table for you?`,
      suggestions: [
        'Yes, book it',
        'Show other available times',
        'Change party size',
      ],
      actions: [{
        type: 'book_reservation',
        data: {
          ...bookingDetails,
          time: closestSlot.time,
        },
      }],
    };
  }

  static async handleAvailabilityIntent(
    message: string,
    context: ChatContext
  ): Promise<ChatResponse> {
    const details = await this.extractBookingDetails(message, context);
    
    if (!details.restaurantId || !details.date) {
      return {
        message: "I'd be happy to check availability for you. Which restaurant and date are you interested in?",
        suggestions: [
          'Tonight at 7pm',
          'Tomorrow for lunch',
          'This weekend',
        ],
      };
    }

    const availability = await ReservationService.getAvailableSlots(
      details.restaurantId,
      details.date,
      details.partySize || 2
    );

    const availableTimes = availability
      .filter(slot => slot.available)
      .map(slot => slot.time)
      .slice(0, 5);

    if (availableTimes.length === 0) {
      return {
        message: `Unfortunately, there are no available tables on ${details.date}. Would you like to check another date?`,
        suggestions: [
          'Check tomorrow',
          'Check this weekend',
          'Join waitlist',
        ],
      };
    }

    return {
      message: `Here are the available times on ${details.date}: ${availableTimes.join(', ')}. Which time works best for you?`,
      suggestions: availableTimes.slice(0, 3),
    };
  }

  static async handleCancellationIntent(
    message: string,
    context: ChatContext
  ): Promise<ChatResponse> {
    if (!context.userId) {
      return {
        message: "I need you to be logged in to help with reservation cancellations. Please sign in first.",
        requiresHumanAgent: false,
      };
    }

    // Try to identify which reservation
    const reservationId = await this.extractReservationId(message, context);
    
    if (!reservationId) {
      // Get user's upcoming reservations
      const reservations = await Reservation.findAll({
        where: {
          userId: context.userId,
          status: 'confirmed',
        },
        include: [Restaurant],
        order: [['date', 'ASC'], ['time', 'ASC']],
        limit: 3,
      });

      if (reservations.length === 0) {
        return {
          message: "I don't see any upcoming reservations for you. Is there something else I can help with?",
        };
      }

      if (reservations.length === 1) {
        const res = reservations[0];
        return {
          message: `I found your reservation at ${res.restaurant.name} on ${res.date} at ${res.time}. Would you like to cancel this reservation?`,
          suggestions: ['Yes, cancel it', 'No, keep it'],
          actions: [{
            type: 'cancel_reservation',
            data: { reservationId: res.id },
          }],
        };
      }

      const resList = reservations
        .map((r, i) => `${i + 1}. ${r.restaurant.name} on ${r.date} at ${r.time}`)
        .join('\n');

      return {
        message: `I found multiple reservations:\n${resList}\n\nWhich one would you like to cancel?`,
        suggestions: reservations.map((r, i) => `Cancel #${i + 1}`),
      };
    }

    // Verify cancellation
    const reservation = await Reservation.findByPk(reservationId, {
      include: [Restaurant],
    });

    if (!reservation || reservation.userId !== context.userId) {
      return {
        message: "I couldn't find that reservation. Please check your confirmation email for the correct details.",
      };
    }

    return {
      message: `Are you sure you want to cancel your reservation at ${reservation.restaurant.name} on ${reservation.date} at ${reservation.time}? This action cannot be undone.`,
      suggestions: ['Yes, cancel', 'No, keep it'],
      actions: [{
        type: 'cancel_reservation',
        data: { reservationId },
      }],
    };
  }

  static async handleGeneralQuery(
    message: string,
    context: ChatContext
  ): Promise<ChatResponse> {
    // Use GPT for general queries
    const systemPrompt = `
      You are a helpful restaurant reservation assistant. You help users:
      - Find and book restaurants
      - Check availability
      - Manage their reservations
      - Answer questions about restaurants, menus, and dining
      
      Be friendly, concise, and helpful. If you're not sure about something, offer to connect them with a human agent.
      
      Current context:
      - User ID: ${context.userId || 'Not logged in'}
      - Locale: ${context.locale}
    `;

    try {
      const completion = await this.openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...context.messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      const response = completion.data.choices[0].message?.content || 
        "I'm sorry, I didn't understand that. How can I help you with restaurant reservations?";

      return {
        message: response,
        suggestions: [
          'Book a table',
          'Check my reservations',
          'Find restaurants near me',
        ],
      };
    } catch (error) {
      console.error('GPT query failed:', error);
      return {
        message: "I'm having trouble understanding your request. Would you like to speak with a human agent?",
        requiresHumanAgent: true,
      };
    }
  }

  private static async extractBookingDetails(
    message: string,
    context: ChatContext
  ): Promise<any> {
    // This would use NLP to extract entities
    // Simplified version here
    const details: any = {
      complete: false,
    };

    // Extract date
    const dateMatch = message.match(/(?:today|tomorrow|tonight|\d{1,2}\/\d{1,2})/i);
    if (dateMatch) {
      details.date = this.parseDate(dateMatch[0]);
    }

    // Extract time
    const timeMatch = message.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)|noon|midnight/i);
    if (timeMatch) {
      details.time = this.parseTime(timeMatch[0]);
    }

    // Extract party size
    const sizeMatch = message.match(/(\d+)\s*(?:people|person|guests?|pax)/i);
    if (sizeMatch) {
      details.partySize = parseInt(sizeMatch[1]);
    }

    // Check if all required fields are present
    details.complete = !!(details.date && details.time && details.partySize);

    return details;
  }

  private static getMissingInfoMessage(bookingDetails: any): string {
    const missing = [];
    if (!bookingDetails.date) missing.push('date');
    if (!bookingDetails.time) missing.push('time');
    if (!bookingDetails.partySize) missing.push('party size');
    if (!bookingDetails.restaurantId) missing.push('restaurant');

    return `I need a few more details to help you book a table. Could you please provide the ${missing.join(', ')}?`;
  }

  private static getBookingSuggestions(bookingDetails: any): string[] {
    const suggestions = [];
    
    if (!bookingDetails.date) {
      suggestions.push('Tonight', 'Tomorrow', 'This weekend');
    } else if (!bookingDetails.time) {
      suggestions.push('7:00 PM', '8:00 PM', '6:30 PM');
    } else if (!bookingDetails.partySize) {
      suggestions.push('2 people', '4 people', '6 people');
    }

    return suggestions;
  }

  private static async getContext(
    sessionId: string,
    userId?: string,
    locale: string = 'en'
  ): Promise<ChatContext> {
    const key = `chat:${sessionId}`;
    const cached = await redisClient.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }

    return {
      sessionId,
      userId,
      locale,
      messages: [],
      metadata: {},
    };
  }

  private static async saveContext(context: ChatContext): Promise<void> {
    // Limit context length
    if (context.messages.length > this.MAX_CONTEXT_LENGTH) {
      context.messages = context.messages.slice(-this.MAX_CONTEXT_LENGTH);
    }

    const key = `chat:${context.sessionId}`;
    await redisClient.setex(key, this.CONTEXT_TTL, JSON.stringify(context));
  }

  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private static parseDate(dateStr: string): string {
    const today = new Date();
    
    switch (dateStr.toLowerCase()) {
      case 'today':
      case 'tonight':
        return today.toISOString().split('T')[0];
      case 'tomorrow':
        today.setDate(today.getDate() + 1);
        return today.toISOString().split('T')[0];
      default:
        // Try to parse MM/DD format
        const parts = dateStr.split('/');
        if (parts.length === 2) {
          const month = parseInt(parts[0]);
          const day = parseInt(parts[1]);
          const year = today.getFullYear();
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
        return dateStr;
    }
  }

  private static parseTime(timeStr: string): string {
    // Convert various time formats to 24h format
    const normalized = timeStr.toLowerCase().trim();
    
    if (normalized === 'noon') return '12:00';
    if (normalized === 'midnight') return '00:00';
    
    const match = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!match) return timeStr;
    
    let hours = parseInt(match[1]);
    const minutes = match[2] || '00';
    const period = match[3];
    
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  private static async extractReservationId(
    message: string,
    context: ChatContext
  ): Promise<string | null> {
    // Look for confirmation code or reservation ID
    const codeMatch = message.match(/[A-Z0-9]{6,}/);
    if (codeMatch) {
      const reservation = await Reservation.findOne({
        where: { confirmationCode: codeMatch[0] },
      });
      return reservation?.id || null;
    }
    
    return null;
  }
}