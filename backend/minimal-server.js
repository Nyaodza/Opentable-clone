const http = require('http');
const url = require('url');
const querystring = require('querystring');

const PORT = 3001;

// Sample data with 20 restaurants
const restaurants = [
  {
    id: 1,
    name: "The Great Italian",
    cuisine: "Italian",
    location: "Downtown",
    rating: 4.5,
    priceRange: "$$$",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400",
    description: "Authentic Italian cuisine in the heart of downtown",
    phone: "(555) 123-4567",
    address: "123 Main St, Downtown",
    hours: "11:00 AM - 10:00 PM",
    features: ["Outdoor Seating", "Wine Bar", "Private Dining"],
    tables: [
      { id: 1, seats: 2, available: true },
      { id: 2, seats: 4, available: true },
      { id: 3, seats: 6, available: false }
    ]
  },
  {
    id: 2,
    name: "Sushi Master",
    cuisine: "Japanese",
    location: "Midtown",
    rating: 4.8,
    priceRange: "$$$$",
    image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400",
    description: "Fresh sushi and traditional Japanese dishes",
    phone: "(555) 234-5678",
    address: "456 Oak Ave, Midtown",
    hours: "5:00 PM - 11:00 PM",
    features: ["Sushi Bar", "Sake Selection", "Chef's Table"],
    tables: [
      { id: 1, seats: 2, available: true },
      { id: 2, seats: 4, available: true }
    ]
  },
  {
    id: 3,
    name: "Burger Haven",
    cuisine: "American",
    location: "Uptown",
    rating: 4.2,
    priceRange: "$$",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
    description: "Gourmet burgers and craft beer",
    phone: "(555) 345-6789",
    address: "789 Pine St, Uptown",
    hours: "12:00 PM - 9:00 PM",
    features: ["Craft Beer", "Outdoor Patio", "Sports TV"],
    tables: [
      { id: 1, seats: 2, available: true },
      { id: 2, seats: 4, available: true },
      { id: 3, seats: 8, available: true }
    ]
  },
  {
    id: 4,
    name: "Le Petit Bistro",
    cuisine: "French",
    location: "Downtown",
    rating: 4.6,
    priceRange: "$$$",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
    description: "Classic French bistro with authentic Parisian charm",
    phone: "(555) 456-7890",
    address: "234 Elm St, Downtown",
    hours: "5:30 PM - 10:30 PM",
    features: ["Wine Cellar", "Romantic Ambiance", "Prix Fixe Menu"],
    tables: [
      { id: 1, seats: 2, available: true },
      { id: 2, seats: 4, available: false }
    ]
  },
  {
    id: 5,
    name: "Spice Route",
    cuisine: "Indian",
    location: "Midtown",
    rating: 4.4,
    priceRange: "$$",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",
    description: "Authentic Indian flavors with modern presentation",
    phone: "(555) 567-8901",
    address: "345 Maple Ave, Midtown",
    hours: "11:30 AM - 9:30 PM",
    features: ["Vegetarian Options", "Spice Level Customization", "Tandoor Oven"],
    tables: [
      { id: 1, seats: 4, available: true },
      { id: 2, seats: 6, available: true }
    ]
  },
  {
    id: 6,
    name: "Ocean's Bounty",
    cuisine: "Seafood",
    location: "Waterfront",
    rating: 4.7,
    priceRange: "$$$$",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
    description: "Fresh seafood with stunning harbor views",
    phone: "(555) 678-9012",
    address: "456 Harbor Dr, Waterfront",
    hours: "4:00 PM - 11:00 PM",
    features: ["Harbor View", "Raw Bar", "Chef's Special"],
    tables: [
      { id: 1, seats: 2, available: true },
      { id: 2, seats: 4, available: true },
      { id: 3, seats: 8, available: false }
    ]
  },
  {
    id: 7,
    name: "Taco Libre",
    cuisine: "Mexican",
    location: "Arts District",
    rating: 4.3,
    priceRange: "$$",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
    description: "Vibrant Mexican street food and craft cocktails",
    phone: "(555) 789-0123",
    address: "567 Arts Way, Arts District",
    hours: "11:00 AM - 12:00 AM",
    features: ["Tequila Bar", "Live Music", "Happy Hour"],
    tables: [
      { id: 1, seats: 4, available: true },
      { id: 2, seats: 6, available: true },
      { id: 3, seats: 10, available: true }
    ]
  },
  {
    id: 8,
    name: "Garden Bistro",
    cuisine: "Mediterranean",
    location: "Garden District",
    rating: 4.5,
    priceRange: "$$$",
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400",
    description: "Fresh Mediterranean cuisine in a garden setting",
    phone: "(555) 890-1234",
    address: "678 Garden St, Garden District",
    hours: "10:00 AM - 10:00 PM",
    features: ["Garden Seating", "Healthy Options", "Brunch"],
    tables: [
      { id: 1, seats: 2, available: true },
      { id: 2, seats: 4, available: true }
    ]
  },
  {
    id: 9,
    name: "Noodle House",
    cuisine: "Asian",
    location: "Chinatown",
    rating: 4.1,
    priceRange: "$",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400",
    description: "Authentic Asian noodles and dumplings",
    phone: "(555) 901-2345",
    address: "789 Dragon St, Chinatown",
    hours: "11:00 AM - 9:00 PM",
    features: ["Hand-pulled Noodles", "Dumpling Bar", "Quick Service"],
    tables: [
      { id: 1, seats: 2, available: true },
      { id: 2, seats: 4, available: true },
      { id: 3, seats: 6, available: true }
    ]
  },
  {
    id: 10,
    name: "Steakhouse Prime",
    cuisine: "Steakhouse",
    location: "Financial District",
    rating: 4.9,
    priceRange: "$$$$",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400",
    description: "Premium steaks and fine dining experience",
    phone: "(555) 012-3456",
    address: "890 Wall St, Financial District",
    hours: "5:00 PM - 11:00 PM",
    features: ["Dry-aged Steaks", "Wine Sommelier", "Private Rooms"],
    tables: [
      { id: 1, seats: 2, available: false },
      { id: 2, seats: 4, available: true },
      { id: 3, seats: 8, available: true }
    ]
  },
  {
    id: 11,
    name: "Pizza Corner",
    cuisine: "Italian",
    location: "Little Italy",
    rating: 4.0,
    priceRange: "$",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
    description: "New York style pizza by the slice",
    phone: "(555) 123-4567",
    address: "123 Mott St, Little Italy",
    hours: "11:00 AM - 11:00 PM",
    features: ["Wood-fired Oven", "By the Slice", "Late Night"],
    tables: [
      { id: 1, seats: 4, available: true },
      { id: 2, seats: 6, available: true }
    ]
  },
  {
    id: 12,
    name: "Café Boulangerie",
    cuisine: "French",
    location: "SoHo",
    rating: 4.4,
    priceRange: "$$",
    image: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400",
    description: "Parisian-style café with fresh pastries",
    phone: "(555) 234-5678",
    address: "234 Spring St, SoHo",
    hours: "7:00 AM - 6:00 PM",
    features: ["Fresh Pastries", "Coffee Bar", "WiFi"],
    tables: [
      { id: 1, seats: 2, available: true },
      { id: 2, seats: 4, available: true }
    ]
  },
  {
    id: 13,
    name: "BBQ Joint",
    cuisine: "American",
    location: "Brooklyn",
    rating: 4.6,
    priceRange: "$$",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
    description: "Slow-smoked BBQ with authentic Southern flavors",
    phone: "(555) 345-6789",
    address: "345 Smith St, Brooklyn",
    hours: "12:00 PM - 10:00 PM",
    features: ["Smoked Meats", "Craft Beer", "Live Blues"],
    tables: [
      { id: 1, seats: 4, available: true },
      { id: 2, seats: 6, available: true },
      { id: 3, seats: 8, available: false }
    ]
  },
  {
    id: 14,
    name: "Thai Garden",
    cuisine: "Thai",
    location: "Queens",
    rating: 4.2,
    priceRange: "$$",
    image: "https://images.unsplash.com/photo-1559847844-d721426d6edc?w=400",
    description: "Authentic Thai cuisine with traditional recipes",
    phone: "(555) 456-7890",
    address: "456 Roosevelt Ave, Queens",
    hours: "11:30 AM - 9:30 PM",
    features: ["Authentic Thai", "Spicy Options", "Vegetarian Friendly"],
    tables: [
      { id: 1, seats: 2, available: true },
      { id: 2, seats: 4, available: true }
    ]
  },
  {
    id: 15,
    name: "Rooftop Bar & Grill",
    cuisine: "American",
    location: "Midtown East",
    rating: 4.3,
    priceRange: "$$$",
    image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400",
    description: "Skyline views with contemporary American cuisine",
    phone: "(555) 567-8901",
    address: "567 Lexington Ave, Midtown East",
    hours: "4:00 PM - 1:00 AM",
    features: ["Rooftop Dining", "City Views", "Craft Cocktails"],
    tables: [
      { id: 1, seats: 2, available: true },
      { id: 2, seats: 4, available: false },
      { id: 3, seats: 6, available: true }
    ]
  },
  {
    id: 16,
    name: "Sushi Zen",
    cuisine: "Japanese",
    location: "West Village",
    rating: 4.8,
    priceRange: "$$$$",
    image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400",
    description: "Omakase experience with master sushi chef",
    phone: "(555) 678-9012",
    address: "678 Bleecker St, West Village",
    hours: "6:00 PM - 11:00 PM",
    features: ["Omakase", "Master Chef", "Counter Seating"],
    tables: [
      { id: 1, seats: 2, available: true },
      { id: 2, seats: 4, available: true }
    ]
  },
  {
    id: 17,
    name: "Farm to Table",
    cuisine: "American",
    location: "Park Slope",
    rating: 4.7,
    priceRange: "$$$",
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400",
    description: "Locally sourced ingredients and seasonal menu",
    phone: "(555) 789-0123",
    address: "789 5th Ave, Park Slope",
    hours: "5:30 PM - 10:00 PM",
    features: ["Local Ingredients", "Seasonal Menu", "Sustainable"],
    tables: [
      { id: 1, seats: 2, available: true },
      { id: 2, seats: 4, available: true },
      { id: 3, seats: 6, available: false }
    ]
  },
  {
    id: 18,
    name: "Dim Sum Palace",
    cuisine: "Chinese",
    location: "Chinatown",
    rating: 4.1,
    priceRange: "$$",
    image: "https://images.unsplash.com/photo-1496412705862-e0088f16f791?w=400",
    description: "Traditional dim sum served all day",
    phone: "(555) 890-1234",
    address: "890 Mott St, Chinatown",
    hours: "9:00 AM - 9:00 PM",
    features: ["Dim Sum Cart", "Tea Service", "Large Groups"],
    tables: [
      { id: 1, seats: 4, available: true },
      { id: 2, seats: 6, available: true },
      { id: 3, seats: 8, available: true },
      { id: 4, seats: 10, available: false }
    ]
  },
  {
    id: 19,
    name: "Greek Taverna",
    cuisine: "Greek",
    location: "Astoria",
    rating: 4.5,
    priceRange: "$$",
    image: "https://images.unsplash.com/photo-1544124499-58912cbddaad?w=400",
    description: "Traditional Greek dishes and Mediterranean wines",
    phone: "(555) 901-2345",
    address: "901 Ditmars Blvd, Astoria",
    hours: "12:00 PM - 11:00 PM",
    features: ["Live Greek Music", "Outdoor Seating", "Wine List"],
    tables: [
      { id: 1, seats: 4, available: true },
      { id: 2, seats: 6, available: true }
    ]
  },
  {
    id: 20,
    name: "The Wine Cellar",
    cuisine: "European",
    location: "Upper East Side",
    rating: 4.9,
    priceRange: "$$$$",
    image: "https://images.unsplash.com/photo-1558346648-9757f2fa4474?w=400",
    description: "Fine dining with an extensive wine collection",
    phone: "(555) 012-3456",
    address: "1012 Madison Ave, Upper East Side",
    hours: "6:00 PM - 12:00 AM",
    features: ["Wine Cellar", "Sommelier Service", "Tasting Menu"],
    tables: [
      { id: 1, seats: 2, available: false },
      { id: 2, seats: 4, available: true },
      { id: 3, seats: 6, available: true }
    ]
  }
];

