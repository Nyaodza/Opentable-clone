import * as yup from 'yup';
import { CuisineType, PriceRange } from '../models/Restaurant';
import { emailSchema, phoneSchema } from './common.validators';

// Create restaurant validator
export const createRestaurantSchema = yup.object({
  name: yup.string()
    .min(2, 'Restaurant name must be at least 2 characters')
    .max(100, 'Restaurant name must be less than 100 characters')
    .required('Restaurant name is required'),
  
  description: yup.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters')
    .required('Description is required'),
  
  cuisineType: yup.string()
    .oneOf(Object.values(CuisineType), 'Invalid cuisine type')
    .required('Cuisine type is required'),
  
  address: yup.string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters')
    .required('Address is required'),
  
  city: yup.string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters')
    .required('City is required'),
  
  state: yup.string()
    .min(2, 'State must be at least 2 characters')
    .max(50, 'State must be less than 50 characters')
    .required('State is required'),
  
  zipCode: yup.string()
    .matches(/^\d{5}(-\d{4})?$/, 'Invalid zip code format')
    .required('Zip code is required'),
  
  country: yup.string()
    .min(2, 'Country must be at least 2 characters')
    .max(100, 'Country must be less than 100 characters')
    .required('Country is required'),
  
  latitude: yup.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  
  longitude: yup.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
  
  phone: phoneSchema,
  email: emailSchema,
  website: yup.string().url('Invalid website URL').optional(),
  
  priceRange: yup.string()
    .oneOf(Object.values(PriceRange), 'Invalid price range')
    .required('Price range is required'),
  
  amenities: yup.array()
    .of(yup.string())
    .default([]),
  
  settings: yup.object({
    reservationDuration: yup.number()
      .min(30, 'Reservation duration must be at least 30 minutes')
      .max(300, 'Reservation duration must be less than 300 minutes')
      .default(120),
    
    advanceBookingDays: yup.number()
      .min(1, 'Advance booking must be at least 1 day')
      .max(365, 'Advance booking must be less than 365 days')
      .default(30),
    
    minPartySize: yup.number()
      .min(1, 'Minimum party size must be at least 1')
      .max(20, 'Minimum party size must be less than 20')
      .default(1),
    
    maxPartySize: yup.number()
      .min(1, 'Maximum party size must be at least 1')
      .max(100, 'Maximum party size must be less than 100')
      .default(10)
      .when('minPartySize', (minPartySize, schema) => {
        return schema.min(minPartySize as number, 'Max party size must be >= min party size');
      }),
    
    cancellationWindow: yup.number()
      .min(0, 'Cancellation window must be at least 0 hours')
      .max(168, 'Cancellation window must be less than 168 hours')
      .default(24)
  }).default({})
});

// Update restaurant validator
export const updateRestaurantSchema = createRestaurantSchema.partial();

// Restaurant search validator
export const searchRestaurantsSchema = yup.object({
  query: yup.string().optional(),
  cuisineType: yup.string().oneOf(Object.values(CuisineType)).optional(),
  priceRange: yup.array()
    .of(yup.string().oneOf(Object.values(PriceRange)))
    .optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  latitude: yup.number().optional(),
  longitude: yup.number().optional(),
  radius: yup.number()
    .min(1, 'Radius must be at least 1 mile')
    .max(100, 'Radius must be less than 100 miles')
    .default(10),
  rating: yup.number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5')
    .optional(),
  amenities: yup.array().of(yup.string()).optional(),
  isOpen: yup.boolean().optional(),
  date: yup.date().optional(),
  time: yup.string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
    .optional(),
  partySize: yup.number()
    .min(1, 'Party size must be at least 1')
    .max(100, 'Party size must be less than 100')
    .optional()
});

// Restaurant availability validator
export const checkAvailabilitySchema = yup.object({
  date: yup.date()
    .min(new Date(), 'Date must be in the future')
    .required('Date is required'),
  time: yup.string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
    .required('Time is required'),
  partySize: yup.number()
    .min(1, 'Party size must be at least 1')
    .max(100, 'Party size must be less than 100')
    .required('Party size is required')
});

// Restaurant hours validator
export const restaurantHoursSchema = yup.object({
  dayOfWeek: yup.string()
    .oneOf(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .required('Day of week is required'),
  openTime: yup.string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid open time format (HH:MM)')
    .required('Open time is required'),
  closeTime: yup.string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid close time format (HH:MM)')
    .required('Close time is required'),
  isClosed: yup.boolean().default(false),
  lastReservationTime: yup.string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid last reservation time format (HH:MM)')
    .optional()
});