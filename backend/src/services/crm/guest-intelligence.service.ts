// Guest CRM & Intelligence Service
import { EventEmitter } from 'events';
import { createLogger } from '../../utils/logger';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import * as tf from '@tensorflow/tfjs-node';

export interface GuestProfile {
  id: string;
  personalInfo: PersonalInfo;
  diningPreferences: DiningPreferences;
  behaviorMetrics: BehaviorMetrics;
  segmentation: GuestSegmentation;
  lifetimeValue: LifetimeValue;
  socialConnections: SocialConnections;
  specialDates: SpecialDate[];
  dietaryRestrictions: DietaryRestriction[];
  allergens: string[];
  notes: GuestNote[];
  tags: string[];
  vipStatus: VIPStatus;
  riskProfile: RiskProfile;
  predictedBehavior: PredictedBehavior;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhones: string[];
  address: Address;
  birthDate?: Date;
  gender?: string;
  language: string;
  timezone: string;
  communicationPreferences: CommunicationPreferences;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface CommunicationPreferences {
  emailOptIn: boolean;
  smsOptIn: boolean;
  pushOptIn: boolean;
  marketingOptIn: boolean;
  preferredChannel: 'email' | 'sms' | 'push' | 'none';
  frequency: 'daily' | 'weekly' | 'monthly' | 'occasional';
  topics: string[];
}

export interface DiningPreferences {
  cuisinePreferences: CuisinePreference[];
  priceRangePreference: number[];
  ambiance: string[];
  seatingPreferences: string[];
  timePreferences: TimePreference;
  partySize: PartySizePreference;
  restaurantTypes: string[];
  favoriteRestaurants: string[];
  blacklistedRestaurants: string[];
  specialRequests: string[];
}

export interface CuisinePreference {
  cuisine: string;
  rating: number;
  frequency: number;
}

export interface TimePreference {
  breakfast: number;
  lunch: number;
  dinner: number;
  lateNight: number;
  weekdayPreference: number;
  weekendPreference: number;
  peakTimes: string[];
}

export interface PartySizePreference {
  average: number;
  min: number;
  max: number;
  largePartyFrequency: number;
}

export interface BehaviorMetrics {
  totalReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  noShows: number;
  modificationCount: number;
  averageLeadTime: number;
  averageSpend: number;
  totalSpend: number;
  frequencyScore: number;
  recencyScore: number;
  monetaryScore: number;
  rfmScore: number;
  engagementScore: number;
  loyaltyScore: number;
  influenceScore: number;
}

export interface GuestSegmentation {
  primarySegment: string;
  secondarySegments: string[];
  behaviorType: 'regular' | 'occasional' | 'special_occasion' | 'business' | 'tourist';
  valueSegment: 'high' | 'medium' | 'low';
  lifecycleStage: 'new' | 'active' | 'loyal' | 'at_risk' | 'churned' | 'win_back';
  psychographicProfile: string[];
}

export interface LifetimeValue {
  currentValue: number;
  predictedValue: number;
  averageOrderValue: number;
  purchaseFrequency: number;
  customerLifespan: number;
  churnProbability: number;
  growthPotential: number;
}

export interface SocialConnections {
  familyMembers: string[];
  frequentCompanions: string[];
  referrals: number;
  socialMediaProfiles: SocialProfile[];
  influencerStatus: boolean;
  networkSize: number;
}

export interface SocialProfile {
  platform: string;
  handle: string;
  followers: number;
  verified: boolean;
}

export interface SpecialDate {
  id: string;
  type: 'birthday' | 'anniversary' | 'custom';
  date: Date;
  recurring: boolean;
  name: string;
  autoReminder: boolean;
  specialOfferEligible: boolean;
}

export interface DietaryRestriction {
  type: string;
  severity: 'preference' | 'intolerance' | 'allergy' | 'medical';
  notes: string;
}

export interface GuestNote {
  id: string;
  content: string;
  category: 'preference' | 'incident' | 'compliment' | 'complaint' | 'special_request' | 'general';
  restaurantId?: string;
  createdBy: string;
  createdAt: Date;
  isShared: boolean;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface VIPStatus {
  isVIP: boolean;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'black';
  benefits: string[];
  expiryDate?: Date;
  reasonForStatus: string;
  specialTreatment: string[];
}

export interface RiskProfile {
  churnRisk: number;
  fraudRisk: number;
  creditRisk: number;
  complainRisk: number;
  lastRiskAssessment: Date;
  riskFactors: string[];
}

export interface PredictedBehavior {
  nextVisitProbability: number;
  predictedNextVisitDate?: Date;
  recommendedRestaurants: string[];
  recommendedOffers: string[];
  predictedSpend: number;
  predictedPartySize: number;
  predictedCuisine: string[];
  upsellOpportunities: string[];
}

export class GuestIntelligenceService extends EventEmitter {
  private logger: any;
  private redis: Redis;
  private db: Pool;
  private guestProfiles: Map<string, GuestProfile>;
  private mlModels: Map<string, tf.LayersModel>;

  constructor() {
    super();
    this.logger = createLogger('Guest-Intelligence');
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    this.db = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    this.guestProfiles = new Map();
    this.mlModels = new Map();

    this.initializeMLModels();
    this.startRealTimeProcessing();
  }