// Menu data for restaurants
const menus = {
  1: [ // The Great Italian
    {id: 1, name: "Spaghetti Carbonara", description: "Classic Roman pasta with eggs, cheese, and pancetta", price: 18, category: "Pasta"},
    {id: 2, name: "Margherita Pizza", description: "Fresh mozzarella, tomato sauce, and basil", price: 16, category: "Pizza"},
    {id: 3, name: "Osso Buco", description: "Braised veal shanks with risotto Milanese", price: 32, category: "Main Course"},
    {id: 4, name: "Caesar Salad", description: "Romaine lettuce, parmesan, croutons, anchovy dressing", price: 12, category: "Salad"},
    {id: 5, name: "Tiramisu", description: "Coffee-soaked ladyfingers with mascarpone", price: 9, category: "Dessert"}
  ],
  2: [ // Sushi Master
    {id: 1, name: "Omakase Tasting", description: "Chef's selection of 12 pieces of premium sushi", price: 85, category: "Tasting Menu"},
    {id: 2, name: "Salmon Sashimi", description: "Fresh Atlantic salmon, 6 pieces", price: 18, category: "Sashimi"},
    {id: 3, name: "Dragon Roll", description: "Eel, cucumber, avocado with eel sauce", price: 22, category: "Specialty Rolls"},
    {id: 4, name: "Miso Soup", description: "Traditional soybean paste soup", price: 6, category: "Soup"},
    {id: 5, name: "Tempura Platter", description: "Assorted vegetable and shrimp tempura", price: 24, category: "Appetizer"}
  ],
  3: [ // Burger Haven
    {id: 1, name: "Classic Burger", description: "Beef patty, lettuce, tomato, onion, pickle", price: 14, category: "Burgers"},
    {id: 2, name: "BBQ Bacon Burger", description: "Beef patty, bacon, BBQ sauce, cheddar cheese", price: 17, category: "Burgers"},
    {id: 3, name: "Sweet Potato Fries", description: "Crispy sweet potato fries with chipotle mayo", price: 8, category: "Sides"},
    {id: 4, name: "Craft Beer Flight", description: "4 local craft beers, 4oz each", price: 16, category: "Beverages"},
    {id: 5, name: "Chocolate Brownie", description: "Warm brownie with vanilla ice cream", price: 7, category: "Dessert"}
  ],
  4: [ // Le Petit Bistro
    {id: 1, name: "Coq au Vin", description: "Braised chicken in red wine with pearl onions", price: 28, category: "Main Course"},
    {id: 2, name: "French Onion Soup", description: "Caramelized onions, gruyere cheese, croutons", price: 12, category: "Soup"},
    {id: 3, name: "Escargots", description: "Burgundy snails with garlic herb butter", price: 16, category: "Appetizer"},
    {id: 4, name: "Crème Brûlée", description: "Vanilla custard with caramelized sugar", price: 10, category: "Dessert"}
  ],
  5: [ // Spice Route
    {id: 1, name: "Butter Chicken", description: "Tender chicken in creamy tomato curry", price: 19, category: "Curry"},
    {id: 2, name: "Lamb Biryani", description: "Fragrant basmati rice with spiced lamb", price: 24, category: "Rice"},
    {id: 3, name: "Samosas", description: "Crispy pastries filled with spiced vegetables", price: 8, category: "Appetizer"},
    {id: 4, name: "Naan Bread", description: "Traditional clay oven baked bread", price: 5, category: "Bread"},
    {id: 5, name: "Gulab Jamun", description: "Sweet milk dumplings in rose syrup", price: 7, category: "Dessert"}
  ]
};

