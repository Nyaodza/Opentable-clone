// API Examples and Code Samples for Documentation

export const apiExamples = {
  // Authentication Examples
  auth: {
    register: {
      curl: `curl -X POST "http://localhost:3001/api/auth/register" \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "securePassword123",
    "phone": "+1234567890"
  }'`,
      javascript: `// Register a new user
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'securePassword123',
    phone: '+1234567890'
  })
});

const data = await response.json();
console.log(data);`,
      python: `import requests

# Register a new user
url = "http://localhost:3001/api/auth/register"
payload = {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "securePassword123",
    "phone": "+1234567890"
}

response = requests.post(url, json=payload)
print(response.json())`,
    },
    login: {
      curl: `curl -X POST "http://localhost:3001/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "john.doe@example.com",
    "password": "securePassword123"
  }'`,
      javascript: `// Login user
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'john.doe@example.com',
    password: 'securePassword123'
  })
});

const data = await response.json();
// Store the token for future requests
localStorage.setItem('token', data.data.token);`,
      python: `import requests

# Login user
url = "http://localhost:3001/api/auth/login"
payload = {
    "email": "john.doe@example.com",
    "password": "securePassword123"
}

response = requests.post(url, json=payload)
data = response.json()
token = data["data"]["token"]`,
    },
  },

  // Restaurant Examples
  restaurants: {
    getAll: {
      curl: `curl -X GET "http://localhost:3001/api/restaurants?page=1&limit=20&cuisine=Italian&location=New York" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
      javascript: `// Get restaurants with filters
const response = await fetch('/api/restaurants?page=1&limit=20&cuisine=Italian&location=New York', {
  headers: {
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  }
});

const data = await response.json();
console.log(data.data.restaurants);`,
      python: `import requests

# Get restaurants with filters
url = "http://localhost:3001/api/restaurants"
params = {
    "page": 1,
    "limit": 20,
    "cuisine": "Italian",
    "location": "New York"
}
headers = {
    "Authorization": f"Bearer {token}"
}

response = requests.get(url, params=params, headers=headers)
print(response.json())`,
    },
    search: {
      curl: `curl -X GET "http://localhost:3001/api/restaurants/search?q=pizza&location=manhattan&priceRange=$$" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
      javascript: `// Search restaurants
const searchParams = new URLSearchParams({
  q: 'pizza',
  location: 'manhattan',
  priceRange: '$$'
});

const response = await fetch(\`/api/restaurants/search?\${searchParams}\`, {
  headers: {
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  }
});

const results = await response.json();`,
      python: `# Search restaurants
url = "http://localhost:3001/api/restaurants/search"
params = {
    "q": "pizza",
    "location": "manhattan",
    "priceRange": "$$"
}
headers = {"Authorization": f"Bearer {token}"}

response = requests.get(url, params=params, headers=headers)`,
    },
    getById: {
      curl: `curl -X GET "http://localhost:3001/api/restaurants/123e4567-e89b-12d3-a456-426614174000" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
      javascript: `// Get restaurant details
const restaurantId = '123e4567-e89b-12d3-a456-426614174000';
const response = await fetch(\`/api/restaurants/\${restaurantId}\`, {
  headers: {
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  }
});

const restaurant = await response.json();`,
    },
    getAvailability: {
      curl: `curl -X GET "http://localhost:3001/api/restaurants/123e4567-e89b-12d3-a456-426614174000/availability?date=2024-01-15&time=19:00&partySize=4" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
      javascript: `// Check restaurant availability
const restaurantId = '123e4567-e89b-12d3-a456-426614174000';
const params = new URLSearchParams({
  date: '2024-01-15',
  time: '19:00',
  partySize: '4'
});

const response = await fetch(\`/api/restaurants/\${restaurantId}/availability?\${params}\`, {
  headers: {
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  }
});

const availability = await response.json();`,
    },
  },

  // Reservation Examples
  reservations: {
    create: {
      curl: `curl -X POST "http://localhost:3001/api/reservations" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
    "reservationDate": "2024-01-15",
    "reservationTime": "19:00",
    "partySize": 4,
    "specialRequests": "Window table please"
  }'`,
      javascript: `// Create a reservation
const reservationData = {
  restaurantId: '123e4567-e89b-12d3-a456-426614174000',
  reservationDate: '2024-01-15',
  reservationTime: '19:00',
  partySize: 4,
  specialRequests: 'Window table please'
};

const response = await fetch('/api/reservations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  },
  body: JSON.stringify(reservationData)
});

const reservation = await response.json();`,
      python: `# Create a reservation
url = "http://localhost:3001/api/reservations"
payload = {
    "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
    "reservationDate": "2024-01-15",
    "reservationTime": "19:00",
    "partySize": 4,
    "specialRequests": "Window table please"
}
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

response = requests.post(url, json=payload, headers=headers)`,
    },
    getUserReservations: {
      curl: `curl -X GET "http://localhost:3001/api/reservations/user?status=confirmed&page=1&limit=10" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
      javascript: `// Get user's reservations
const params = new URLSearchParams({
  status: 'confirmed',
  page: '1',
  limit: '10'
});

const response = await fetch(\`/api/reservations/user?\${params}\`, {
  headers: {
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  }
});

const reservations = await response.json();`,
    },
    cancel: {
      curl: `curl -X PATCH "http://localhost:3001/api/reservations/456e7890-e89b-12d3-a456-426614174000/cancel" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{"reason": "Change of plans"}'`,
      javascript: `// Cancel a reservation
const reservationId = '456e7890-e89b-12d3-a456-426614174000';
const response = await fetch(\`/api/reservations/\${reservationId}/cancel\`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  },
  body: JSON.stringify({ reason: 'Change of plans' })
});`,
    },
  },

  // Review Examples
  reviews: {
    create: {
      curl: `curl -X POST "http://localhost:3001/api/reviews" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
    "reservationId": "456e7890-e89b-12d3-a456-426614174000",
    "rating": 5,
    "comment": "Excellent food and service!",
    "photos": ["photo1.jpg", "photo2.jpg"]
  }'`,
      javascript: `// Create a review
const reviewData = {
  restaurantId: '123e4567-e89b-12d3-a456-426614174000',
  reservationId: '456e7890-e89b-12d3-a456-426614174000',
  rating: 5,
  comment: 'Excellent food and service!',
  photos: ['photo1.jpg', 'photo2.jpg']
};

const response = await fetch('/api/reviews', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  },
  body: JSON.stringify(reviewData)
});`,
    },
    getByRestaurant: {
      curl: `curl -X GET "http://localhost:3001/api/reviews/restaurant/123e4567-e89b-12d3-a456-426614174000?page=1&limit=20&sort=createdAt:desc" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
      javascript: `// Get restaurant reviews
const restaurantId = '123e4567-e89b-12d3-a456-426614174000';
const params = new URLSearchParams({
  page: '1',
  limit: '20',
  sort: 'createdAt:desc'
});

const response = await fetch(\`/api/reviews/restaurant/\${restaurantId}?\${params}\`, {
  headers: {
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  }
});`,
    },
  },

  // Payment Examples
  payments: {
    createIntent: {
      curl: `curl -X POST "http://localhost:3001/api/payments/create-payment-intent" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "reservationId": "456e7890-e89b-12d3-a456-426614174000",
    "amount": 5000,
    "currency": "usd"
  }'`,
      javascript: `// Create payment intent for reservation
const paymentData = {
  reservationId: '456e7890-e89b-12d3-a456-426614174000',
  amount: 5000, // $50.00 in cents
  currency: 'usd'
};

const response = await fetch('/api/payments/create-payment-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  },
  body: JSON.stringify(paymentData)
});

const { clientSecret } = await response.json();`,
    },
  },

  // Loyalty Examples
  loyalty: {
    getPoints: {
      curl: `curl -X GET "http://localhost:3001/api/loyalty/points" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
      javascript: `// Get user's loyalty points
const response = await fetch('/api/loyalty/points', {
  headers: {
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  }
});

const points = await response.json();`,
    },
    redeemReward: {
      curl: `curl -X POST "http://localhost:3001/api/loyalty/redeem" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "rewardId": "789e0123-e89b-12d3-a456-426614174000"
  }'`,
      javascript: `// Redeem a loyalty reward
const response = await fetch('/api/loyalty/redeem', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
  },
  body: JSON.stringify({
    rewardId: '789e0123-e89b-12d3-a456-426614174000'
  })
});`,
    },
  },

  // Admin Examples
  admin: {
    getAnalytics: {
      curl: `curl -X GET "http://localhost:3001/api/admin/analytics?type=revenue&period=monthly&startDate=2024-01-01&endDate=2024-12-31" \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`,
      javascript: `// Get analytics data (admin only)
const params = new URLSearchParams({
  type: 'revenue',
  period: 'monthly',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});

const response = await fetch(\`/api/admin/analytics?\${params}\`, {
  headers: {
    'Authorization': \`Bearer \${localStorage.getItem('adminToken')}\`
  }
});

const analytics = await response.json();`,
    },
    getUsers: {
      curl: `curl -X GET "http://localhost:3001/api/admin/users?page=1&limit=50&role=customer&isActive=true" \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`,
      javascript: `// Get users list (admin only)
const params = new URLSearchParams({
  page: '1',
  limit: '50',
  role: 'customer',
  isActive: 'true'
});

const response = await fetch(\`/api/admin/users?\${params}\`, {
  headers: {
    'Authorization': \`Bearer \${localStorage.getItem('adminToken')}\`
  }
});`,
    },
  },

  // WebSocket Examples
  websocket: {
    connection: {
      javascript: `// Connect to WebSocket for real-time updates
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: localStorage.getItem('token')
  }
});

// Listen for reservation updates
socket.on('reservation:updated', (data) => {
  console.log('Reservation updated:', data);
});

// Listen for waitlist updates
socket.on('waitlist:notification', (data) => {
  console.log('Waitlist notification:', data);
});

// Join restaurant room for updates
socket.emit('join:restaurant', { restaurantId: 'restaurant-id' });`,
    },
  },

  // Error Handling Examples
  errorHandling: {
    javascript: `// Proper error handling
async function makeApiRequest() {
  try {
    const response = await fetch('/api/restaurants', {
      headers: {
        'Authorization': \`Bearer \${localStorage.getItem('token')}\`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Request failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.message.includes('Authentication')) {
      // Handle auth error - redirect to login
      window.location.href = '/login';
    } else {
      // Handle other errors
      console.error('API Error:', error.message);
      throw error;
    }
  }
}`,
    python: `# Proper error handling in Python
import requests
from requests.exceptions import RequestException

def make_api_request(endpoint, token, **kwargs):
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"http://localhost:3001/api/{endpoint}", 
                              headers=headers, **kwargs)
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.HTTPError as e:
        if response.status_code == 401:
            print("Authentication failed - please login again")
        else:
            print(f"HTTP Error: {e}")
        raise
    
    except RequestException as e:
        print(f"Request failed: {e}")
        raise`,
  },
};

// Rate limiting examples
export const rateLimitingExamples = {
  general: {
    description: 'General API endpoints: 100 requests per 15 minutes',
    headers: {
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '95',
      'X-RateLimit-Reset': '1640995200'
    }
  },
  auth: {
    description: 'Authentication endpoints: 5 requests per 15 minutes',
    headers: {
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': '3',
      'X-RateLimit-Reset': '1640995200'
    }
  },
  admin: {
    description: 'Admin endpoints: 200 requests per 15 minutes',
    headers: {
      'X-RateLimit-Limit': '200',
      'X-RateLimit-Remaining': '150',
      'X-RateLimit-Reset': '1640995200'
    }
  }
};

// Response format examples
export const responseExamples = {
  success: {
    description: 'Standard success response format',
    example: {
      success: true,
      timestamp: '2024-01-15T10:30:00.000Z',
      data: {
        // Response data here
      }
    }
  },
  error: {
    description: 'Standard error response format',
    example: {
      success: false,
      timestamp: '2024-01-15T10:30:00.000Z',
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: [
        {
          field: 'email',
          message: 'Invalid email format'
        }
      ]
    }
  },
  pagination: {
    description: 'Paginated response format',
    example: {
      success: true,
      timestamp: '2024-01-15T10:30:00.000Z',
      data: {
        items: [], // Array of items
        pagination: {
          page: 1,
          limit: 20,
          total: 150,
          pages: 8,
          hasNext: true,
          hasPrev: false
        }
      }
    }
  }
};

export default {
  apiExamples,
  rateLimitingExamples,
  responseExamples,
};