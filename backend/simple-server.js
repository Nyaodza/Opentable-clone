const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'OpenTable Clone Backend is running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Basic API routes
app.get('/api/restaurants', (req, res) => {
  res.json({
    restaurants: [
      {
        id: 1,
        name: "The Great Italian",
        cuisine: "Italian",
        location: "Downtown",
        rating: 4.5,
        priceRange: "$$$",
        image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400"
      },
      {
        id: 2,
        name: "Sushi Master",
        cuisine: "Japanese",
        location: "Midtown",
        rating: 4.8,
        priceRange: "$$$$",
        image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400"
      },
      {
        id: 3,
        name: "Burger Haven",
        cuisine: "American",
        location: "Uptown",
        rating: 4.2,
        priceRange: "$$",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400"
      }
    ]
  });
});

app.get('/api/restaurants/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const restaurant = {
    id: id,
    name: "Sample Restaurant",
    cuisine: "International",
    location: "Downtown",
    rating: 4.5,
    priceRange: "$$$",
    description: "A wonderful dining experience awaits you.",
    phone: "(555) 123-4567",
    address: "123 Main St, City, State 12345",
    hours: "11:00 AM - 10:00 PM",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400"
  };
  res.json(restaurant);
});

app.post('/api/reservations', (req, res) => {
  const { restaurantId, date, time, partySize, customerInfo } = req.body;

  res.json({
    success: true,
    reservation: {
      id: Math.floor(Math.random() * 10000),
      restaurantId,
      date,
      time,
      partySize,
      customerInfo,
      status: 'confirmed',
      confirmationNumber: 'OT' + Math.floor(Math.random() * 100000)
    }
  });
});

app.get('/api/reservations', (req, res) => {
  res.json({
    reservations: [
      {
        id: 1,
        restaurantName: "The Great Italian",
        date: "2024-01-15",
        time: "7:00 PM",
        partySize: 4,
        status: "confirmed"
      }
    ]
  });
});

// Search endpoint
app.get('/api/search', (req, res) => {
  const { q, cuisine, location, price } = req.query;

  res.json({
    query: { q, cuisine, location, price },
    results: [
      {
        id: 1,
        name: "Search Result Restaurant",
        cuisine: cuisine || "Various",
        location: location || "City Center",
        rating: 4.3,
        priceRange: price || "$$$"
      }
    ],
    totalResults: 1
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /health',
      'GET /api/restaurants',
      'GET /api/restaurants/:id',
      'POST /api/reservations',
      'GET /api/reservations',
      'GET /api/search'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OpenTable Clone Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🏪 Restaurants API: http://localhost:${PORT}/api/restaurants`);
  console.log(`📝 Reservations API: http://localhost:${PORT}/api/reservations`);
  console.log(`🔍 Search API: http://localhost:${PORT}/api/search`);
});

module.exports = app;