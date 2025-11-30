export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'customer' | 'restaurant_owner' | 'admin';
  isActive: boolean;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  loyaltyPoints: number;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisineType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  latitude: number;
  longitude: number;
  averageRating: number;
  totalReviews: number;
  priceRange: string;
  images: string[];
  features: string[];
  isActive: boolean;
  distance?: number;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  userId: string;
  dateTime: string;
  partySize: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  confirmationCode: string;
  specialRequests?: string;
  dietaryRestrictions?: string;
  occasionType?: string;
  tableId?: string;
  restaurant: Restaurant;
  table?: Table;
  createdAt: string;
}

export interface Table {
  id: string;
  restaurantId: string;
  number: string;
  capacity: number;
  minCapacity: number;
  type: string;
  location: string;
  isActive: boolean;
}

export interface Review {
  id: string;
  userId: string;
  restaurantId: string;
  overallRating: number;
  foodRating: number;
  serviceRating: number;
  ambianceRating: number;
  valueRating: number;
  comment: string;
  visitDate: string;
  photos: string[];
  isVerified: boolean;
  helpfulCount: number;
  user: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  restaurantId: string;
  userId: string;
  requestedDate: string;
  preferredTimeStart: string;
  preferredTimeEnd: string;
  partySize: number;
  status: 'waiting' | 'notified' | 'expired' | 'cancelled';
  position: number;
  estimatedWaitMinutes?: number;
  expiresAt: string;
  restaurant: Restaurant;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  type: string;
  points: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  minimumTier: string;
  category: string;
  value: number;
  isActive: boolean;
}

export interface UserReward {
  id: string;
  userId: string;
  rewardId: string;
  redemptionCode: string;
  isUsed: boolean;
  expiresAt: string;
  reward: LoyaltyReward;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface SearchFilters {
  cuisineType?: string;
  priceRange?: string;
  rating?: number;
  distance?: number;
  features?: string[];
  openNow?: boolean;
}

export type RootStackParamList = {
  // Auth Stack
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  
  // Main Stack
  MainTabs: undefined;
  RestaurantDetails: { restaurantId: string };
  BookReservation: { restaurantId: string };
  ReservationConfirmation: { reservationId: string };
  EditReservation: { reservationId: string };
  WriteReview: { restaurantId: string; reservationId?: string };
  Profile: undefined;
  EditProfile: undefined;
  PaymentMethods: undefined;
  AddPaymentMethod: undefined;
  Notifications: undefined;
  LoyaltyProgram: undefined;
  RewardsStore: undefined;
  Settings: undefined;
  Support: undefined;
  WaitlistStatus: { waitlistId: string };
};

export type MainTabParamList = {
  Discover: undefined;
  Search: undefined;
  Reservations: undefined;
  Profile: undefined;
};