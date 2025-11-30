// Affiliate Network & Distribution Channels Service
import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { createLogger } from '../../utils/logger';
import { Redis } from 'ioredis';
import crypto from 'crypto';

export interface AffiliatePartner {
  id: string;
  name: string;
  type: 'travel' | 'lifestyle' | 'corporate' | 'payment' | 'social' | 'search';
  status: 'active' | 'pending' | 'inactive';
  apiEndpoint: string;
  apiKey: string;
  commissionRate: number;
  integrationLevel: 'basic' | 'standard' | 'premium';
  features: string[];
  metrics: PartnerMetrics;
}

export interface PartnerMetrics {
  totalBookings: number;
  conversionRate: number;
  averageBookingValue: number;
  totalRevenue: number;
  lastSyncDate: Date;
}

export interface DistributionChannel {
  id: string;
  name: string;
  type: 'direct' | 'partner' | 'widget' | 'api' | 'social';
  configuration: any;
  isActive: boolean;
}

export interface BookingAttribution {
  source: string;
  channel: string;
  partnerId?: string;
  campaignId?: string;
  utmParams?: Record<string, string>;
  commission?: number;
}

export class AffiliateNetworkService extends EventEmitter {
  private partners: Map<string, AffiliatePartner>;
  private channels: Map<string, DistributionChannel>;
  private partnerClients: Map<string, AxiosInstance>;
  private logger: any;
  private redis: Redis;

  constructor() {
    super();
    this.logger = createLogger('Affiliate-Network');
    this.partners = new Map();
    this.channels = new Map();
    this.partnerClients = new Map();
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    this.initializePartners();
    this.initializeChannels();
  }

