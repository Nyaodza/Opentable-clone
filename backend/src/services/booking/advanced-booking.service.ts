import { EventEmitter } from 'events';
import Stripe from 'stripe';
import * as bull from 'bull';
import { Redis } from 'ioredis';

// Advanced Booking Service - Experiences, Deposits, Special Events
export class AdvancedBookingService extends EventEmitter {
  private stripe: Stripe;
  private bookingQueue: bull.Queue;
  private redis: Redis;

  constructor() {
    super();
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    this.bookingQueue = new bull('advanced-bookings', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });
    this.initializeQueues();
  }

  private initializeQueues(): void {
    // Process deposit payments
    this.bookingQueue.process('process-deposit', async (job) => {
      const { bookingId, amount, paymentMethodId } = job.data;
      return await this.processDepositPayment(bookingId, amount, paymentMethodId);
    });

    // Send experience reminders
    this.bookingQueue.process('experience-reminder', async (job) => {
      const { experienceBookingId } = job.data;
      return await this.sendExperienceReminder(experienceBookingId);
    });

    // Handle deposit refunds
    this.bookingQueue.process('refund-deposit', async (job) => {
      const { bookingId, reason } = job.data;
      return await this.refundDeposit(bookingId, reason);
    });
  }

  // Experience Management
  async createDiningExperience(experienceData: DiningExperience): Promise<DiningExperience> {
    const experience: DiningExperience = {
      id: this.generateId(),
      ...experienceData,
      status: 'draft',
      bookings: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveToDatabase('dining_experiences', experience);
    this.emit('experience:created', experience);
    return experience;
  }

  async bookExperience(
    experienceId: string,
    guestData: ExperienceBooking
  ): Promise<ExperienceBooking> {
    const experience = await this.getExperience(experienceId);
    
    if (!experience) {
      throw new Error('Experience not found');
    }

    if (experience.availableSeats <= 0) {
      throw new Error('Experience is fully booked');
    }

    const booking: ExperienceBooking = {
      id: this.generateId(),
      experienceId,
      ...guestData,
      status: 'pending',
      totalAmount: experience.pricePerPerson * guestData.partySize,
      depositAmount: experience.depositRequired,
      paymentStatus: 'pending',
      createdAt: new Date()
    };

    // Process deposit if required
    if (experience.depositRequired > 0) {
      await this.bookingQueue.add('process-deposit', {
        bookingId: booking.id,
        amount: experience.depositRequired * guestData.partySize,
        paymentMethodId: guestData.paymentMethodId
      });
    }

    await this.saveToDatabase('experience_bookings', booking);
    await this.updateExperienceAvailability(experienceId, -guestData.partySize);
    
    this.emit('experience:booked', booking);
    return booking;
  }

  // Deposit Management
  async processDepositPayment(
    bookingId: string,
    amount: number,
    paymentMethodId: string
  ): Promise<any> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        capture_method: 'manual', // Hold the funds
        metadata: {
          bookingId,
          type: 'deposit'
        }
      });

      await this.updateBookingPaymentStatus(bookingId, {
        paymentIntentId: paymentIntent.id,
        depositStatus: 'held',
        depositPaidAt: new Date()
      });

      this.emit('deposit:processed', { bookingId, paymentIntent });
      return paymentIntent;
    } catch (error) {
      this.emit('deposit:failed', { bookingId, error });
      throw error;
    }
  }

  async captureDeposit(bookingId: string): Promise<void> {
    const booking = await this.getBooking(bookingId);
    
    if (!booking || !booking.paymentIntentId) {
      throw new Error('Booking or payment intent not found');
    }

    await this.stripe.paymentIntents.capture(booking.paymentIntentId);
    
    await this.updateBookingPaymentStatus(bookingId, {
      depositStatus: 'captured',
      depositCapturedAt: new Date()
    });

    this.emit('deposit:captured', { bookingId });
  }

  async refundDeposit(bookingId: string, reason: string): Promise<void> {
    const booking = await this.getBooking(bookingId);
    
    if (!booking || !booking.paymentIntentId) {
      throw new Error('Booking or payment intent not found');
    }

    const refund = await this.stripe.refunds.create({
      payment_intent: booking.paymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        bookingId,
        refundReason: reason
      }
    });

    await this.updateBookingPaymentStatus(bookingId, {
      depositStatus: 'refunded',
      refundId: refund.id,
      refundedAt: new Date(),
      refundReason: reason
    });

    this.emit('deposit:refunded', { bookingId, refund });
  }

  // Group Bookings
  async createGroupBooking(groupData: GroupBooking): Promise<GroupBooking> {
    const groupBooking: GroupBooking = {
      id: this.generateId(),
      ...groupData,
      status: 'pending',
      individualBookings: [],
      totalAmount: 0,
      createdAt: new Date()
    };

    // Validate capacity
    const availability = await this.checkGroupAvailability(
      groupData.restaurantId,
      groupData.date,
      groupData.totalGuests
    );

    if (!availability.available) {
      throw new Error('Insufficient capacity for group booking');
    }

    // Create individual bookings for each table/section
    const assignments = await this.assignGroupTables(
      groupData.restaurantId,
      groupData.date,
      groupData.totalGuests
    );

    for (const assignment of assignments) {
      const booking = await this.createBooking({
        restaurantId: groupData.restaurantId,
        date: groupData.date,
        time: groupData.time,
        partySize: assignment.partySize,
        tableId: assignment.tableId,
        groupBookingId: groupBooking.id,
        guestName: groupData.organizerName,
        guestEmail: groupData.organizerEmail,
        guestPhone: groupData.organizerPhone
      });

      groupBooking.individualBookings.push(booking.id);
    }

    // Calculate pricing
    if (groupData.menuSelection) {
      groupBooking.totalAmount = await this.calculateGroupPrice(
        groupData.menuSelection,
        groupData.totalGuests
      );
    }

    await this.saveToDatabase('group_bookings', groupBooking);
    this.emit('group:created', groupBooking);
    return groupBooking;
  }

  // Private Events
  async requestPrivateEvent(eventData: PrivateEventRequest): Promise<PrivateEventRequest> {
    const request: PrivateEventRequest = {
      id: this.generateId(),
      ...eventData,
      status: 'pending_review',
      createdAt: new Date()
    };

    // Check venue availability
    const venueAvailable = await this.checkVenueAvailability(
      eventData.restaurantId,
      eventData.date,
      eventData.spaces
    );

    if (!venueAvailable) {
      request.status = 'unavailable';
    } else {
      // Calculate quote
      request.quote = await this.generateEventQuote(eventData);
      
      // Notify restaurant staff
      await this.notifyRestaurantOfPrivateEvent(eventData.restaurantId, request);
    }

    await this.saveToDatabase('private_event_requests', request);
    this.emit('private_event:requested', request);
    return request;
  }

  async approvePrivateEvent(
    requestId: string,
    contractDetails: EventContract
  ): Promise<EventContract> {
    const request = await this.getPrivateEventRequest(requestId);
    
    if (!request) {
      throw new Error('Event request not found');
    }

    const contract: EventContract = {
      id: this.generateId(),
      requestId,
      ...contractDetails,
      status: 'pending_signature',
      createdAt: new Date()
    };

    // Block venue availability
    await this.blockVenueForEvent(
      request.restaurantId,
      request.date,
      request.spaces
    );

    // Schedule deposit payment
    if (contract.depositAmount > 0) {
      const depositDueDate = new Date();
      depositDueDate.setDate(depositDueDate.getDate() + 7); // Due in 7 days
      
      await this.bookingQueue.add('collect-event-deposit', {
        contractId: contract.id,
        amount: contract.depositAmount,
        dueDate: depositDueDate
      }, {
        delay: depositDueDate.getTime() - Date.now()
      });
    }

    await this.saveToDatabase('event_contracts', contract);
    this.emit('private_event:approved', contract);
    return contract;
  }

  // Ticketed Events
  async createTicketedEvent(eventData: TicketedEvent): Promise<TicketedEvent> {
    const event: TicketedEvent = {
      id: this.generateId(),
      ...eventData,
      ticketsSold: 0,
      revenue: 0,
      status: 'upcoming',
      createdAt: new Date()
    };

    // Create ticket tiers
    for (const tier of eventData.ticketTiers) {
      await this.createTicketTier(event.id, tier);
    }

    await this.saveToDatabase('ticketed_events', event);
    this.emit('ticketed_event:created', event);
    return event;
  }

  async purchaseEventTickets(
    eventId: string,
    tierId: string,
    quantity: number,
    purchaserInfo: any
  ): Promise<TicketPurchase> {
    const event = await this.getTicketedEvent(eventId);
    const tier = await this.getTicketTier(tierId);
    
    if (!event || !tier) {
      throw new Error('Event or ticket tier not found');
    }

    if (tier.available < quantity) {
      throw new Error('Not enough tickets available');
    }

    const purchase: TicketPurchase = {
      id: this.generateId(),
      eventId,
      tierId,
      quantity,
      unitPrice: tier.price,
      totalAmount: tier.price * quantity,
      purchaserInfo,
      tickets: [],
      status: 'pending',
      createdAt: new Date()
    };

    // Process payment
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(purchase.totalAmount * 100),
      currency: 'usd',
      metadata: {
        eventId,
        purchaseId: purchase.id
      }
    });

    purchase.paymentIntentId = paymentIntent.id;

    // Generate tickets
    for (let i = 0; i < quantity; i++) {
      const ticket = await this.generateTicket(event, tier, purchase);
      purchase.tickets.push(ticket.id);
    }

    // Update availability
    await this.updateTicketAvailability(tierId, -quantity);
    await this.updateEventStats(eventId, quantity, purchase.totalAmount);

    await this.saveToDatabase('ticket_purchases', purchase);
    this.emit('tickets:purchased', purchase);
    return purchase;
  }

  // Helper methods
  private async checkGroupAvailability(
    restaurantId: string,
    date: Date,
    partySize: number
  ): Promise<{ available: boolean; tables?: any[] }> {
    const availableTables = await this.getAvailableTables(restaurantId, date);
    const totalCapacity = availableTables.reduce((sum, table) => sum + table.capacity, 0);
    
    return {
      available: totalCapacity >= partySize,
      tables: availableTables
    };
  }

  private async assignGroupTables(
    restaurantId: string,
    date: Date,
    totalGuests: number
  ): Promise<any[]> {
    const availableTables = await this.getAvailableTables(restaurantId, date);
    const assignments: any[] = [];
    let remainingGuests = totalGuests;

    // Sort tables by capacity (largest first)
    availableTables.sort((a, b) => b.capacity - a.capacity);

    for (const table of availableTables) {
      if (remainingGuests <= 0) break;
      
      const partySize = Math.min(table.capacity, remainingGuests);
      assignments.push({
        tableId: table.id,
        partySize
      });
      remainingGuests -= partySize;
    }

    if (remainingGuests > 0) {
      throw new Error('Unable to accommodate all guests');
    }

    return assignments;
  }

  private async generateEventQuote(eventData: any): Promise<EventQuote> {
    const basePrice = eventData.guestCount * 75; // Base price per person
    const venueRental = eventData.spaces.length * 500; // Venue rental fee
    const serviceCharge = basePrice * 0.20; // 20% service charge
    const tax = (basePrice + serviceCharge) * 0.08; // 8% tax

    return {
      basePrice,
      venueRental,
      serviceCharge,
      tax,
      totalAmount: basePrice + venueRental + serviceCharge + tax,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Valid for 7 days
    };
  }

  private async generateTicket(event: any, tier: any, purchase: any): Promise<any> {
    const ticket = {
      id: this.generateId(),
      eventId: event.id,
      tierId: tier.id,
      purchaseId: purchase.id,
      ticketNumber: `${event.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      qrCode: await this.generateQRCode({
        eventId: event.id,
        ticketId: this.generateId()
      }),
      status: 'valid',
      createdAt: new Date()
    };

    await this.saveToDatabase('event_tickets', ticket);
    return ticket;
  }

  private generateQRCode(data: any): Promise<string> {
    // Implementation would use a QR code library
    return Promise.resolve(`QR_${JSON.stringify(data)}`);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async saveToDatabase(table: string, data: any): Promise<void> {
    // Database save implementation
    await this.redis.set(`${table}:${data.id}`, JSON.stringify(data));
  }

  private async getBooking(bookingId: string): Promise<any> {
    const data = await this.redis.get(`bookings:${bookingId}`);
    return data ? JSON.parse(data) : null;
  }

  private async getExperience(experienceId: string): Promise<any> {
    const data = await this.redis.get(`dining_experiences:${experienceId}`);
    return data ? JSON.parse(data) : null;
  }

  private async getPrivateEventRequest(requestId: string): Promise<any> {
    const data = await this.redis.get(`private_event_requests:${requestId}`);
    return data ? JSON.parse(data) : null;
  }

  private async getTicketedEvent(eventId: string): Promise<any> {
    const data = await this.redis.get(`ticketed_events:${eventId}`);
    return data ? JSON.parse(data) : null;
  }

  private async getTicketTier(tierId: string): Promise<any> {
    const data = await this.redis.get(`ticket_tiers:${tierId}`);
    return data ? JSON.parse(data) : null;
  }

  private async createBooking(bookingData: any): Promise<any> {
    const booking = {
      id: this.generateId(),
      ...bookingData,
      status: 'confirmed',
      createdAt: new Date()
    };
    await this.saveToDatabase('bookings', booking);
    return booking;
  }

  private async updateBookingPaymentStatus(bookingId: string, status: any): Promise<void> {
    const booking = await this.getBooking(bookingId);
    if (booking) {
      Object.assign(booking, status);
      await this.saveToDatabase('bookings', booking);
    }
  }

  private async updateExperienceAvailability(experienceId: string, change: number): Promise<void> {
    const experience = await this.getExperience(experienceId);
    if (experience) {
      experience.availableSeats += change;
      await this.saveToDatabase('dining_experiences', experience);
    }
  }

  private async createTicketTier(eventId: string, tier: any): Promise<void> {
    const tierData = {
      id: this.generateId(),
      eventId,
      ...tier,
      available: tier.quantity,
      sold: 0,
      createdAt: new Date()
    };
    await this.saveToDatabase('ticket_tiers', tierData);
  }

  private async updateTicketAvailability(tierId: string, change: number): Promise<void> {
    const tier = await this.getTicketTier(tierId);
    if (tier) {
      tier.available += change;
      tier.sold -= change;
      await this.saveToDatabase('ticket_tiers', tier);
    }
  }

  private async updateEventStats(eventId: string, ticketsSold: number, revenue: number): Promise<void> {
    const event = await this.getTicketedEvent(eventId);
    if (event) {
      event.ticketsSold += ticketsSold;
      event.revenue += revenue;
      await this.saveToDatabase('ticketed_events', event);
    }
  }

  private async checkVenueAvailability(restaurantId: string, date: Date, spaces: string[]): Promise<boolean> {
    // Check if venue is available
    return true; // Simplified implementation
  }

  private async notifyRestaurantOfPrivateEvent(restaurantId: string, request: any): Promise<void> {
    this.emit('notification:private_event', { restaurantId, request });
  }

  private async blockVenueForEvent(restaurantId: string, date: Date, spaces: string[]): Promise<void> {
    // Block venue availability
    this.emit('venue:blocked', { restaurantId, date, spaces });
  }

  private async getAvailableTables(restaurantId: string, date: Date): Promise<any[]> {
    // Get available tables
    return []; // Simplified implementation
  }

  private async calculateGroupPrice(menuSelection: any, guestCount: number): Promise<number> {
    // Calculate group pricing
    return menuSelection.pricePerPerson * guestCount;
  }

  private async sendExperienceReminder(bookingId: string): Promise<void> {
    // Send reminder notification
    this.emit('reminder:sent', { bookingId });
  }
}

// Type definitions
interface DiningExperience {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  type: 'chef_table' | 'wine_pairing' | 'tasting_menu' | 'cooking_class' | 'custom';
  date: Date;
  time: string;
  duration: number;
  maxGuests: number;
  availableSeats: number;
  pricePerPerson: number;
  depositRequired: number;
  includedItems: string[];
  restrictions: string[];
  status: 'draft' | 'published' | 'sold_out' | 'cancelled';
  bookings: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ExperienceBooking {
  id: string;
  experienceId: string;
  userId?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  partySize: number;
  dietaryRestrictions?: string[];
  specialRequests?: string;
  totalAmount: number;
  depositAmount: number;
  paymentMethodId?: string;
  paymentIntentId?: string;
  paymentStatus: 'pending' | 'deposit_paid' | 'paid_full' | 'refunded';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: Date;
}

interface GroupBooking {
  id: string;
  restaurantId: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  companyName?: string;
  date: Date;
  time: string;
  totalGuests: number;
  eventType: 'corporate' | 'wedding' | 'birthday' | 'reunion' | 'other';
  menuSelection?: any;
  specialRequests?: string;
  individualBookings: string[];
  totalAmount: number;
  depositPaid: boolean;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: Date;
}

interface PrivateEventRequest {
  id: string;
  restaurantId: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  companyName?: string;
  eventType: string;
  date: Date;
  startTime: string;
  endTime: string;
  guestCount: number;
  spaces: string[];
  cateringRequirements: any;
  audioVisualNeeds?: any;
  decorationRequests?: any;
  budget?: number;
  status: 'pending_review' | 'quote_sent' | 'approved' | 'rejected' | 'unavailable';
  quote?: EventQuote;
  createdAt: Date;
}

interface EventContract {
  id: string;
  requestId: string;
  contractNumber: string;
  totalAmount: number;
  depositAmount: number;
  depositDueDate: Date;
  finalPaymentDueDate: Date;
  cancellationPolicy: any;
  terms: string[];
  signedBy?: string;
  signedAt?: Date;
  status: 'pending_signature' | 'signed' | 'cancelled';
  createdAt: Date;
}

interface EventQuote {
  basePrice: number;
  venueRental: number;
  serviceCharge: number;
  tax: number;
  totalAmount: number;
  validUntil: Date;
}

interface TicketedEvent {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  date: Date;
  time: string;
  duration: number;
  capacity: number;
  ticketTiers: TicketTier[];
  ticketsSold: number;
  revenue: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
}

interface TicketTier {
  name: string;
  description: string;
  price: number;
  quantity: number;
  benefits: string[];
  available?: number;
  sold?: number;
}

interface TicketPurchase {
  id: string;
  eventId: string;
  tierId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  purchaserInfo: any;
  tickets: string[];
  paymentIntentId?: string;
  status: 'pending' | 'completed' | 'refunded';
  createdAt: Date;
}

export default AdvancedBookingService;