  private async initializeMLModels(): Promise<void> {
    // Initialize machine learning models for predictions
    await this.loadChurnPredictionModel();
    await this.loadNextVisitModel();
    await this.loadSpendPredictionModel();
    await this.loadRecommendationModel();
  }

  private async loadChurnPredictionModel(): Promise<void> {
    try {
      const model = await tf.loadLayersModel('file://./models/churn-prediction/model.json');
      this.mlModels.set('churn-prediction', model);
    } catch {
      const model = this.createChurnPredictionModel();
      this.mlModels.set('churn-prediction', model);
    }
  }

  private createChurnPredictionModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          inputShape: [20] // 20 features
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private async loadNextVisitModel(): Promise<void> {
    // Similar to churn model
  }

  private async loadSpendPredictionModel(): Promise<void> {
    // Similar to churn model
  }

  private async loadRecommendationModel(): Promise<void> {
    // Collaborative filtering model for recommendations
  }

  private startRealTimeProcessing(): void {
    // Process real-time events to update guest profiles
    setInterval(() => this.processRealtimeUpdates(), 5000);
  }

  private async processRealtimeUpdates(): Promise<void> {
    // Process queued events and update profiles
    const events = await this.redis.lrange('guest-events', 0, 100);
    
    for (const eventStr of events) {
      const event = JSON.parse(eventStr);
      await this.processGuestEvent(event);
    }

    await this.redis.ltrim('guest-events', events.length, -1);
  }

  private async processGuestEvent(event: any): Promise<void> {
    const profile = await this.getGuestProfile(event.guestId);
    
    switch (event.type) {
      case 'reservation_made':
        await this.updateReservationMetrics(profile, event.data);
        break;
      case 'review_submitted':
        await this.updatePreferences(profile, event.data);
        break;
      case 'payment_completed':
        await this.updateSpendMetrics(profile, event.data);
        break;
      case 'profile_viewed':
        await this.updateEngagement(profile);
        break;
    }

    await this.saveGuestProfile(profile);
    await this.recalculateScores(profile);
  }

  // Get or create guest profile
  async getGuestProfile(guestId: string): Promise<GuestProfile> {
    // Check cache first
    let profile = this.guestProfiles.get(guestId);
    if (profile) return profile;

    // Check Redis
    const cached = await this.redis.get(`guest:${guestId}`);
    if (cached) {
      profile = JSON.parse(cached);
      this.guestProfiles.set(guestId, profile);
      return profile;
    }

    // Load from database
    profile = await this.loadGuestProfileFromDB(guestId);
    if (!profile) {
      profile = await this.createNewGuestProfile(guestId);
    }

    // Enrich with predictions
    await this.enrichProfileWithPredictions(profile);

    this.guestProfiles.set(guestId, profile);
    await this.cacheGuestProfile(profile);

    return profile;
  }

  private async loadGuestProfileFromDB(guestId: string): Promise<GuestProfile | null> {
    const query = `
      SELECT 
        u.*,
        COUNT(DISTINCT r.id) as total_reservations,
        COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_reservations,
        COUNT(DISTINCT CASE WHEN r.status = 'cancelled' THEN r.id END) as cancelled_reservations,
        COUNT(DISTINCT CASE WHEN r.status = 'no_show' THEN r.id END) as no_shows,
        AVG(p.total_amount) as avg_spend,
        SUM(p.total_amount) as total_spend,
        MAX(r.reservation_date) as last_visit,
        MIN(r.reservation_date) as first_visit,
        AVG(r.party_size) as avg_party_size
      FROM users u
      LEFT JOIN reservations r ON u.id = r.user_id
      LEFT JOIN payments p ON r.id = p.reservation_id
      WHERE u.id = $1
      GROUP BY u.id
    `;

    const result = await this.db.query(query, [guestId]);
    if (!result.rows.length) return null;

    const data = result.rows[0];
    
    // Load additional data
    const [preferences, notes, specialDates, dietary] = await Promise.all([
      this.loadGuestPreferences(guestId),
      this.loadGuestNotes(guestId),
      this.loadSpecialDates(guestId),
      this.loadDietaryRestrictions(guestId)
    ]);

    return this.buildGuestProfile(data, preferences, notes, specialDates, dietary);
  }

  private async loadGuestPreferences(guestId: string): Promise<any> {
    const query = `
      SELECT 
        cuisine_type,
        COUNT(*) as frequency,
        AVG(rating) as avg_rating
      FROM reservations r
      JOIN restaurants res ON r.restaurant_id = res.id
      LEFT JOIN reviews rev ON r.id = rev.reservation_id
      WHERE r.user_id = $1
      GROUP BY cuisine_type
      ORDER BY frequency DESC
    `;

    const result = await this.db.query(query, [guestId]);
    return result.rows;
  }

