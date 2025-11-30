import { AIConciergeService } from './ai-concierge.service';
import { ReservationService } from './reservation.service';
import { RestaurantService } from './restaurant.service';
import { NotificationService } from './notification.service';
import { pubsub, EVENTS } from '../config/pubsub';

interface VoiceCommand {
  userId: string;
  command: string;
  intent: string;
  entities: any;
  confidence: number;
  deviceId?: string;
  deviceType: 'alexa' | 'google_home' | 'siri' | 'mobile_app' | 'smart_speaker' | 'car_system';
  sessionId?: string;
}

interface IoTDevice {
  id: string;
  userId: string;
  deviceType: 'alexa' | 'google_home' | 'smart_display' | 'smart_watch' | 'car_system' | 'smart_fridge';
  deviceName: string;
  capabilities: string[];
  isActive: boolean;
  lastSeen: Date;
  settings: any;
}

interface VoiceResponse {
  text: string;
  ssml?: string;
  shouldEndSession: boolean;
  reprompt?: string;
  cardTitle?: string;
  cardContent?: string;
  displayData?: any;
}

class VoiceIoTService {
  private aiConcierge: AIConciergeService;
  private reservationService: ReservationService;
  private restaurantService: RestaurantService;
  private notificationService: NotificationService;
  private connectedDevices: Map<string, IoTDevice> = new Map();

  // Voice command patterns
  private readonly VOICE_PATTERNS = {
    MAKE_RESERVATION: [
      'book a table',
      'make a reservation',
      'reserve a table',
      'find me a restaurant',
      'book dinner',
      'get me a table'
    ],
    CHECK_RESERVATION: [
      'check my reservation',
      'when is my dinner',
      'what time is my table',
      'reservation status',
      'my booking'
    ],
    CANCEL_RESERVATION: [
      'cancel my reservation',
      'cancel my booking',
      'cancel dinner',
      'cancel my table'
    ],
    RESTAURANT_INFO: [
      'tell me about',
      'restaurant information',
      'what\'s the menu',
      'restaurant hours',
      'restaurant reviews'
    ],
    RECOMMENDATIONS: [
      'recommend a restaurant',
      'suggest a place',
      'where should I eat',
      'find good food',
      'restaurant suggestions'
    ]
  };

  constructor() {
    this.aiConcierge = new AIConciergeService();
    this.reservationService = new ReservationService();
    this.restaurantService = new RestaurantService();
    this.notificationService = new NotificationService();
  }

