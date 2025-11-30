import * as yup from 'yup';

export const createReviewSchema = yup.object().shape({
  reservationId: yup.string()
    .uuid('Invalid reservation ID')
    .required('Reservation ID is required'),
  
  rating: yup.number()
    .required('Overall rating is required')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  
  foodRating: yup.number()
    .required('Food rating is required')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  
  serviceRating: yup.number()
    .required('Service rating is required')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  
  ambianceRating: yup.number()
    .required('Ambiance rating is required')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  
  valueRating: yup.number()
    .required('Value rating is required')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  
  title: yup.string()
    .required('Review title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must not exceed 100 characters'),
  
  content: yup.string()
    .required('Review content is required')
    .min(50, 'Review must be at least 50 characters')
    .max(2000, 'Review must not exceed 2000 characters'),
  
  wouldRecommend: yup.boolean()
    .required('Please indicate if you would recommend this restaurant'),
  
  photos: yup.array()
    .of(yup.string().url('Invalid photo URL'))
    .max(10, 'Maximum 10 photos allowed')
    .optional()
});

export const updateReviewSchema = yup.object().shape({
  rating: yup.number()
    .optional()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  
  foodRating: yup.number()
    .optional()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  
  serviceRating: yup.number()
    .optional()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  
  ambianceRating: yup.number()
    .optional()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  
  valueRating: yup.number()
    .optional()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  
  title: yup.string()
    .optional()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must not exceed 100 characters'),
  
  content: yup.string()
    .optional()
    .min(50, 'Review must be at least 50 characters')
    .max(2000, 'Review must not exceed 2000 characters'),
  
  wouldRecommend: yup.boolean()
    .optional(),
  
  photos: yup.array()
    .of(yup.string().url('Invalid photo URL'))
    .max(10, 'Maximum 10 photos allowed')
    .optional()
});

export const voteReviewSchema = yup.object().shape({
  isHelpful: yup.boolean()
    .required('Vote is required')
});

export const reportReviewSchema = yup.object().shape({
  reason: yup.string()
    .required('Report reason is required')
    .oneOf([
      'inappropriate',
      'offensive',
      'spam',
      'fake',
      'irrelevant',
      'other'
    ], 'Invalid report reason'),
  
  details: yup.string()
    .optional()
    .max(500, 'Details must not exceed 500 characters')
    .when('reason', {
      is: 'other',
      then: (schema) => schema.required('Details are required when reason is "other"')
    })
});

export const searchReviewsSchema = yup.object().shape({
  restaurantId: yup.string().uuid('Invalid restaurant ID').optional(),
  userId: yup.string().uuid('Invalid user ID').optional(),
  minRating: yup.number().min(1).max(5).optional(),
  maxRating: yup.number().min(1).max(5).optional(),
  verified: yup.boolean().optional(),
  hasPhotos: yup.boolean().optional(),
  startDate: yup.date().optional(),
  endDate: yup.date()
    .optional()
    .min(yup.ref('startDate'), 'End date must be after start date'),
  page: yup.number().min(1).optional(),
  limit: yup.number().min(1).max(100).optional(),
  sort: yup.string()
    .optional()
    .oneOf(['newest', 'oldest', 'highest', 'lowest'], 'Invalid sort option')
});