  private async initializePartners(): Promise<void> {
    // Initialize major affiliate partners
    
    // Google Reserve Integration
    this.registerPartner({
      id: 'google-reserve',
      name: 'Google Reserve',
      type: 'search',
      status: 'active',
      apiEndpoint: 'https://maps.googleapis.com/maps/api',
      apiKey: process.env.GOOGLE_RESERVE_API_KEY || '',
      commissionRate: 0.02,
      integrationLevel: 'premium',
      features: ['instant-booking', 'maps-integration', 'voice-booking'],
      metrics: this.getDefaultMetrics()
    });

    // Meta (Facebook/Instagram) Integration
    this.registerPartner({
      id: 'meta-business',
      name: 'Meta Business',
      type: 'social',
      status: 'active',
      apiEndpoint: 'https://graph.facebook.com/v18.0',
      apiKey: process.env.META_ACCESS_TOKEN || '',
      commissionRate: 0.015,
      integrationLevel: 'premium',
      features: ['instagram-booking', 'facebook-booking', 'messenger-chat'],
      metrics: this.getDefaultMetrics()
    });

    // TripAdvisor Integration
    this.registerPartner({
      id: 'tripadvisor',
      name: 'TripAdvisor',
      type: 'travel',
      status: 'active',
      apiEndpoint: 'https://api.tripadvisor.com/api/partner/v2',
      apiKey: process.env.TRIPADVISOR_API_KEY || '',
      commissionRate: 0.025,
      integrationLevel: 'standard',
      features: ['instant-booking', 'reviews-sync', 'traveler-choice'],
      metrics: this.getDefaultMetrics()
    });

    // Expedia Group Integration
    this.registerPartner({
      id: 'expedia-group',
      name: 'Expedia Group',
      type: 'travel',
      status: 'active',
      apiEndpoint: 'https://api.expediapartnercentral.com',
      apiKey: process.env.EXPEDIA_API_KEY || '',
      commissionRate: 0.03,
      integrationLevel: 'standard',
      features: ['hotels-com', 'vrbo-integration', 'package-deals'],
      metrics: this.getDefaultMetrics()
    });

    // American Express Integration
    this.registerPartner({
      id: 'amex-dining',
      name: 'American Express Dining',
      type: 'payment',
      status: 'active',
      apiEndpoint: 'https://api.americanexpress.com/dining',
      apiKey: process.env.AMEX_API_KEY || '',
      commissionRate: 0.02,
      integrationLevel: 'premium',
      features: ['platinum-concierge', 'points-redemption', 'exclusive-access'],
      metrics: this.getDefaultMetrics()
    });

    // Chase Dining Integration
    this.registerPartner({
      id: 'chase-dining',
      name: 'Chase Ultimate Rewards Dining',
      type: 'payment',
      status: 'active',
      apiEndpoint: 'https://api.chase.com/dining',
      apiKey: process.env.CHASE_API_KEY || '',
      commissionRate: 0.018,
      integrationLevel: 'standard',
      features: ['sapphire-benefits', 'points-earning', 'priority-seating'],
      metrics: this.getDefaultMetrics()
    });

    // Yelp Integration
    this.registerPartner({
      id: 'yelp',
      name: 'Yelp Reservations',
      type: 'lifestyle',
      status: 'active',
      apiEndpoint: 'https://api.yelp.com/v3',
      apiKey: process.env.YELP_API_KEY || '',
      commissionRate: 0.02,
      integrationLevel: 'standard',
      features: ['instant-booking', 'waitlist', 'reviews-integration'],
      metrics: this.getDefaultMetrics()
    });

    // Uber Eats Integration (for dine-in reservations)
    this.registerPartner({
      id: 'uber-eats',
      name: 'Uber Eats Dine-In',
      type: 'lifestyle',
      status: 'active',
      apiEndpoint: 'https://api.uber.com/v1/eats',
      apiKey: process.env.UBER_EATS_API_KEY || '',
      commissionRate: 0.015,
      integrationLevel: 'basic',
      features: ['uber-integration', 'ride-booking', 'loyalty-points'],
      metrics: this.getDefaultMetrics()
    });

    // Hotel Concierge Networks
    this.registerPartner({
      id: 'leading-hotels',
      name: 'Leading Hotels of the World',
      type: 'travel',
      status: 'active',
      apiEndpoint: 'https://api.lhw.com/concierge',
      apiKey: process.env.LHW_API_KEY || '',
      commissionRate: 0.035,
      integrationLevel: 'premium',
      features: ['concierge-booking', 'vip-treatment', 'exclusive-events'],
      metrics: this.getDefaultMetrics()
    });

    // Corporate Travel Management
    this.registerPartner({
      id: 'concur',
      name: 'SAP Concur',
      type: 'corporate',
      status: 'active',
      apiEndpoint: 'https://api.concur.com',
      apiKey: process.env.CONCUR_API_KEY || '',
      commissionRate: 0.01,
      integrationLevel: 'premium',
      features: ['expense-integration', 'corporate-booking', 'policy-compliance'],
      metrics: this.getDefaultMetrics()
    });
  }

  private getDefaultMetrics(): PartnerMetrics {
    return {
      totalBookings: 0,
      conversionRate: 0,
      averageBookingValue: 0,
      totalRevenue: 0,
      lastSyncDate: new Date()
    };
  }

