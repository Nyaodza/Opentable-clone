import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';

const router = Router();

// Error handling middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Restaurant API endpoints
router.post('/restaurants/onboard', [
  body('name').notEmpty().withMessage('Restaurant name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('zipCode').notEmpty().withMessage('Zip code is required'),
  body('cuisine').notEmpty().withMessage('Cuisine type is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Mock successful restaurant registration
    const restaurantData = {
      id: `rest_${Date.now()}`,
      ...req.body,
      status: 'pending_review',
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'Restaurant registration submitted successfully',
      restaurant: restaurantData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to register restaurant',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Payment API endpoints
router.post('/payments/create-intent', [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { amount, currency, description, metadata } = req.body;

    // Mock Stripe payment intent creation
    const paymentIntent = {
      id: `pi_${Math.random().toString(36).substring(2, 15)}`,
      client_secret: `pi_${Math.random().toString(36).substring(2, 15)}_secret_${Math.random().toString(36).substring(2, 15)}`,
      amount,
      currency,
      status: 'requires_payment_method',
      description,
      metadata
    };

    res.json(paymentIntent);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create payment intent'
    });
  }
});

router.post('/payments/refund', [
  body('paymentIntentId').notEmpty().withMessage('Payment Intent ID is required'),
  body('amount').isNumeric().withMessage('Refund amount must be a number'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;

    // Mock refund processing
    const refund = {
      id: `re_${Math.random().toString(36).substring(2, 15)}`,
      payment_intent: paymentIntentId,
      amount,
      reason: reason || 'requested_by_customer',
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000)
    };

    res.json({ refund });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to process refund'
    });
  }
});

// Analytics API endpoints
router.post('/analytics/performance', async (req, res) => {
  try {
    const { event, data, timestamp, url, userAgent } = req.body;

    // Mock analytics data storage
    console.log('Performance Analytics:', {
      event,
      data,
      timestamp,
      url,
      userAgent: userAgent?.substring(0, 100) // Truncate for logging
    });

    res.status(200).json({ success: true, message: 'Analytics data received' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record analytics'
    });
  }
});

router.post('/errors', async (req, res) => {
  try {
    const { errors } = req.body;

    // Mock error logging
    if (Array.isArray(errors)) {
      errors.forEach(error => {
        console.error('Client Error:', {
          message: error.message,
          url: error.url,
          severity: error.severity,
          timestamp: new Date(error.timestamp).toISOString(),
          stack: error.stack?.substring(0, 500) // Truncate stack trace
        });
      });
    }

    res.status(200).json({ success: true, message: 'Errors logged successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to log errors'
    });
  }
});

// Health check endpoints
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'operational',
      redis: 'operational',
      payment: 'operational',
      auth: 'operational'
    },
    version: process.env.npm_package_version || '1.0.0'
  });
});

router.get('/health/detailed', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: 'operational',
        latency: '< 50ms',
        connections: 'healthy'
      },
      redis: {
        status: 'operational',
        latency: '< 10ms',
        memory: 'normal'
      },
      payment: {
        status: 'operational',
        provider: 'stripe',
        webhooks: 'active'
      },
      auth: {
        status: 'operational',
        providers: ['credentials', 'google', 'facebook'],
        sessions: 'active'
      },
      disruptive_features: {
        blockchain: 'operational',
        virtual_experiences: 'operational',
        ai_concierge: 'operational',
        voice_iot: 'operational',
        social_dining: 'operational',
        sustainability: 'operational'
      }
    },
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime()
  });
});

// User management endpoints
router.post('/auth/register', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Mock user registration
    const user = {
      id: `user_${Date.now()}`,
      email,
      name,
      role: 'user',
      verified: false,
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Reservation management endpoints
router.get('/reservations', [
  query('userId').optional().isString(),
  query('restaurantId').optional().isString(),
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed']),
  handleValidationErrors
], async (req, res) => {
  try {
    // Mock reservations data
    const reservations = [
      {
        id: 'res_1',
        userId: req.query.userId || 'user_123',
        restaurantId: 'rest_456',
        date: '2025-11-15',
        time: '19:00',
        partySize: 4,
        status: 'confirmed',
        specialRequests: 'Birthday celebration'
      }
    ];

    res.json({
      success: true,
      reservations,
      total: reservations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reservations'
    });
  }
});

router.post('/reservations', [
  body('restaurantId').notEmpty().withMessage('Restaurant ID is required'),
  body('date').isDate().withMessage('Valid date is required'),
  body('time').notEmpty().withMessage('Time is required'),
  body('partySize').isInt({ min: 1 }).withMessage('Party size must be at least 1'),
  handleValidationErrors
], async (req, res) => {
  try {
    const reservation = {
      id: `res_${Date.now()}`,
      ...req.body,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      reservation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create reservation'
    });
  }
});

// Search endpoints
router.get('/search/restaurants', [
  query('q').optional().isString(),
  query('location').optional().isString(),
  query('cuisine').optional().isString(),
  query('date').optional().isDate(),
  query('time').optional().isString(),
  query('partySize').optional().isInt({ min: 1 }),
  handleValidationErrors
], async (req, res) => {
  try {
    // Mock restaurant search results
    const restaurants = [
      {
        id: 'rest_1',
        name: 'The Modern',
        cuisine: 'Contemporary American',
        location: 'New York, NY',
        rating: 4.7,
        priceRange: '$$$',
        availability: true,
        sustainabilityScore: 4.2,
        hasBlockchainRewards: true,
        hasVirtualExperience: true
      },
      {
        id: 'rest_2', 
        name: 'Blue Hill',
        cuisine: 'Farm-to-Table',
        location: 'New York, NY',
        rating: 4.8,
        priceRange: '$$$$',
        availability: true,
        sustainabilityScore: 4.9,
        hasBlockchainRewards: true,
        hasVirtualExperience: false
      }
    ];

    res.json({
      success: true,
      restaurants,
      total: restaurants.length,
      filters: req.query
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

export default router;