  private async loadGuestNotes(guestId: string): Promise<GuestNote[]> {
    const query = `
      SELECT * FROM guest_notes
      WHERE guest_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [guestId]);
    return result.rows;
  }

  private async loadSpecialDates(guestId: string): Promise<SpecialDate[]> {
    const query = `
      SELECT * FROM special_dates
      WHERE guest_id = $1
    `;

    const result = await this.db.query(query, [guestId]);
    return result.rows;
  }

  private async loadDietaryRestrictions(guestId: string): Promise<DietaryRestriction[]> {
    const query = `
      SELECT * FROM dietary_restrictions
      WHERE guest_id = $1
    `;

    const result = await this.db.query(query, [guestId]);
    return result.rows;
  }

  private buildGuestProfile(
    userData: any,
    preferences: any[],
    notes: GuestNote[],
    specialDates: SpecialDate[],
    dietary: DietaryRestriction[]
  ): GuestProfile {
    // Calculate RFM scores
    const rfmScore = this.calculateRFMScore(userData);
    
    // Determine segmentation
    const segmentation = this.determineSegmentation(userData, rfmScore);

    // Calculate lifetime value
    const lifetimeValue = this.calculateLifetimeValue(userData);

    // Build dining preferences
    const diningPreferences = this.buildDiningPreferences(preferences);

    return {
      id: userData.id,
      personalInfo: {
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
        phone: userData.phone,
        alternatePhones: [],
        address: {
          street: userData.street || '',
          city: userData.city || '',
          state: userData.state || '',
          zipCode: userData.zip_code || '',
          country: userData.country || 'US'
        },
        birthDate: userData.birth_date,
        gender: userData.gender,
        language: userData.language || 'en',
        timezone: userData.timezone || 'UTC',
        communicationPreferences: {
          emailOptIn: userData.email_opt_in,
          smsOptIn: userData.sms_opt_in,
          pushOptIn: userData.push_opt_in,
          marketingOptIn: userData.marketing_opt_in,
          preferredChannel: userData.preferred_channel || 'email',
          frequency: userData.communication_frequency || 'monthly',
          topics: userData.communication_topics || []
        }
      },
      diningPreferences,
      behaviorMetrics: {
        totalReservations: userData.total_reservations || 0,
        completedReservations: userData.completed_reservations || 0,
        cancelledReservations: userData.cancelled_reservations || 0,
        noShows: userData.no_shows || 0,
        modificationCount: userData.modification_count || 0,
        averageLeadTime: userData.avg_lead_time || 7,
        averageSpend: userData.avg_spend || 0,
        totalSpend: userData.total_spend || 0,
        frequencyScore: rfmScore.frequency,
        recencyScore: rfmScore.recency,
        monetaryScore: rfmScore.monetary,
        rfmScore: rfmScore.total,
        engagementScore: this.calculateEngagementScore(userData),
        loyaltyScore: this.calculateLoyaltyScore(userData),
        influenceScore: this.calculateInfluenceScore(userData)
      },
      segmentation,
      lifetimeValue,
      socialConnections: {
        familyMembers: [],
        frequentCompanions: [],
        referrals: userData.referral_count || 0,
        socialMediaProfiles: [],
        influencerStatus: false,
        networkSize: 0
      },
      specialDates,
      dietaryRestrictions: dietary,
      allergens: userData.allergens || [],
      notes,
      tags: userData.tags || [],
      vipStatus: this.determineVIPStatus(userData, rfmScore),
      riskProfile: this.assessRiskProfile(userData),
      predictedBehavior: {
        nextVisitProbability: 0,
        recommendedRestaurants: [],
        recommendedOffers: [],
        predictedSpend: 0,
        predictedPartySize: userData.avg_party_size || 2,
        predictedCuisine: [],
        upsellOpportunities: []
      }
    };
  }

  private calculateRFMScore(userData: any): any {
    const now = new Date();
    const lastVisit = userData.last_visit ? new Date(userData.last_visit) : null;
    
    // Recency score (days since last visit)
    const daysSinceLastVisit = lastVisit ? 
      Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    
    let recencyScore = 5;
    if (daysSinceLastVisit <= 7) recencyScore = 5;
    else if (daysSinceLastVisit <= 30) recencyScore = 4;
    else if (daysSinceLastVisit <= 90) recencyScore = 3;
    else if (daysSinceLastVisit <= 180) recencyScore = 2;
    else recencyScore = 1;

    // Frequency score (visits per month)
    const monthsSinceFirst = userData.first_visit ?
      Math.max(1, Math.floor((now.getTime() - new Date(userData.first_visit).getTime()) / (1000 * 60 * 60 * 24 * 30))) : 1;
    const visitsPerMonth = (userData.completed_reservations || 0) / monthsSinceFirst;
    
    let frequencyScore = 5;
    if (visitsPerMonth >= 4) frequencyScore = 5;
    else if (visitsPerMonth >= 2) frequencyScore = 4;
    else if (visitsPerMonth >= 1) frequencyScore = 3;
    else if (visitsPerMonth >= 0.5) frequencyScore = 2;
    else frequencyScore = 1;

    // Monetary score (average spend)
    const avgSpend = userData.avg_spend || 0;
    
    let monetaryScore = 5;
    if (avgSpend >= 200) monetaryScore = 5;
    else if (avgSpend >= 100) monetaryScore = 4;
    else if (avgSpend >= 50) monetaryScore = 3;
    else if (avgSpend >= 25) monetaryScore = 2;
    else monetaryScore = 1;

    return {
      recency: recencyScore,
      frequency: frequencyScore,
      monetary: monetaryScore,
      total: (recencyScore + frequencyScore + monetaryScore) / 3
    };
  }

  private determineSegmentation(userData: any, rfmScore: any): GuestSegmentation {
    let primarySegment = 'occasional';
    let valueSegment: 'high' | 'medium' | 'low' = 'medium';
    let lifecycleStage: any = 'active';

    // Determine primary segment
    if (rfmScore.total >= 4) {
      primarySegment = 'champion';
    } else if (rfmScore.total >= 3.5) {
      primarySegment = 'loyal';
    } else if (rfmScore.total >= 2.5) {
      primarySegment = 'potential_loyalist';
    } else if (rfmScore.recency >= 4) {
      primarySegment = 'new_customer';
    } else if (rfmScore.recency <= 2) {
      primarySegment = 'at_risk';
    }

    // Determine value segment
    if (rfmScore.monetary >= 4) valueSegment = 'high';
    else if (rfmScore.monetary <= 2) valueSegment = 'low';

    // Determine lifecycle stage
    if (!userData.first_visit || userData.total_reservations <= 1) {
      lifecycleStage = 'new';
    } else if (rfmScore.total >= 4) {
      lifecycleStage = 'loyal';
    } else if (rfmScore.recency <= 2) {
      lifecycleStage = 'at_risk';
    } else if (rfmScore.recency === 1) {
      lifecycleStage = 'churned';
    }

    return {
      primarySegment,
      secondarySegments: [],
      behaviorType: this.determineBehaviorType(userData),
      valueSegment,
      lifecycleStage,
      psychographicProfile: []
    };
  }

  private determineBehaviorType(userData: any): any {
    // Analyze booking patterns to determine behavior type
    if (userData.completed_reservations >= 12) return 'regular';
    if (userData.avg_party_size > 4) return 'special_occasion';
    return 'occasional';
  }

  private calculateLifetimeValue(userData: any): LifetimeValue {
    const averageOrderValue = userData.avg_spend || 0;
    const purchaseFrequency = userData.completed_reservations || 0;
    const customerLifespan = 3; // Average 3 years
    
    const currentValue = userData.total_spend || 0;
    const predictedValue = averageOrderValue * purchaseFrequency * customerLifespan;
    
    return {
      currentValue,
      predictedValue,
      averageOrderValue,
      purchaseFrequency,
      customerLifespan,
      churnProbability: 0, // Will be calculated by ML model
      growthPotential: (predictedValue - currentValue) / currentValue
    };
  }

  private buildDiningPreferences(preferences: any[]): DiningPreferences {
    const cuisinePreferences = preferences.map(p => ({
      cuisine: p.cuisine_type,
      rating: p.avg_rating || 4,
      frequency: p.frequency
    }));

    return {
      cuisinePreferences,
      priceRangePreference: [2, 3],
      ambiance: [],
      seatingPreferences: [],
      timePreferences: {
        breakfast: 0,
        lunch: 0.3,
        dinner: 0.7,
        lateNight: 0,
        weekdayPreference: 0.4,
        weekendPreference: 0.6,
        peakTimes: ['19:00', '20:00']
      },
      partySize: {
        average: 2,
        min: 1,
        max: 8,
        largePartyFrequency: 0.1
      },
      restaurantTypes: [],
      favoriteRestaurants: [],
      blacklistedRestaurants: [],
      specialRequests: []
    };
  }

  private calculateEngagementScore(userData: any): number {
    // Calculate based on various engagement metrics
    let score = 0;
    
    if (userData.email_opens) score += userData.email_opens * 0.1;
    if (userData.email_clicks) score += userData.email_clicks * 0.2;
    if (userData.app_sessions) score += userData.app_sessions * 0.15;
    if (userData.reviews_written) score += userData.reviews_written * 0.3;
    if (userData.referrals_made) score += userData.referrals_made * 0.25;
    
    return Math.min(100, score);
  }

  private calculateLoyaltyScore(userData: any): number {
    let score = 0;
    
    // Tenure
    const monthsSinceFirst = userData.first_visit ?
      Math.floor((Date.now() - new Date(userData.first_visit).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0;
    score += Math.min(30, monthsSinceFirst);
    
    // Frequency
    score += Math.min(40, userData.completed_reservations * 2);
    
    // Spend
    score += Math.min(30, userData.total_spend / 100);
    
    return score;
  }

  private calculateInfluenceScore(userData: any): number {
    let score = 0;
    
    if (userData.social_followers) score += Math.min(40, userData.social_followers / 1000);
    if (userData.reviews_written) score += userData.reviews_written * 5;
    if (userData.referrals_made) score += userData.referrals_made * 10;
    if (userData.avg_review_helpfulness) score += userData.avg_review_helpfulness * 10;
    
    return Math.min(100, score);
  }

  private determineVIPStatus(userData: any, rfmScore: any): VIPStatus {
    const isVIP = rfmScore.total >= 4 || userData.total_spend >= 5000;
    
    let tier: any = 'bronze';
    if (userData.total_spend >= 10000) tier = 'black';
    else if (userData.total_spend >= 5000) tier = 'platinum';
    else if (userData.total_spend >= 2500) tier = 'gold';
    else if (userData.total_spend >= 1000) tier = 'silver';

    const benefits = this.getVIPBenefits(tier);
    const specialTreatment = this.getSpecialTreatment(tier);

    return {
      isVIP,
      tier,
      benefits,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      reasonForStatus: rfmScore.total >= 4 ? 'High value customer' : 'Loyalty program',
      specialTreatment
    };
  }

  private getVIPBenefits(tier: string): string[] {
    const benefits: Record<string, string[]> = {
      bronze: ['Priority waitlist', '5% points bonus'],
      silver: ['Priority reservations', '10% points bonus', 'Birthday offer'],
      gold: ['Guaranteed reservations', '15% points bonus', 'Complimentary dessert', 'Concierge service'],
      platinum: ['Last-minute reservations', '20% points bonus', 'Complimentary appetizer', 'Personal concierge'],
      black: ['Anytime reservations', '25% points bonus', 'Complimentary wine', 'Dedicated concierge', 'Exclusive events']
    };

    return benefits[tier] || [];
  }

  private getSpecialTreatment(tier: string): string[] {
    const treatment: Record<string, string[]> = {
      bronze: ['Welcome greeting by name'],
      silver: ['Preferred seating', 'Welcome greeting by manager'],
      gold: ['Best available table', 'Complimentary amuse-bouche', 'Manager check-in'],
      platinum: ['Reserved premium table', 'Complimentary champagne', 'Chef greeting'],
      black: ['Private dining option', 'Custom menu available', 'Owner greeting']
    };

    return treatment[tier] || [];
  }

  private assessRiskProfile(userData: any): RiskProfile {
    const churnRisk = this.calculateChurnRisk(userData);
    const fraudRisk = this.calculateFraudRisk(userData);
    const creditRisk = this.calculateCreditRisk(userData);
    const complainRisk = this.calculateComplainRisk(userData);

    const riskFactors = [];
    if (churnRisk > 0.6) riskFactors.push('High churn risk');
    if (userData.no_shows > 2) riskFactors.push('Multiple no-shows');
    if (userData.cancelled_reservations > 5) riskFactors.push('Frequent cancellations');

    return {
      churnRisk,
      fraudRisk,
      creditRisk,
      complainRisk,
      lastRiskAssessment: new Date(),
      riskFactors
    };
  }

  private calculateChurnRisk(userData: any): number {
    // Simple heuristic - would use ML model in production
    let risk = 0;
    
    const daysSinceLastVisit = userData.last_visit ?
      Math.floor((Date.now() - new Date(userData.last_visit).getTime()) / (1000 * 60 * 60 * 24)) : 999;
    
    if (daysSinceLastVisit > 180) risk = 0.8;
    else if (daysSinceLastVisit > 90) risk = 0.6;
    else if (daysSinceLastVisit > 60) risk = 0.4;
    else if (daysSinceLastVisit > 30) risk = 0.2;
    else risk = 0.1;

    return risk;
  }

  private calculateFraudRisk(userData: any): number {
    let risk = 0;
    
    if (userData.chargebacks > 0) risk += 0.3;
    if (userData.no_shows > 3) risk += 0.2;
    if (userData.multiple_accounts) risk += 0.3;
    
    return Math.min(1, risk);
  }

  private calculateCreditRisk(userData: any): number {
    return userData.payment_failures / Math.max(1, userData.total_reservations);
  }

  private calculateComplainRisk(userData: any): number {
    return userData.complaints / Math.max(1, userData.total_reservations);
  }

  private async createNewGuestProfile(guestId: string): Promise<GuestProfile> {
    // Create a new profile for a new guest
    return {
      id: guestId,
      personalInfo: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        alternatePhones: [],
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US'
        },
        language: 'en',
        timezone: 'UTC',
        communicationPreferences: {
          emailOptIn: true,
          smsOptIn: false,
          pushOptIn: false,
          marketingOptIn: true,
          preferredChannel: 'email',
          frequency: 'monthly',
          topics: []
        }
      },
      diningPreferences: this.getDefaultDiningPreferences(),
      behaviorMetrics: this.getDefaultBehaviorMetrics(),
      segmentation: this.getDefaultSegmentation(),
      lifetimeValue: this.getDefaultLifetimeValue(),
      socialConnections: this.getDefaultSocialConnections(),
      specialDates: [],
      dietaryRestrictions: [],
      allergens: [],
      notes: [],
      tags: [],
      vipStatus: this.getDefaultVIPStatus(),
      riskProfile: this.getDefaultRiskProfile(),
      predictedBehavior: this.getDefaultPredictedBehavior()
    };
  }

  private getDefaultDiningPreferences(): DiningPreferences {
    return {
      cuisinePreferences: [],
      priceRangePreference: [2, 3],
      ambiance: [],
      seatingPreferences: [],
      timePreferences: {
        breakfast: 0,
        lunch: 0.3,
        dinner: 0.7,
        lateNight: 0,
        weekdayPreference: 0.5,
        weekendPreference: 0.5,
        peakTimes: []
      },
      partySize: {
        average: 2,
        min: 1,
        max: 4,
        largePartyFrequency: 0
      },
      restaurantTypes: [],
      favoriteRestaurants: [],
      blacklistedRestaurants: [],
      specialRequests: []
    };
  }

  private getDefaultBehaviorMetrics(): BehaviorMetrics {
    return {
      totalReservations: 0,
      completedReservations: 0,
      cancelledReservations: 0,
      noShows: 0,
      modificationCount: 0,
      averageLeadTime: 7,
      averageSpend: 0,
      totalSpend: 0,
      frequencyScore: 0,
      recencyScore: 0,
      monetaryScore: 0,
      rfmScore: 0,
      engagementScore: 0,
      loyaltyScore: 0,
      influenceScore: 0
    };
  }

  private getDefaultSegmentation(): GuestSegmentation {
    return {
      primarySegment: 'new',
      secondarySegments: [],
      behaviorType: 'occasional',
      valueSegment: 'low',
      lifecycleStage: 'new',
      psychographicProfile: []
    };
  }

  private getDefaultLifetimeValue(): LifetimeValue {
    return {
      currentValue: 0,
      predictedValue: 0,
      averageOrderValue: 0,
      purchaseFrequency: 0,
      customerLifespan: 0,
      churnProbability: 0,
      growthPotential: 0
    };
  }

  private getDefaultSocialConnections(): SocialConnections {
    return {
      familyMembers: [],
      frequentCompanions: [],
      referrals: 0,
      socialMediaProfiles: [],
      influencerStatus: false,
      networkSize: 0
    };
  }

  private getDefaultVIPStatus(): VIPStatus {
    return {
      isVIP: false,
      tier: 'bronze',
      benefits: [],
      reasonForStatus: '',
      specialTreatment: []
    };
  }

  private getDefaultRiskProfile(): RiskProfile {
    return {
      churnRisk: 0,
      fraudRisk: 0,
      creditRisk: 0,
      complainRisk: 0,
      lastRiskAssessment: new Date(),
      riskFactors: []
    };
  }

  private getDefaultPredictedBehavior(): PredictedBehavior {
    return {
      nextVisitProbability: 0,
      recommendedRestaurants: [],
      recommendedOffers: [],
      predictedSpend: 0,
      predictedPartySize: 2,
      predictedCuisine: [],
      upsellOpportunities: []
    };
  }

  // Enrich profile with ML predictions
  private async enrichProfileWithPredictions(profile: GuestProfile): Promise<void> {
    // Predict churn probability
    profile.lifetimeValue.churnProbability = await this.predictChurn(profile);
    
    // Predict next visit
    const nextVisit = await this.predictNextVisit(profile);
    profile.predictedBehavior.nextVisitProbability = nextVisit.probability;
    profile.predictedBehavior.predictedNextVisitDate = nextVisit.date;
    
    // Get recommendations
    profile.predictedBehavior.recommendedRestaurants = await this.getRestaurantRecommendations(profile);
    profile.predictedBehavior.recommendedOffers = await this.getOfferRecommendations(profile);
    
    // Predict spend
    profile.predictedBehavior.predictedSpend = await this.predictSpend(profile);
    
    // Identify upsell opportunities
    profile.predictedBehavior.upsellOpportunities = await this.identifyUpsellOpportunities(profile);
  }

  private async predictChurn(profile: GuestProfile): Promise<number> {
    const model = this.mlModels.get('churn-prediction');
    if (!model) return 0;

    // Prepare features
    const features = tf.tensor2d([[
      profile.behaviorMetrics.recencyScore,
      profile.behaviorMetrics.frequencyScore,
      profile.behaviorMetrics.monetaryScore,
      profile.behaviorMetrics.totalReservations,
      profile.behaviorMetrics.noShows,
      profile.behaviorMetrics.cancelledReservations,
      profile.behaviorMetrics.engagementScore,
      profile.behaviorMetrics.loyaltyScore,
      // Add more features...
    ]]);

    const prediction = model.predict(features) as tf.Tensor;
    const probability = (await prediction.data())[0];

    features.dispose();
    prediction.dispose();

    return probability;
  }

  private async predictNextVisit(profile: GuestProfile): Promise<any> {
    // Use historical patterns to predict next visit
    // Simplified implementation
    const avgDaysBetweenVisits = 30; // Would calculate from history
    const lastVisit = new Date(); // Would get from profile
    
    const nextDate = new Date(lastVisit.getTime() + avgDaysBetweenVisits * 24 * 60 * 60 * 1000);
    const probability = Math.max(0.1, Math.min(0.9, 1 - profile.lifetimeValue.churnProbability));

    return {
      date: nextDate,
      probability
    };
  }

  private async predictSpend(profile: GuestProfile): Promise<number> {
    // Use historical average with trend adjustment
    const baseSpend = profile.behaviorMetrics.averageSpend;
    const trend = profile.lifetimeValue.growthPotential;
    
    return baseSpend * (1 + trend * 0.1);
  }

  private async getRestaurantRecommendations(profile: GuestProfile): Promise<string[]> {
    // Collaborative filtering + content-based recommendations
    const query = `
      SELECT DISTINCT r.id, r.name,
        COUNT(*) as similar_users_visited
      FROM restaurants r
      JOIN reservations res ON r.id = res.restaurant_id
      WHERE res.user_id IN (
        SELECT DISTINCT user_id
        FROM reservations
        WHERE restaurant_id IN (
          SELECT restaurant_id
          FROM reservations
          WHERE user_id = $1
        )
        AND user_id != $1
      )
      AND r.id NOT IN (
        SELECT restaurant_id
        FROM reservations
        WHERE user_id = $1
      )
      GROUP BY r.id, r.name
      ORDER BY similar_users_visited DESC
      LIMIT 10
    `;

    const result = await this.db.query(query, [profile.id]);
    return result.rows.map(r => r.id);
  }

  private async getOfferRecommendations(profile: GuestProfile): Promise<string[]> {
    const offers = [];

    // Birthday offer
    if (profile.specialDates.find(d => d.type === 'birthday')) {
      offers.push('birthday-special');
    }

    // Win-back offer for at-risk customers
    if (profile.segmentation.lifecycleStage === 'at_risk') {
      offers.push('comeback-discount');
    }

    // VIP offers
    if (profile.vipStatus.isVIP) {
      offers.push('vip-exclusive-events');
    }

    // Loyalty milestone offers
    if (profile.behaviorMetrics.totalReservations % 10 === 9) {
      offers.push('loyalty-milestone-reward');
    }

    return offers;
  }

  private async identifyUpsellOpportunities(profile: GuestProfile): Promise<string[]> {
    const opportunities = [];

    // Wine pairing upsell for high spenders
    if (profile.behaviorMetrics.averageSpend > 100) {
      opportunities.push('wine-pairing');
    }

    // Tasting menu for adventurous diners
    if (profile.diningPreferences.cuisinePreferences.length > 5) {
      opportunities.push('tasting-menu');
    }

    // Private dining for large parties
    if (profile.diningPreferences.partySize.largePartyFrequency > 0.2) {
      opportunities.push('private-dining');
    }

    // Premium seating for VIPs
    if (profile.vipStatus.isVIP) {
      opportunities.push('premium-seating');
    }

    return opportunities;
  }

  // Save and cache profile
  private async saveGuestProfile(profile: GuestProfile): Promise<void> {
    // Save to database
    await this.saveToDatabase(profile);
    
    // Update cache
    await this.cacheGuestProfile(profile);
    
    // Update in-memory store
    this.guestProfiles.set(profile.id, profile);
  }

  private async saveToDatabase(profile: GuestProfile): Promise<void> {
    // Update user table
    const userQuery = `
      UPDATE users SET
        first_name = $1,
        last_name = $2,
        email = $3,
        phone = $4,
        updated_at = NOW()
      WHERE id = $5
    `;

    await this.db.query(userQuery, [
      profile.personalInfo.firstName,
      profile.personalInfo.lastName,
      profile.personalInfo.email,
      profile.personalInfo.phone,
      profile.id
    ]);

    // Save metrics
    const metricsQuery = `
      INSERT INTO guest_metrics (
        guest_id, rfm_score, engagement_score, loyalty_score,
        influence_score, churn_probability, lifetime_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (guest_id) DO UPDATE SET
        rfm_score = $2,
        engagement_score = $3,
        loyalty_score = $4,
        influence_score = $5,
        churn_probability = $6,
        lifetime_value = $7,
        updated_at = NOW()
    `;

    await this.db.query(metricsQuery, [
      profile.id,
      profile.behaviorMetrics.rfmScore,
      profile.behaviorMetrics.engagementScore,
      profile.behaviorMetrics.loyaltyScore,
      profile.behaviorMetrics.influenceScore,
      profile.lifetimeValue.churnProbability,
      profile.lifetimeValue.predictedValue
    ]);
  }

  private async cacheGuestProfile(profile: GuestProfile): Promise<void> {
    await this.redis.setex(
      `guest:${profile.id}`,
      3600, // 1 hour
      JSON.stringify(profile)
    );
  }

  // Update methods
  private async updateReservationMetrics(profile: GuestProfile, data: any): Promise<void> {
    profile.behaviorMetrics.totalReservations++;
    if (data.status === 'completed') {
      profile.behaviorMetrics.completedReservations++;
    } else if (data.status === 'cancelled') {
      profile.behaviorMetrics.cancelledReservations++;
    } else if (data.status === 'no_show') {
      profile.behaviorMetrics.noShows++;
    }
  }

  private async updatePreferences(profile: GuestProfile, data: any): Promise<void> {
    // Update cuisine preferences based on review
    const existingPref = profile.diningPreferences.cuisinePreferences.find(
      p => p.cuisine === data.cuisine
    );
    
    if (existingPref) {
      existingPref.frequency++;
      existingPref.rating = (existingPref.rating + data.rating) / 2;
    } else {
      profile.diningPreferences.cuisinePreferences.push({
        cuisine: data.cuisine,
        rating: data.rating,
        frequency: 1
      });
    }
  }

  private async updateSpendMetrics(profile: GuestProfile, data: any): Promise<void> {
    profile.behaviorMetrics.totalSpend += data.amount;
    profile.behaviorMetrics.averageSpend = 
      profile.behaviorMetrics.totalSpend / profile.behaviorMetrics.completedReservations;
  }

  private async updateEngagement(profile: GuestProfile): Promise<void> {
    profile.behaviorMetrics.engagementScore = Math.min(
      100,
      profile.behaviorMetrics.engagementScore + 1
    );
  }

  private async recalculateScores(profile: GuestProfile): Promise<void> {
    // Recalculate RFM and other scores
    const userData = {
      total_spend: profile.behaviorMetrics.totalSpend,
      completed_reservations: profile.behaviorMetrics.completedReservations,
      last_visit: new Date() // Would get actual last visit
    };

    const rfmScore = this.calculateRFMScore(userData);
    profile.behaviorMetrics.rfmScore = rfmScore.total;
    profile.behaviorMetrics.recencyScore = rfmScore.recency;
    profile.behaviorMetrics.frequencyScore = rfmScore.frequency;
    profile.behaviorMetrics.monetaryScore = rfmScore.monetary;
  }

  // Public methods for external use
  async addGuestNote(
    guestId: string,
    note: Omit<GuestNote, 'id' | 'createdAt'>
  ): Promise<void> {
    const profile = await this.getGuestProfile(guestId);
    
    const newNote: GuestNote = {
      id: `note_${Date.now()}`,
      ...note,
      createdAt: new Date()
    };

    profile.notes.push(newNote);
    await this.saveGuestProfile(profile);

    // Save to database
    const query = `
      INSERT INTO guest_notes (
        id, guest_id, content, category, restaurant_id,
        created_by, is_shared, importance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await this.db.query(query, [
      newNote.id,
      guestId,
      newNote.content,
      newNote.category,
      newNote.restaurantId,
      newNote.createdBy,
      newNote.isShared,
      newNote.importance
    ]);

    this.emit('noteAdded', { guestId, note: newNote });
  }

  async addSpecialDate(
    guestId: string,
    specialDate: Omit<SpecialDate, 'id'>
  ): Promise<void> {
    const profile = await this.getGuestProfile(guestId);
    
    const newDate: SpecialDate = {
      id: `date_${Date.now()}`,
      ...specialDate
    };

    profile.specialDates.push(newDate);
    await this.saveGuestProfile(profile);

    this.emit('specialDateAdded', { guestId, specialDate: newDate });
  }

  async updateDietaryRestrictions(
    guestId: string,
    restrictions: DietaryRestriction[]
  ): Promise<void> {
    const profile = await this.getGuestProfile(guestId);
    profile.dietaryRestrictions = restrictions;
    await this.saveGuestProfile(profile);

    this.emit('dietaryRestrictionsUpdated', { guestId, restrictions });
  }

  async getGuestInsights(guestId: string): Promise<any> {
    const profile = await this.getGuestProfile(guestId);
    
    return {
      summary: this.generateGuestSummary(profile),
      recommendations: await this.generateRecommendations(profile),
      actionItems: this.generateActionItems(profile),
      predictedValue: profile.lifetimeValue.predictedValue,
      riskLevel: this.calculateOverallRisk(profile)
    };
  }

  private generateGuestSummary(profile: GuestProfile): string {
    const segments = [];
    
    if (profile.vipStatus.isVIP) {
      segments.push(`VIP ${profile.vipStatus.tier} member`);
    }
    
    segments.push(profile.segmentation.primarySegment);
    segments.push(`${profile.segmentation.valueSegment} value`);
    
    return segments.join(', ');
  }

  private async generateRecommendations(profile: GuestProfile): Promise<string[]> {
    const recommendations = [];

    if (profile.lifetimeValue.churnProbability > 0.6) {
      recommendations.push('Send win-back offer immediately');
    }

    if (profile.specialDates.find(d => {
      const daysUntil = Math.floor((d.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 30;
    })) {
      recommendations.push('Upcoming special date - send personalized offer');
    }

    if (profile.behaviorMetrics.totalReservations === 0) {
      recommendations.push('First-time visitor - ensure exceptional experience');
    }

    if (profile.vipStatus.isVIP) {
      recommendations.push('VIP guest - notify manager for personal greeting');
    }

    return recommendations;
  }

  private generateActionItems(profile: GuestProfile): string[] {
    const actions = [];

    if (profile.dietaryRestrictions.length > 0) {
      actions.push('Review dietary restrictions with kitchen');
    }

    if (profile.notes.find(n => n.importance === 'critical')) {
      actions.push('Review critical notes before seating');
    }

    if (profile.diningPreferences.specialRequests.length > 0) {
      actions.push('Prepare for special requests');
    }

    return actions;
  }

  private calculateOverallRisk(profile: GuestProfile): 'low' | 'medium' | 'high' {
    const avgRisk = (
      profile.riskProfile.churnRisk +
      profile.riskProfile.fraudRisk +
      profile.riskProfile.creditRisk +
      profile.riskProfile.complainRisk
    ) / 4;

    if (avgRisk > 0.6) return 'high';
    if (avgRisk > 0.3) return 'medium';
    return 'low';
  }
}

export const guestIntelligence = new GuestIntelligenceService();