  async processVoiceCommand(command: VoiceCommand): Promise<VoiceResponse> {
    try {
      console.log(`Processing voice command from ${command.deviceType}:`, command.command);

      // Parse intent and entities using AI Concierge
      const aiResponse = await this.aiConcierge.processMessage(
        command.userId,
        command.command,
        { source: 'voice', deviceType: command.deviceType }
      );

      // Handle different intents
      switch (aiResponse.intent) {
        case 'search':
          return await this.handleRestaurantSearch(command, aiResponse.entities);
        
        case 'booking':
          return await this.handleReservationBooking(command, aiResponse.entities);
        
        case 'modification':
          return await this.handleReservationModification(command, aiResponse.entities);
        
        case 'cancellation':
          return await this.handleReservationCancellation(command, aiResponse.entities);
        
        case 'info':
          return await this.handleRestaurantInfo(command, aiResponse.entities);
        
        case 'recommendations':
          return await this.handleRecommendations(command, aiResponse.entities);
        
        default:
          return this.createVoiceResponse(
            aiResponse.response,
            false,
            'Is there anything else I can help you with regarding dining?'
          );
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      return this.createVoiceResponse(
        'I\'m sorry, I encountered an error processing your request. Please try again.',
        true
      );
    }
  }

  private async handleRestaurantSearch(command: VoiceCommand, entities: any): Promise<VoiceResponse> {
    const { cuisine, location, date, time, partySize } = entities;

    try {
      const searchResults = await this.restaurantService.searchRestaurants({
        cuisine,
        location: location || 'nearby',
        date: date || new Date(),
        time: time || '19:00',
        partySize: partySize || 2,
        limit: 3 // Limit for voice response
      });

      if (searchResults.length === 0) {
        return this.createVoiceResponse(
          `I couldn't find any ${cuisine || ''} restaurants ${location ? `in ${location}` : 'nearby'}. Would you like me to search for different criteria?`,
          false,
          'You can say "yes" to search again or "no" to end.'
        );
      }

      const topRestaurant = searchResults[0];
      let responseText = `I found ${searchResults.length} great options. The top recommendation is ${topRestaurant.name}`;
      
      if (topRestaurant.cuisine) {
        responseText += `, which serves ${topRestaurant.cuisine} cuisine`;
      }
      
      if (topRestaurant.rating) {
        responseText += ` and has a ${topRestaurant.rating} star rating`;
      }

      responseText += '. Would you like me to make a reservation there?';

      return this.createVoiceResponse(
        responseText,
        false,
        'Say "yes" to book a table, or "no" to hear other options.',
        'Restaurant Recommendations',
        `Top pick: ${topRestaurant.name}`,
        {
          restaurants: searchResults.slice(0, 3),
          searchCriteria: { cuisine, location, date, time, partySize }
        }
      );
    } catch (error) {
      return this.createVoiceResponse(
        'I\'m having trouble searching for restaurants right now. Please try again in a moment.',
        true
      );
    }
  }

  private async handleReservationBooking(command: VoiceCommand, entities: any): Promise<VoiceResponse> {
    const { restaurantName, date, time, partySize } = entities;

    if (!restaurantName) {
      return this.createVoiceResponse(
        'Which restaurant would you like to book? You can say the name or ask me to recommend one.',
        false,
        'Please tell me the restaurant name.'
      );
    }

    if (!date || !time) {
      return this.createVoiceResponse(
        'When would you like to dine? Please tell me the date and time.',
        false,
        'For example, you can say "tomorrow at 7 PM" or "Friday at 6:30".'
      );
    }

    try {
      // Find restaurant
      const restaurants = await this.restaurantService.searchRestaurants({
        name: restaurantName,
        limit: 1
      });

      if (restaurants.length === 0) {
        return this.createVoiceResponse(
          `I couldn't find a restaurant named ${restaurantName}. Would you like me to search for similar restaurants?`,
          false,
          'Say "yes" to search for similar options or "no" to try a different name.'
        );
      }

      const restaurant = restaurants[0];

      // Check availability
      const availability = await this.reservationService.checkAvailability(
        restaurant.id,
        new Date(date),
        time,
        partySize || 2
      );

      if (!availability.available) {
        const alternatives = availability.alternativeTimes?.slice(0, 2) || [];
        let responseText = `Unfortunately, ${restaurant.name} doesn't have availability at ${time}`;
        
        if (alternatives.length > 0) {
          responseText += `. However, they have tables available at ${alternatives.join(' or ')}. Would you like one of these times instead?`;
        } else {
          responseText += `. Would you like me to suggest other restaurants or different times?`;
        }

        return this.createVoiceResponse(
          responseText,
          false,
          'Say "yes" for alternative times or "no" to try something else.'
        );
      }

      // Make reservation
      const reservation = await this.reservationService.createReservation({
        userId: command.userId,
        restaurantId: restaurant.id,
        date: new Date(date),
        time,
        partySize: partySize || 2,
        specialRequests: 'Booked via voice command',
        source: 'voice_assistant'
      });

      // Send confirmation
      await this.notificationService.sendNotification(command.userId, {
        type: 'reservation_confirmed',
        title: 'Reservation Confirmed',
        message: `Your table at ${restaurant.name} is confirmed for ${date} at ${time}`,
        data: { reservationId: reservation.id }
      });

      const responseText = `Perfect! I've booked your table at ${restaurant.name} for ${partySize || 2} people on ${date} at ${time}. You'll receive a confirmation notification shortly.`;

      return this.createVoiceResponse(
        responseText,
        true,
        undefined,
        'Reservation Confirmed',
        `${restaurant.name} - ${date} at ${time}`,
        { reservation, restaurant }
      );
    } catch (error) {
      return this.createVoiceResponse(
        'I\'m sorry, I couldn\'t complete your reservation. Please try again or use the app to book directly.',
        true
      );
    }
  }

  private async handleReservationModification(command: VoiceCommand, entities: any): Promise<VoiceResponse> {
    try {
      // Get user's upcoming reservations
      const reservations = await this.reservationService.getUserReservations(command.userId, {
        status: 'confirmed',
        upcoming: true,
        limit: 5
      });

      if (reservations.length === 0) {
        return this.createVoiceResponse(
          'You don\'t have any upcoming reservations to modify. Would you like to make a new reservation?',
          false,
          'Say "yes" to make a new booking or "no" to end.'
        );
      }

      if (reservations.length === 1) {
        const reservation = reservations[0];
        const { newDate, newTime, newPartySize } = entities;

        if (!newDate && !newTime && !newPartySize) {
          return this.createVoiceResponse(
            `I found your reservation at ${reservation.restaurant.name} on ${reservation.date} at ${reservation.time}. What would you like to change?`,
            false,
            'You can change the date, time, or party size.'
          );
        }

        // Process modification
        const updateData: any = {};
        if (newDate) updateData.date = new Date(newDate);
        if (newTime) updateData.time = newTime;
        if (newPartySize) updateData.partySize = newPartySize;

        const updatedReservation = await this.reservationService.updateReservation(
          reservation.id,
          updateData
        );

        return this.createVoiceResponse(
          `Great! I've updated your reservation at ${reservation.restaurant.name}. Your new booking is for ${updateData.date || reservation.date} at ${updateData.time || reservation.time}.`,
          true,
          undefined,
          'Reservation Updated',
          `${reservation.restaurant.name} - Updated`,
          { reservation: updatedReservation }
        );
      } else {
        // Multiple reservations - ask which one to modify
        const reservationList = reservations.map((r, index) => 
          `${index + 1}. ${r.restaurant.name} on ${r.date} at ${r.time}`
        ).join(', ');

        return this.createVoiceResponse(
          `You have ${reservations.length} upcoming reservations: ${reservationList}. Which one would you like to modify?`,
          false,
          'Say the number or restaurant name of the reservation you want to change.'
        );
      }
    } catch (error) {
      return this.createVoiceResponse(
        'I\'m having trouble accessing your reservations. Please try again or check the app.',
        true
      );
    }
  }

  private async handleReservationCancellation(command: VoiceCommand, entities: any): Promise<VoiceResponse> {
    try {
      const reservations = await this.reservationService.getUserReservations(command.userId, {
        status: 'confirmed',
        upcoming: true,
        limit: 5
      });

      if (reservations.length === 0) {
        return this.createVoiceResponse(
          'You don\'t have any upcoming reservations to cancel.',
          true
        );
      }

      if (reservations.length === 1) {
        const reservation = reservations[0];
        
        await this.reservationService.cancelReservation(reservation.id, {
          reason: 'Cancelled via voice command',
          source: 'voice_assistant'
        });

        return this.createVoiceResponse(
          `I've cancelled your reservation at ${reservation.restaurant.name} for ${reservation.date} at ${reservation.time}. You'll receive a cancellation confirmation shortly.`,
          true,
          undefined,
          'Reservation Cancelled',
          `${reservation.restaurant.name} - Cancelled`
        );
      } else {
        const reservationList = reservations.map((r, index) => 
          `${index + 1}. ${r.restaurant.name} on ${r.date} at ${r.time}`
        ).join(', ');

        return this.createVoiceResponse(
          `You have ${reservations.length} upcoming reservations: ${reservationList}. Which one would you like to cancel?`,
          false,
          'Say the number or restaurant name of the reservation you want to cancel.'
        );
      }
    } catch (error) {
      return this.createVoiceResponse(
        'I\'m having trouble cancelling your reservation. Please try again or use the app.',
        true
      );
    }
  }

  private async handleRestaurantInfo(command: VoiceCommand, entities: any): Promise<VoiceResponse> {
    const { restaurantName } = entities;

    if (!restaurantName) {
      return this.createVoiceResponse(
        'Which restaurant would you like to know about?',
        false,
        'Please tell me the restaurant name.'
      );
    }

    try {
      const restaurants = await this.restaurantService.searchRestaurants({
        name: restaurantName,
        limit: 1
      });

      if (restaurants.length === 0) {
        return this.createVoiceResponse(
          `I couldn't find information about ${restaurantName}. Would you like me to search for similar restaurants?`,
          false,
          'Say "yes" to search for similar options.'
        );
      }

      const restaurant = restaurants[0];
      let responseText = `${restaurant.name} is a ${restaurant.cuisine} restaurant`;
      
      if (restaurant.location) {
        responseText += ` located in ${restaurant.location}`;
      }
      
      if (restaurant.rating) {
        responseText += ` with a ${restaurant.rating} star rating`;
      }
      
      if (restaurant.priceRange) {
        responseText += ` in the ${restaurant.priceRange} price range`;
      }
      
      if (restaurant.hours) {
        responseText += `. They're open ${restaurant.hours}`;
      }

      responseText += '. Would you like to make a reservation?';

      return this.createVoiceResponse(
        responseText,
        false,
        'Say "yes" to book a table or "no" for more information.',
        restaurant.name,
        `${restaurant.cuisine} • ${restaurant.rating}⭐ • ${restaurant.priceRange}`,
        { restaurant }
      );
    } catch (error) {
      return this.createVoiceResponse(
        'I\'m having trouble getting restaurant information. Please try again.',
        true
      );
    }
  }

  private async handleRecommendations(command: VoiceCommand, entities: any): Promise<VoiceResponse> {
    const { cuisine, location, occasion, priceRange } = entities;

    try {
      const recommendations = await this.restaurantService.getRecommendations(command.userId, {
        cuisine,
        location,
        occasion,
        priceRange,
        limit: 3
      });

      if (recommendations.length === 0) {
        return this.createVoiceResponse(
          'I couldn\'t find any restaurants matching your preferences. Would you like me to suggest popular options nearby?',
          false,
          'Say "yes" for popular recommendations or "no" to try different criteria.'
        );
      }

      const topPick = recommendations[0];
      let responseText = `Based on your preferences, I recommend ${topPick.name}`;
      
      if (topPick.cuisine) {
        responseText += `, which serves excellent ${topPick.cuisine} cuisine`;
      }
      
      if (topPick.rating) {
        responseText += ` and has a ${topPick.rating} star rating`;
      }

      if (recommendations.length > 1) {
        responseText += `. I also found ${recommendations.length - 1} other great options`;
      }

      responseText += '. Would you like to book a table at my top recommendation?';

      return this.createVoiceResponse(
        responseText,
        false,
        'Say "yes" to book at my top pick, or "more options" to hear other recommendations.',
        'Restaurant Recommendations',
        `Top pick: ${topPick.name}`,
        { recommendations }
      );
    } catch (error) {
      return this.createVoiceResponse(
        'I\'m having trouble getting recommendations. Please try again.',
        true
      );
    }
  }

  private createVoiceResponse(
    text: string,
    shouldEndSession: boolean,
    reprompt?: string,
    cardTitle?: string,
    cardContent?: string,
    displayData?: any
  ): VoiceResponse {
    // Create SSML for better voice experience
    const ssml = `<speak>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</speak>`;

    return {
      text,
      ssml,
      shouldEndSession,
      reprompt,
      cardTitle,
      cardContent,
      displayData
    };
  }

  async registerDevice(device: Omit<IoTDevice, 'id' | 'lastSeen'>): Promise<string> {
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newDevice: IoTDevice = {
      ...device,
      id: deviceId,
      lastSeen: new Date()
    };

    this.connectedDevices.set(deviceId, newDevice);

    // Publish device registration event
    pubsub.publish(EVENTS.DEVICE_REGISTERED, {
      deviceId,
      userId: device.userId,
      deviceType: device.deviceType
    });

    return deviceId;
  }

  async updateDeviceStatus(deviceId: string, isActive: boolean): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (device) {
      device.isActive = isActive;
      device.lastSeen = new Date();
      this.connectedDevices.set(deviceId, device);
    }
  }

  async getConnectedDevices(userId: string): Promise<IoTDevice[]> {
    return Array.from(this.connectedDevices.values())
      .filter(device => device.userId === userId);
  }

  async sendToDevice(deviceId: string, message: any): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (!device || !device.isActive) {
      throw new Error('Device not found or inactive');
    }

    // Publish message to device
    pubsub.publish(`DEVICE_MESSAGE_${deviceId}`, {
      deviceId,
      message,
      timestamp: new Date()
    });
  }
}

export { VoiceIoTService, VoiceCommand, IoTDevice, VoiceResponse };
