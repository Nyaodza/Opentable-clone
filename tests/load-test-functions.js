/**
 * Load Test Processor Functions
 * Custom functions for Artillery load testing
 * 
 * Usage: These functions are referenced in load-test.yml
 */

const crypto = require('crypto');

// Test user database (in-memory for load testing)
const testUsers = new Map();

// Pre-generated test users for consistent testing
const preGeneratedUsers = [
  { email: 'loadtest1@example.com', password: 'LoadTest123!' },
  { email: 'loadtest2@example.com', password: 'LoadTest123!' },
  { email: 'loadtest3@example.com', password: 'LoadTest123!' },
  { email: 'loadtest4@example.com', password: 'LoadTest123!' },
  { email: 'loadtest5@example.com', password: 'LoadTest123!' },
];

/**
 * Generate a random string
 */
function randomString(length = 10) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get a random element from an array
 */
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random future date (within next 30 days)
 */
function randomFutureDate() {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, 30));
  return date.toISOString().split('T')[0];
}

/**
 * Generate a random past date (within last 365 days)
 */
function randomPastDate() {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(1, 365));
  return date.toISOString().split('T')[0];
}

/**
 * Generate a random time slot
 */
function randomTimeSlot() {
  const hours = randomInt(11, 21); // 11 AM to 9 PM
  const minutes = randomElement(['00', '15', '30', '45']);
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Generate test user credentials
 * This function is called by Artillery before scenarios
 */
function generateTestUser(context, events, done) {
  // Use pre-generated users 80% of the time for consistency
  if (Math.random() < 0.8 && preGeneratedUsers.length > 0) {
    const user = randomElement(preGeneratedUsers);
    context.vars.testEmail = user.email;
    context.vars.testPassword = user.password;
  } else {
    // Generate unique user for registration flow testing
    const uniqueId = randomString(8);
    context.vars.testEmail = `loadtest-${uniqueId}@example.com`;
    context.vars.testPassword = 'LoadTest123!';
    context.vars.testName = `Load Test User ${uniqueId}`;
  }
  
  return done();
}

/**
 * Generate random search parameters
 */
function generateSearchParams(context, events, done) {
  const cuisines = ['Italian', 'French', 'American', 'Chinese', 'Japanese', 'Mexican', 'Indian', 'Thai'];
  const cities = ['New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Miami', 'Seattle', 'Boston', 'Austin'];
  const priceRanges = ['$', '$$', '$$$', '$$$$'];
  
  context.vars.searchCuisine = randomElement(cuisines);
  context.vars.searchCity = randomElement(cities);
  context.vars.searchPriceRange = randomElement(priceRanges);
  context.vars.searchDate = randomFutureDate();
  context.vars.searchTime = randomTimeSlot();
  context.vars.searchPartySize = randomInt(1, 10);
  
  return done();
}

/**
 * Generate reservation details
 */
function generateReservationDetails(context, events, done) {
  context.vars.reservationDate = randomFutureDate();
  context.vars.reservationTime = randomTimeSlot();
  context.vars.partySize = randomInt(1, 8);
  context.vars.specialRequests = randomElement([
    'Window seat please',
    'Birthday celebration',
    'Quiet table preferred',
    'High chair needed',
    'Anniversary dinner',
    'Business meeting',
    '',
  ]);
  context.vars.guestFirstName = randomElement(['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily']);
  context.vars.guestLastName = randomElement(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis']);
  context.vars.guestPhone = `+1${randomInt(200, 999)}${randomInt(1000000, 9999999)}`;
  
  return done();
}

/**
 * Generate review content
 */
function generateReviewContent(context, events, done) {
  const reviewTemplates = [
    'Great food and excellent service! Highly recommend.',
    'The atmosphere was wonderful and the food was delicious.',
    'A bit pricey but worth it for special occasions.',
    'Quick service and tasty dishes. Will come back!',
    'Nice ambiance, food could be better.',
    'Perfect for a romantic dinner. Loved everything!',
    'Good value for money. The pasta was amazing.',
    'Friendly staff and great cocktails.',
  ];
  
  context.vars.reviewRating = randomInt(3, 5);
  context.vars.reviewTitle = randomElement([
    'Great Experience!',
    'Would Recommend',
    'Nice Place',
    'Loved It!',
    'Perfect Night Out',
  ]);
  context.vars.reviewContent = randomElement(reviewTemplates);
  context.vars.foodRating = randomInt(3, 5);
  context.vars.serviceRating = randomInt(3, 5);
  context.vars.ambianceRating = randomInt(3, 5);
  context.vars.valueRating = randomInt(3, 5);
  
  return done();
}

/**
 * Log response for debugging
 */
function logResponse(requestParams, response, context, ee, next) {
  if (process.env.DEBUG_LOAD_TEST === 'true') {
    console.log(`[${new Date().toISOString()}] ${requestParams.method} ${requestParams.url}`);
    console.log(`  Status: ${response.statusCode}`);
    console.log(`  Body: ${JSON.stringify(response.body).slice(0, 200)}`);
  }
  return next();
}

/**
 * Check for error responses
 */
function checkForErrors(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    ee.emit('customStat', {
      stat: 'errorResponses',
      value: 1,
    });
    
    // Track specific error types
    if (response.statusCode === 401) {
      ee.emit('customStat', { stat: 'authErrors', value: 1 });
    } else if (response.statusCode === 429) {
      ee.emit('customStat', { stat: 'rateLimitErrors', value: 1 });
    } else if (response.statusCode >= 500) {
      ee.emit('customStat', { stat: 'serverErrors', value: 1 });
    }
  }
  return next();
}

/**
 * Track response time buckets
 */
function trackResponseTime(requestParams, response, context, ee, next) {
  const responseTime = response.timings.phases.total;
  
  if (responseTime < 100) {
    ee.emit('customStat', { stat: 'responseTime_under100ms', value: 1 });
  } else if (responseTime < 500) {
    ee.emit('customStat', { stat: 'responseTime_100to500ms', value: 1 });
  } else if (responseTime < 1000) {
    ee.emit('customStat', { stat: 'responseTime_500to1000ms', value: 1 });
  } else {
    ee.emit('customStat', { stat: 'responseTime_over1000ms', value: 1 });
  }
  
  return next();
}

/**
 * Store auth token from login response
 */
function storeAuthToken(requestParams, response, context, ee, next) {
  if (response.statusCode === 200 && response.body && response.body.token) {
    context.vars.authToken = response.body.token;
    testUsers.set(context.vars.testEmail, {
      token: response.body.token,
      userId: response.body.user?.id,
    });
  }
  return next();
}

/**
 * Capture restaurant ID from search results
 */
function captureRestaurantId(requestParams, response, context, ee, next) {
  if (response.statusCode === 200 && response.body?.restaurants?.length > 0) {
    // Pick a random restaurant from results
    const restaurants = response.body.restaurants;
    const selected = restaurants[randomInt(0, Math.min(restaurants.length - 1, 9))];
    context.vars.restaurantId = selected.id;
    context.vars.restaurantName = selected.name;
  }
  return next();
}

/**
 * Validate reservation was created
 */
function validateReservation(requestParams, response, context, ee, next) {
  if (response.statusCode === 201 && response.body?.reservation) {
    context.vars.reservationId = response.body.reservation.id;
    context.vars.confirmationCode = response.body.reservation.confirmationCode;
    
    ee.emit('customStat', { stat: 'successfulReservations', value: 1 });
  }
  return next();
}

/**
 * Before request hook - add common headers
 */
function addCommonHeaders(requestParams, context, ee, next) {
  requestParams.headers = requestParams.headers || {};
  requestParams.headers['X-Request-ID'] = `load-test-${randomString(16)}`;
  requestParams.headers['X-Client-Version'] = '1.0.0';
  
  // Add auth header if token exists
  if (context.vars.authToken) {
    requestParams.headers['Authorization'] = `Bearer ${context.vars.authToken}`;
  }
  
  return next();
}

/**
 * Setup function - called once before the test starts
 */
function setup(context, events, done) {
  console.log('Load test starting...');
  console.log(`Target: ${context.vars.target || 'default'}`);
  console.log(`Virtual users will be generated`);
  return done();
}

/**
 * Teardown function - called once after the test ends
 */
function teardown(context, events, done) {
  console.log('\nLoad test completed');
  console.log(`Total test users created: ${testUsers.size}`);
  return done();
}

// Custom Artillery functions (exposed via $)
module.exports = {
  // User and authentication
  generateTestUser,
  storeAuthToken,
  
  // Search and discovery
  generateSearchParams,
  captureRestaurantId,
  
  // Reservations
  generateReservationDetails,
  validateReservation,
  
  // Reviews
  generateReviewContent,
  
  // Utility functions (exposed as $ functions in YAML)
  $randomString: randomString,
  $randomInt: randomInt,
  $randomElement: randomElement,
  $randomDate: randomFutureDate,
  $randomFutureDate: randomFutureDate,
  $randomPastDate: randomPastDate,
  $randomTimeSlot: randomTimeSlot,
  
  // Hooks
  logResponse,
  checkForErrors,
  trackResponseTime,
  addCommonHeaders,
  
  // Lifecycle
  setup,
  teardown,
};

