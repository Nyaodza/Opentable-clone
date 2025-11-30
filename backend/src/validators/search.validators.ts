import * as yup from 'yup';
import { CuisineType, PriceRange } from '../models/Restaurant';

export const searchSchema = yup.object().shape({
  q: yup.string().optional(),
  query: yup.string().optional(),
  cuisineTypes: yup.mixed().optional()
    .test('cuisine-types', 'Invalid cuisine types', function(value) {
      if (!value) return true;
      const types = Array.isArray(value) ? value : [value];
      return types.every(type => Object.values(CuisineType).includes(type));
    }),
  priceRanges: yup.mixed().optional()
    .test('price-ranges', 'Invalid price ranges', function(value) {
      if (!value) return true;
      const ranges = Array.isArray(value) ? value : [value];
      return ranges.every(range => Object.values(PriceRange).includes(range));
    }),
  latitude: yup.number()
    .optional()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: yup.number()
    .optional()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  radius: yup.number()
    .optional()
    .min(1, 'Radius must be at least 1 mile')
    .max(100, 'Radius must not exceed 100 miles'),
  city: yup.string().optional(),
  state: yup.string().optional(),
  rating: yup.number()
    .optional()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  amenities: yup.mixed().optional(),
  date: yup.date().optional(),
  time: yup.string()
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  partySize: yup.number()
    .optional()
    .min(1, 'Party size must be at least 1')
    .max(50, 'Party size must not exceed 50'),
  availability: yup.string()
    .optional()
    .oneOf(['any', 'available', 'waitlist'], 'Invalid availability option'),
  features: yup.mixed().optional(),
  dietaryRestrictions: yup.mixed().optional(),
  sortBy: yup.string()
    .optional()
    .oneOf(['relevance', 'rating', 'distance', 'price', 'popularity'], 'Invalid sort option'),
  page: yup.number()
    .optional()
    .min(1, 'Page must be at least 1'),
  limit: yup.number()
    .optional()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
}).test('location-required', 'Both latitude and longitude are required for location search', function(value) {
  const { latitude, longitude } = value;
  if (latitude === undefined && longitude === undefined) return true;
  return latitude !== undefined && longitude !== undefined;
});

export const searchSuggestionsSchema = yup.object().shape({
  q: yup.string()
    .required('Query is required')
    .min(2, 'Query must be at least 2 characters'),
  limit: yup.number()
    .optional()
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit must not exceed 20')
});

export const popularSearchesSchema = yup.object().shape({
  city: yup.string().optional(),
  state: yup.string().optional()
});