let reservations = [];
let reviews = [];
let users = [];

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode, corsHeaders);
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendResponse(res, statusCode, { error: message });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  console.log(`${method} ${path}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Routes
  if (path === '/health' && method === 'GET') {
    sendResponse(res, 200, {
      status: 'OK',
      message: 'OpenTable Clone Backend is running',
      timestamp: new Date().toISOString(),
      port: PORT
    });
  }
  else if (path === '/api/restaurants' && method === 'GET') {
    const { cuisine, location, price } = parsedUrl.query;
    let filteredRestaurants = restaurants;

    if (cuisine) {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.cuisine.toLowerCase().includes(cuisine.toLowerCase())
      );
    }
    if (location) {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    if (price) {
      filteredRestaurants = filteredRestaurants.filter(r =>
        r.priceRange === price
      );
    }

    sendResponse(res, 200, { restaurants: filteredRestaurants });
  }
  else if (path.startsWith('/api/restaurants/') && method === 'GET') {
    const id = parseInt(path.split('/').pop());
    const restaurant = restaurants.find(r => r.id === id);

    if (restaurant) {
      sendResponse(res, 200, restaurant);
    } else {
      sendError(res, 404, 'Restaurant not found');
    }
  }
  else if (path === '/api/reservations' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const reservation = {
          id: Date.now(),
          ...data,
          status: 'confirmed',
          confirmationNumber: 'OT' + Math.floor(Math.random() * 100000),
          createdAt: new Date().toISOString()
        };
        reservations.push(reservation);
        sendResponse(res, 201, { success: true, reservation });
      } catch (err) {
        sendError(res, 400, 'Invalid JSON');
      }
    });
  }
  else if (path === '/api/reservations' && method === 'GET') {
    sendResponse(res, 200, { reservations });
  }
  else if (path === '/api/search' && method === 'GET') {
    const { q, cuisine, location, price } = parsedUrl.query;
    let results = restaurants;

    if (q) {
      results = results.filter(r =>
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(q.toLowerCase())
      );
    }
    if (cuisine) {
      results = results.filter(r =>
        r.cuisine.toLowerCase().includes(cuisine.toLowerCase())
      );
    }
    if (location) {
      results = results.filter(r =>
        r.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    if (price) {
      results = results.filter(r => r.priceRange === price);
    }

    sendResponse(res, 200, {
      query: { q, cuisine, location, price },
      results,
      totalResults: results.length
    });
  }
  // Menu endpoints
  else if (path.match(/^\/api\/restaurants\/(\d+)\/menu$/) && method === 'GET') {
    const id = parseInt(path.split('/')[3]);
    const menu = menus[id] || [];
    sendResponse(res, 200, { menu, restaurantId: id });
  }
  // Reviews endpoints
  else if (path.match(/^\/api\/restaurants\/(\d+)\/reviews$/) && method === 'GET') {
    const id = parseInt(path.split('/')[3]);
    const restaurantReviews = reviews.filter(r => r.restaurantId === id);
    sendResponse(res, 200, { reviews: restaurantReviews, restaurantId: id });
  }
  else if (path.match(/^\/api\/restaurants\/(\d+)\/reviews$/) && method === 'POST') {
    const id = parseInt(path.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const review = {
          id: Date.now(),
          restaurantId: id,
          ...data,
          createdAt: new Date().toISOString()
        };
        reviews.push(review);
        sendResponse(res, 201, { success: true, review });
      } catch (err) {
        sendError(res, 400, 'Invalid JSON');
      }
    });
  }
  // Table availability endpoints
  else if (path.match(/^\/api\/restaurants\/(\d+)\/tables$/) && method === 'GET') {
    const id = parseInt(path.split('/')[3]);
    const restaurant = restaurants.find(r => r.id === id);
    if (restaurant) {
      sendResponse(res, 200, { tables: restaurant.tables || [], restaurantId: id });
    } else {
      sendError(res, 404, 'Restaurant not found');
    }
  }
  // User management endpoints
  else if (path === '/api/users' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const user = {
          id: Date.now(),
          ...data,
          createdAt: new Date().toISOString()
        };
        users.push(user);
        sendResponse(res, 201, { success: true, user: { ...user, password: undefined } });
      } catch (err) {
        sendError(res, 400, 'Invalid JSON');
      }
    });
  }
  else if (path === '/api/users/login' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
          sendResponse(res, 200, {
            success: true,
            user: { ...user, password: undefined },
            token: 'fake-jwt-token-' + user.id
          });
        } else {
          sendError(res, 401, 'Invalid credentials');
        }
      } catch (err) {
        sendError(res, 400, 'Invalid JSON');
      }
    });
  }
  // Favorites endpoints
  else if (path.match(/^\/api\/users\/(\d+)\/favorites$/) && method === 'GET') {
    const userId = parseInt(path.split('/')[3]);
    const user = users.find(u => u.id === userId);
    if (user) {
      sendResponse(res, 200, { favorites: user.favorites || [] });
    } else {
      sendError(res, 404, 'User not found');
    }
  }
  else if (path.match(/^\/api\/users\/(\d+)\/favorites\/(\d+)$/) && method === 'POST') {
    const userId = parseInt(path.split('/')[3]);
    const restaurantId = parseInt(path.split('/')[5]);
    const user = users.find(u => u.id === userId);
    if (user) {
      if (!user.favorites) user.favorites = [];
      if (!user.favorites.includes(restaurantId)) {
        user.favorites.push(restaurantId);
      }
      sendResponse(res, 200, { success: true, favorites: user.favorites });
    } else {
      sendError(res, 404, 'User not found');
    }
  }
  else if (path.match(/^\/api\/users\/(\d+)\/favorites\/(\d+)$/) && method === 'DELETE') {
    const userId = parseInt(path.split('/')[3]);
    const restaurantId = parseInt(path.split('/')[5]);
    const user = users.find(u => u.id === userId);
    if (user) {
      if (user.favorites) {
        user.favorites = user.favorites.filter(id => id !== restaurantId);
      }
      sendResponse(res, 200, { success: true, favorites: user.favorites || [] });
    } else {
      sendError(res, 404, 'User not found');
    }
  }
  else {
    sendError(res, 404, `Route ${path} not found`);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 OpenTable Clone Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🏪 Restaurants: http://localhost:${PORT}/api/restaurants`);
  console.log(`📝 Reservations: http://localhost:${PORT}/api/reservations`);
  console.log(`🔍 Search: http://localhost:${PORT}/api/search`);
});

process.on('SIGTERM', () => {
  console.log('Server shutting down...');
  server.close(() => {
    console.log('Server closed');
  });
});

module.exports = server;