  private registerPartner(partner: AffiliatePartner): void {
    this.partners.set(partner.id, partner);
    
    // Create API client for partner
    const client = axios.create({
      baseURL: partner.apiEndpoint,
      headers: {
        'Authorization': `Bearer ${partner.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    this.partnerClients.set(partner.id, client);
    this.logger.info(`Registered partner: ${partner.name}`);
  }

  private async initializeChannels(): Promise<void> {
    // Direct website channel
    this.channels.set('website', {
      id: 'website',
      name: 'Restaurant Website',
      type: 'direct',
      configuration: { widget: true, iframe: true },
      isActive: true
    });

    // Partner API channel
    this.channels.set('partner-api', {
      id: 'partner-api',
      name: 'Partner API',
      type: 'api',
      configuration: { rateLimit: 1000, authentication: 'oauth2' },
      isActive: true
    });

    // Social media channels
    this.channels.set('instagram', {
      id: 'instagram',
      name: 'Instagram Booking',
      type: 'social',
      configuration: { businessAccount: true, storyBooking: true },
      isActive: true
    });

    this.channels.set('facebook', {
      id: 'facebook',
      name: 'Facebook Booking',
      type: 'social',
      configuration: { pageBooking: true, messengerBot: true },
      isActive: true
    });

    // Widget channel
    this.channels.set('widget', {
      id: 'widget',
      name: 'Embedded Widget',
      type: 'widget',
      configuration: { customizable: true, responsive: true },
      isActive: true
    });
  }

  // Sync restaurant availability with all partners
  async syncAvailability(
    restaurantId: string,
    availability: any
  ): Promise<void> {
    const syncPromises = [];

    for (const [partnerId, partner] of this.partners) {
      if (partner.status === 'active') {
        syncPromises.push(
          this.syncPartnerAvailability(partnerId, restaurantId, availability)
            .catch(error => {
              this.logger.error(`Failed to sync with ${partnerId}:`, error);
              return null;
            })
        );
      }
    }

    await Promise.all(syncPromises);
    this.emit('availabilitySynced', { restaurantId, partnersUpdated: syncPromises.length });
  }

  private async syncPartnerAvailability(
    partnerId: string,
    restaurantId: string,
    availability: any
  ): Promise<void> {
    const partner = this.partners.get(partnerId);
    const client = this.partnerClients.get(partnerId);

    if (!partner || !client) return;

    switch (partnerId) {
      case 'google-reserve':
        await this.syncGoogleReserve(client, restaurantId, availability);
        break;
      case 'meta-business':
        await this.syncMetaBusiness(client, restaurantId, availability);
        break;
      case 'tripadvisor':
        await this.syncTripAdvisor(client, restaurantId, availability);
        break;
      default:
        await this.syncGenericPartner(client, partner, restaurantId, availability);
    }
  }

  private async syncGoogleReserve(
    client: AxiosInstance,
    restaurantId: string,
    availability: any
  ): Promise<void> {
    // Google Reserve specific implementation
    const googleFormat = {
      merchant_id: restaurantId,
      services: [{
        service_id: 'dining',
        availability: availability.slots.map((slot: any) => ({
          start_time: slot.startTime,
          duration_seconds: 5400, // 90 minutes
          spots_total: slot.capacity,
          spots_open: slot.available
        }))
      }]
    };

    await client.post('/reserve/v1/availability', googleFormat);
  }

  private async syncMetaBusiness(
    client: AxiosInstance,
    restaurantId: string,
    availability: any
  ): Promise<void> {
    // Meta (Facebook/Instagram) specific implementation
    const metaFormat = {
      data: [{
        restaurant_id: restaurantId,
        availability_start: availability.date,
        time_slots: availability.slots.map((slot: any) => ({
          time: slot.startTime,
          party_sizes_available: [2, 4, 6, 8],
          booking_limit: slot.available
        }))
      }]
    };

    await client.post(`/${restaurantId}/availability`, metaFormat);
  }

  private async syncTripAdvisor(
    client: AxiosInstance,
    restaurantId: string,
    availability: any
  ): Promise<void> {
    // TripAdvisor specific implementation
    const tripAdvisorFormat = {
      location_id: restaurantId,
      availability_date: availability.date,
      time_slots: availability.slots.map((slot: any) => ({
        time: slot.startTime,
        available: slot.available > 0,
        party_size_max: 8
      }))
    };

    await client.put(`/locations/${restaurantId}/availability`, tripAdvisorFormat);
  }

  private async syncGenericPartner(
    client: AxiosInstance,
    partner: AffiliatePartner,
    restaurantId: string,
    availability: any
  ): Promise<void> {
    // Generic partner sync
    const genericFormat = {
      partner_id: partner.id,
      restaurant_id: restaurantId,
      availability: availability,
      timestamp: new Date().toISOString()
    };

    await client.post('/availability/sync', genericFormat);
  }

  // Process booking from partner
  async processPartnerBooking(
    partnerId: string,
    bookingData: any
  ): Promise<any> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner ${partnerId} not found`);
    }

    // Validate booking data
    const validatedBooking = await this.validatePartnerBooking(partner, bookingData);

    // Calculate commission
    const commission = validatedBooking.totalAmount * partner.commissionRate;

    // Create booking with attribution
    const booking = {
      ...validatedBooking,
      attribution: {
        source: partner.name,
        channel: 'partner',
        partnerId: partner.id,
        commission
      } as BookingAttribution
    };

    // Store booking
    await this.storeBooking(booking);

    // Update partner metrics
    await this.updatePartnerMetrics(partnerId, booking);

    // Send confirmation to partner
    await this.sendPartnerConfirmation(partnerId, booking);

    this.emit('partnerBookingProcessed', { partnerId, booking });

    return booking;
  }

  private async validatePartnerBooking(
    partner: AffiliatePartner,
    bookingData: any
  ): Promise<any> {
    // Validate required fields based on partner requirements
    const requiredFields = ['restaurantId', 'date', 'time', 'partySize', 'customerEmail'];
    
    for (const field of requiredFields) {
      if (!bookingData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Verify availability
    const isAvailable = await this.checkAvailability(
      bookingData.restaurantId,
      bookingData.date,
      bookingData.time,
      bookingData.partySize
    );

    if (!isAvailable) {
      throw new Error('Requested time slot not available');
    }

    return bookingData;
  }

  private async checkAvailability(
    restaurantId: string,
    date: string,
    time: string,
    partySize: number
  ): Promise<boolean> {
    // Check availability in database
    // This would query the actual availability system
    return true; // Simplified for example
  }

  private async storeBooking(booking: any): Promise<void> {
    // Store in database
    const key = `booking:${booking.id}`;
    await this.redis.setex(key, 86400, JSON.stringify(booking));
  }

  private async updatePartnerMetrics(partnerId: string, booking: any): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) return;

    partner.metrics.totalBookings++;
    partner.metrics.totalRevenue += booking.attribution.commission;
    partner.metrics.lastSyncDate = new Date();

    // Update in database
    await this.redis.hset(
      `partner:metrics:${partnerId}`,
      'totalBookings', partner.metrics.totalBookings.toString(),
      'totalRevenue', partner.metrics.totalRevenue.toString(),
      'lastSync', partner.metrics.lastSyncDate.toISOString()
    );
  }

  private async sendPartnerConfirmation(partnerId: string, booking: any): Promise<void> {
    const client = this.partnerClients.get(partnerId);
    if (!client) return;

    try {
      await client.post('/booking/confirmation', {
        booking_id: booking.id,
        status: 'confirmed',
        confirmation_code: booking.confirmationCode,
        restaurant_name: booking.restaurantName,
        reservation_time: booking.time,
        party_size: booking.partySize
      });
    } catch (error) {
      this.logger.error(`Failed to send confirmation to ${partnerId}:`, error);
    }
  }

  // Widget generation for partners
  async generateWidget(
    restaurantId: string,
    options: {
      type: 'iframe' | 'button' | 'calendar';
      style?: any;
      language?: string;
      partnerId?: string;
    }
  ): Promise<string> {
    const widgetId = crypto.randomBytes(16).toString('hex');
    const baseUrl = process.env.WIDGET_BASE_URL || 'https://widgets.opentable.com';

    let widgetCode = '';

    switch (options.type) {
      case 'iframe':
        widgetCode = `
          <iframe 
            id="opentable-widget-${widgetId}"
            src="${baseUrl}/restaurant/${restaurantId}?widget=${widgetId}&partner=${options.partnerId || 'direct'}&lang=${options.language || 'en'}"
            width="100%"
            height="600"
            frameborder="0"
            style="${this.styleToString(options.style)}"
          ></iframe>
        `;
        break;

      case 'button':
        widgetCode = `
          <button 
            id="opentable-button-${widgetId}"
            onclick="window.open('${baseUrl}/reserve/${restaurantId}?widget=${widgetId}&partner=${options.partnerId || 'direct'}', 'reservation', 'width=600,height=800')"
            style="${this.styleToString(options.style)}"
          >
            Reserve Now
          </button>
        `;
        break;

      case 'calendar':
        widgetCode = `
          <div id="opentable-calendar-${widgetId}"></div>
          <script src="${baseUrl}/widget.js"></script>
          <script>
            OpenTableWidget.init({
              restaurantId: '${restaurantId}',
              widgetId: '${widgetId}',
              type: 'calendar',
              container: 'opentable-calendar-${widgetId}',
              partner: '${options.partnerId || 'direct'}',
              language: '${options.language || 'en'}',
              style: ${JSON.stringify(options.style || {})}
            });
          </script>
        `;
        break;
    }

    // Track widget creation
    await this.trackWidgetCreation(widgetId, restaurantId, options);

    return widgetCode;
  }

  private styleToString(style: any): string {
    if (!style) return '';
    return Object.entries(style)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  private async trackWidgetCreation(
    widgetId: string,
    restaurantId: string,
    options: any
  ): Promise<void> {
    await this.redis.hset(
      `widget:${widgetId}`,
      'restaurantId', restaurantId,
      'type', options.type,
      'partnerId', options.partnerId || 'direct',
      'created', new Date().toISOString()
    );
  }

  // Analytics and reporting
  async getPartnerAnalytics(
    partnerId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const analytics: any = {};

    const partners = partnerId ? 
      [this.partners.get(partnerId)].filter(Boolean) : 
      Array.from(this.partners.values());

    for (const partner of partners) {
      const metrics = await this.getPartnerMetrics(partner.id, startDate, endDate);
      analytics[partner.id] = {
        name: partner.name,
        type: partner.type,
        ...metrics
      };
    }

    return analytics;
  }

  private async getPartnerMetrics(
    partnerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    // Get metrics from database
    const metrics = await this.redis.hgetall(`partner:metrics:${partnerId}`);
    
    return {
      totalBookings: parseInt(metrics.totalBookings || '0'),
      totalRevenue: parseFloat(metrics.totalRevenue || '0'),
      conversionRate: parseFloat(metrics.conversionRate || '0'),
      averageBookingValue: parseFloat(metrics.averageBookingValue || '0'),
      lastSync: metrics.lastSync || null
    };
  }

  // Attribution tracking
  async trackAttribution(
    sessionId: string,
    attribution: Partial<BookingAttribution>
  ): Promise<void> {
    const key = `attribution:${sessionId}`;
    await this.redis.setex(key, 3600, JSON.stringify(attribution));
  }

  async getAttribution(sessionId: string): Promise<BookingAttribution | null> {
    const key = `attribution:${sessionId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Revenue sharing calculations
  async calculateRevenueShar(
    booking: any
  ): Promise<{ partnerShare: number; platformShare: number }> {
    const partner = this.partners.get(booking.attribution?.partnerId);
    if (!partner) {
      return { partnerShare: 0, platformShare: booking.totalAmount };
    }

    const partnerShare = booking.totalAmount * partner.commissionRate;
    const platformShare = booking.totalAmount - partnerShare;

    return { partnerShare, platformShare };
  }

  // Batch operations for efficiency
  async batchSyncAvailability(
    updates: Array<{ restaurantId: string; availability: any }>
  ): Promise<void> {
    const batchSize = 100;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      await Promise.all(
        batch.map(update => 
          this.syncAvailability(update.restaurantId, update.availability)
        )
      );
    }
  }
}

export const affiliateNetwork = new AffiliateNetworkService();