import * as yup from 'yup';
import { emailSchema, phoneSchema, uuidSchema } from './common.validators';

// Create reservation validator
export const createReservationSchema = yup.object({
  restaurantId: uuidSchema.required('Restaurant ID is required'),
  
  dateTime: yup.date()
    .min(new Date(), 'Reservation date must be in the future')
    .required('Date and time are required'),
  
  partySize: yup.number()
    .min(1, 'Party size must be at least 1')
    .max(100, 'Party size must be less than 100')
    .required('Party size is required'),
  
  specialRequests: yup.string()
    .max(500, 'Special requests must be less than 500 characters')
    .optional(),
  
  dietaryRestrictions: yup.array()
    .of(yup.string())
    .optional(),
  
  occasionType: yup.string()
    .oneOf(['birthday', 'anniversary', 'business', 'date', 'other'])
    .optional(),
  
  guestInfo: yup.object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    email: emailSchema,
    phone: phoneSchema
  }).required('Guest information is required')
});

// Update reservation validator
export const updateReservationSchema = yup.object({
  dateTime: yup.date()
    .min(new Date(), 'Reservation date must be in the future')
    .optional(),
  
  partySize: yup.number()
    .min(1, 'Party size must be at least 1')
    .max(100, 'Party size must be less than 100')
    .optional(),
  
  specialRequests: yup.string()
    .max(500, 'Special requests must be less than 500 characters')
    .optional(),
  
  dietaryRestrictions: yup.array()
    .of(yup.string())
    .optional(),
  
  occasionType: yup.string()
    .oneOf(['birthday', 'anniversary', 'business', 'date', 'other'])
    .optional()
});

// Cancel reservation validator
export const cancelReservationSchema = yup.object({
  reason: yup.string()
    .max(500, 'Cancellation reason must be less than 500 characters')
    .optional()
});

// Search reservations validator
export const searchReservationsSchema = yup.object({
  restaurantId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  status: yup.string()
    .oneOf(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'])
    .optional(),
  startDate: yup.date().optional(),
  endDate: yup.date()
    .when('startDate', (startDate, schema) => {
      return startDate ? schema.min(startDate, 'End date must be after start date') : schema;
    })
    .optional(),
  confirmationCode: yup.string().optional()
});

// Guest reservation lookup validator
export const guestReservationLookupSchema = yup.object({
  confirmationCode: yup.string()
    .required('Confirmation code is required'),
  email: emailSchema
});

// Reservation status update validator
export const updateReservationStatusSchema = yup.object({
  status: yup.string()
    .oneOf(['confirmed', 'seated', 'completed', 'no-show'])
    .required('Status is required'),
  notes: yup.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
});