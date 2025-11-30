export interface DeliveryOrder {
  id: string;
  customerId: string;
  restaurantId: string;
  driverId?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tip: number;
  tax: number;
  total: number;
  deliveryAddress: DeliveryAddress;
  restaurantAddress: DeliveryAddress;
  estimatedPrepTime: number; // minutes
  estimatedDeliveryTime: number; // minutes
  actualDeliveryTime?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
  scheduledFor?: string; // for scheduled orders
  promoCode?: string;
  discount?: number;
}

export interface OrderItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  customizations?: OrderCustomization[];
  image?: string;
}

export interface OrderCustomization {
  name: string;
  value: string;
  price?: number;
}

export interface DeliveryAddress {
  id?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  instructions?: string;
  type?: 'home' | 'work' | 'other';
  label?: string;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photo?: string;
  vehicleType: VehicleType;
  vehicleInfo: VehicleInfo;
  rating: number;
  totalRatings: number;
  totalDeliveries: number;
  isActive: boolean;
  isOnline: boolean;
  currentLocation?: Location;
  earnings: DriverEarnings;
  joinedAt: string;
  lastActiveAt: string;
  backgroundCheckStatus: 'pending' | 'approved' | 'rejected';
  documents: DriverDocument[];
}

export interface VehicleInfo {
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  licensePlate?: string;
}

export interface DriverDocument {
  type: 'license' | 'insurance' | 'registration' | 'background_check';
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  expiresAt?: string;
}

export interface DriverEarnings {
  today: number;
  week: number;
  month: number;
  total: number;
  pendingPayout: number;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

export interface DeliveryTracking {
  orderId: string;
  status: OrderStatus;
  events: TrackingEvent[];
  estimatedArrival?: string;
  driverLocation?: Location;
  route?: RoutePoint[];
}

export interface TrackingEvent {
  id: string;
  type: TrackingEventType;
  timestamp: string;
  message: string;
  location?: Location;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  order: number;
}

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string; // restaurant or driver ID
  revieweeType: 'restaurant' | 'driver';
  rating: number;
  title?: string;
  comment?: string;
  photos?: string[];
  aspects: ReviewAspect[];
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  response?: ReviewResponse;
}

export interface ReviewAspect {
  name: string;
  rating: number;
}

export interface ReviewResponse {
  text: string;
  respondedAt: string;
  responderName: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  restaurantId: string;
  coordinates: Location[];
  deliveryFee: number;
  minimumOrder?: number;
  maxDeliveryTime: number;
  isActive: boolean;
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_delivery';
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  applicableRestaurants?: string[];
}

// Enums
export type OrderStatus = 
  | 'pending'           // Order placed, waiting for restaurant confirmation
  | 'confirmed'         // Restaurant confirmed, preparing food
  | 'preparing'         // Food is being prepared
  | 'ready_for_pickup'  // Food ready, waiting for driver
  | 'driver_assigned'   // Driver assigned and heading to restaurant
  | 'picked_up'         // Driver picked up order
  | 'in_transit'        // Driver delivering to customer
  | 'delivered'         // Order delivered successfully
  | 'cancelled'         // Order cancelled
  | 'refunded';         // Order refunded

export type VehicleType = 'bicycle' | 'scooter' | 'motorcycle' | 'car' | 'walking';

export type PaymentMethod = 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'cash' | 'store_credit';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export type TrackingEventType = 
  | 'order_placed'
  | 'order_confirmed'
  | 'preparation_started'
  | 'ready_for_pickup'
  | 'driver_assigned'
  | 'driver_at_restaurant'
  | 'order_picked_up'
  | 'in_transit'
  | 'driver_nearby'
  | 'delivered'
  | 'cancelled';

// API Response Types
export interface DeliveryOrdersResponse {
  orders: DeliveryOrder[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DriverSearchResponse {
  drivers: Driver[];
  total: number;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  averageRating: number;
  ratingBreakdown: Record<number, number>;
}