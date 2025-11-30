// Financial and Payment Models

export interface RevenueModel {
  // Restaurant Reservation Revenue
  reservationCommission: {
    type: 'percentage' | 'per_cover' | 'subscription';
    value: number; // percentage (3-5%) or fixed amount ($1-3)
    minimumFee?: number;
  };
  
  // Delivery Revenue
  deliveryCommission: {
    percentage: number; // 15-30% from restaurant
    deliveryFee: number; // $2-6 charged to customer
    serviceFee: number; // 1-3% of order value
    smallOrderFee?: number; // $2-3 for orders under threshold
    smallOrderThreshold?: number; // $15
  };
  
  // Additional Fees
  noShowFee: number; // $15-25
  paymentProcessingFee: {
    percentage: number; // 2.9%
    fixedFee: number; // $0.30
  };
}

export interface DriverPayment {
  basePay: number; // $2-4 per delivery
  distancePay: number; // $0.50-1.00 per mile
  timePay: number; // $0.10-0.20 per minute
  tip: number; // 100% to driver
  peakBonus?: number; // multiplier during busy times
  totalEarnings: number;
  platformFee?: number; // if any fees deducted
}

export interface DriverPayoutCalculation {
  orderId: string;
  driverId: string;
  breakdown: {
    basePay: number;
    distancePay: number;
    timePay: number;
    tip: number;
    bonuses: number;
    penalties?: number; // late delivery, etc.
  };
  grossEarnings: number;
  deductions: {
    platformFee: number;
    taxes?: number;
    insurance?: number;
  };
  netEarnings: number;
  payoutDate: string;
  payoutMethod: 'instant' | 'weekly' | 'daily';
}

export interface RestaurantCommission {
  orderId?: string; // for delivery
  reservationId?: string; // for reservations
  restaurantId: string;
  orderValue: number;
  commissionRate: number;
  commissionAmount: number;
  additionalFees: {
    paymentProcessing: number;
    marketing?: number;
    insurance?: number;
  };
  netAmount: number; // amount restaurant receives
  payoutDate: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number; // monthly
  features: string[];
  limits: {
    maxCovers?: number;
    maxLocations?: number;
    analyticsLevel: 'basic' | 'advanced' | 'premium';
  };
  commissionDiscount?: number; // reduced commission rate
}

export interface FinancialTransaction {
  id: string;
  type: 'reservation_commission' | 'delivery_commission' | 'driver_payout' | 'restaurant_payout' | 'subscription_fee';
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fromParty: string; // user/restaurant ID
  toParty: string; // platform/driver ID
  orderId?: string;
  reservationId?: string;
  description: string;
  processingFees: number;
  netAmount: number;
  createdAt: string;
  completedAt?: string;
  paymentMethod: string;
  metadata?: Record<string, any>;
}

export interface PayoutSchedule {
  recipientId: string;
  recipientType: 'driver' | 'restaurant';
  frequency: 'instant' | 'daily' | 'weekly' | 'monthly';
  minimumPayout: number;
  nextPayoutDate: string;
  pendingAmount: number;
  totalEarnings: number;
  fees: number;
}

export interface PeakPricing {
  id: string;
  name: string;
  multiplier: number; // 1.2x, 1.5x, 2.0x
  conditions: {
    dayOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    timeRange?: {
      start: string; // "17:00"
      end: string; // "21:00"
    };
    weatherCondition?: string; // "rain", "snow"
    demandThreshold?: number; // number of orders per hour
    driverAvailability?: number; // fewer than X drivers online
  };
  geofence?: {
    center: { lat: number; lng: number };
    radius: number; // in miles
  };
  isActive: boolean;
}

export interface EarningsReport {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  revenue: {
    reservations: number;
    delivery: number;
    subscriptions: number;
    other: number;
    total: number;
  };
  expenses: {
    driverPayouts: number;
    restaurantPayouts: number;
    paymentProcessing: number;
    operations: number;
    marketing: number;
    total: number;
  };
  profit: number;
  margins: {
    gross: number; // percentage
    net: number; // percentage
  };
  metrics: {
    averageOrderValue: number;
    customerAcquisitionCost: number;
    customerLifetimeValue: number;
    driverUtilization: number;
    restaurantRetention: number;
  };
}

// Pricing Configuration
export const PRICING_CONFIG: RevenueModel = {
  reservationCommission: {
    type: 'per_cover',
    value: 2.50, // $2.50 per diner
    minimumFee: 5.00
  },
  deliveryCommission: {
    percentage: 20, // 20% from restaurant
    deliveryFee: 3.99, // charged to customer
    serviceFee: 2, // 2% of order value
    smallOrderFee: 2.99,
    smallOrderThreshold: 15
  },
  noShowFee: 20,
  paymentProcessingFee: {
    percentage: 2.9,
    fixedFee: 0.30
  }
};

export const DRIVER_PAY_CONFIG = {
  basePay: 3.00,
  distancePayPerMile: 0.60,
  timePayPerMinute: 0.15,
  peakMultipliers: {
    lunch: 1.2, // 11am-2pm
    dinner: 1.5, // 5pm-9pm
    lateNight: 1.8, // 9pm-12am
    weather: 1.3, // rain/snow
    holiday: 2.0 // major holidays
  }
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 99,
    features: [
      'Up to 100 covers per month',
      'Basic analytics',
      'Email support',
      'Online reservations'
    ],
    limits: {
      maxCovers: 100,
      maxLocations: 1,
      analyticsLevel: 'basic'
    }
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 299,
    features: [
      'Unlimited covers',
      'Advanced analytics',
      'Priority support',
      'Marketing tools',
      'Custom branding'
    ],
    limits: {
      maxLocations: 3,
      analyticsLevel: 'advanced'
    },
    commissionDiscount: 1 // 1% reduction in commission
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 599,
    features: [
      'Everything in Pro',
      'Multi-location management',
      'API access',
      'Dedicated account manager',
      'Custom integrations'
    ],
    limits: {
      analyticsLevel: 'premium'
    },
    commissionDiscount: 2 // 2% reduction in commission
  }
];