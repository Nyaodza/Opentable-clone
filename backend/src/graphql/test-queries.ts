// GraphQL test queries for development and testing

export const testQueries = {
  // Basic restaurant search
  searchRestaurants: `
    query SearchRestaurants($input: RestaurantSearchInput!) {
      restaurants(input: $input) {
        restaurants {
          id
          name
          cuisine
          priceRange
          rating
          totalReviews
          address
          city
          images
          features
        }
        total
        hasMore
      }
    }
  `,

  // Get restaurant details
  getRestaurant: `
    query GetRestaurant($id: ID!) {
      restaurant(id: $id) {
        id
        name
        description
        cuisine
        priceRange
        address
        city
        state
        phone
        email
        website
        rating
        totalReviews
        images
        features
        owner {
          firstName
          lastName
        }
        hours {
          dayOfWeek
          openTime
          closeTime
          isClosed
        }
        reviews(limit: 5) {
          id
          rating
          comment
          createdAt
          user {
            firstName
            lastName
          }
        }
      }
    }
  `,

  // Get user profile
  getUserProfile: `
    query GetUserProfile {
      me {
        id
        email
        firstName
        lastName
        phone
        role
        loyaltyPoints
        preferences {
          cuisineTypes
          priceRanges
          dietaryRestrictions
          preferredTimes
          maxDistance
        }
      }
    }
  `,

  // Get user reservations
  getUserReservations: `
    query GetUserReservations($status: ReservationStatus, $limit: Int) {
      myReservations(status: $status, limit: $limit) {
        id
        date
        time
        partySize
        status
        specialRequests
        totalAmount
        restaurant {
          id
          name
          address
          phone
        }
        table {
          tableNumber
          capacity
        }
      }
    }
  `,

  // Check availability
  checkAvailability: `
    query CheckAvailability($restaurantId: ID!, $date: Date!, $time: String!, $partySize: Int!) {
      checkAvailability(restaurantId: $restaurantId, date: $date, time: $time, partySize: $partySize)
    }
  `,

  // Get available slots
  getAvailableSlots: `
    query GetAvailableSlots($restaurantId: ID!, $date: Date!, $partySize: Int!) {
      getAvailableSlots(restaurantId: $restaurantId, date: $date, partySize: $partySize) {
        time
        available
        tableId
      }
    }
  `,

  // Get recommendations
  getRecommendations: `
    query GetRecommendations($limit: Int) {
      recommendedRestaurants(limit: $limit) {
        restaurant {
          id
          name
          cuisine
          priceRange
          rating
          address
          images
        }
        score
        reasons
        matchPercentage
      }
    }
  `,

  // Create reservation
  createReservation: `
    mutation CreateReservation($input: CreateReservationInput!) {
      createReservation(input: $input) {
        id
        date
        time
        partySize
        status
        restaurant {
          name
          address
        }
      }
    }
  `,

  // Update reservation
  updateReservation: `
    mutation UpdateReservation($id: ID!, $input: UpdateReservationInput!) {
      updateReservation(id: $id, input: $input) {
        id
        date
        time
        partySize
        status
        specialRequests
      }
    }
  `,

  // Cancel reservation
  cancelReservation: `
    mutation CancelReservation($id: ID!) {
      cancelReservation(id: $id) {
        id
        status
      }
    }
  `,

  // Create review
  createReview: `
    mutation CreateReview($input: CreateReviewInput!) {
      createReview(input: $input) {
        id
        rating
        comment
        isVerified
        restaurant {
          name
        }
      }
    }
  `,

  // Update user preferences
  updatePreferences: `
    mutation UpdatePreferences($input: UpdateUserPreferencesInput!) {
      updatePreferences(input: $input) {
        id
        preferences {
          cuisineTypes
          priceRanges
          dietaryRestrictions
          preferredTimes
          maxDistance
        }
      }
    }
  `,

  // Create payment intent
  createPaymentIntent: `
    mutation CreatePaymentIntent($reservationId: ID!, $amount: Float!) {
      createPaymentIntent(reservationId: $reservationId, amount: $amount)
    }
  `,

  // Subscription for reservation updates
  reservationUpdates: `
    subscription ReservationUpdates($restaurantId: ID!) {
      reservationUpdated(restaurantId: $restaurantId) {
        id
        status
        date
        time
        partySize
        user {
          firstName
          lastName
        }
      }
    }
  `,

  // Subscription for new reservations
  newReservations: `
    subscription NewReservations($restaurantId: ID!) {
      reservationCreated(restaurantId: $restaurantId) {
        id
        date
        time
        partySize
        status
        user {
          firstName
          lastName
          phone
        }
      }
    }
  `,
};

// Sample variables for testing
export const testVariables = {
  searchRestaurants: {
    input: {
      city: "San Francisco",
      cuisine: "Italian",
      limit: 10,
      offset: 0
    }
  },

  getRestaurant: {
    id: "1"
  },

  checkAvailability: {
    restaurantId: "1",
    date: "2024-01-15",
    time: "19:00",
    partySize: 2
  },

  getAvailableSlots: {
    restaurantId: "1",
    date: "2024-01-15",
    partySize: 2
  },

  createReservation: {
    input: {
      restaurantId: "1",
      date: "2024-01-15",
      time: "19:00",
      partySize: 2,
      specialRequests: "Window table preferred"
    }
  },

  updateReservation: {
    id: "1",
    input: {
      time: "20:00",
      specialRequests: "Celebrating anniversary"
    }
  },

  createReview: {
    input: {
      restaurantId: "1",
      rating: 5,
      comment: "Amazing food and service!",
      images: []
    }
  },

  updatePreferences: {
    input: {
      cuisineTypes: ["Italian", "French", "Japanese"],
      priceRanges: ["MODERATE", "EXPENSIVE"],
      dietaryRestrictions: ["Vegetarian"],
      preferredTimes: ["18:00", "19:00", "20:00"],
      maxDistance: 15
    }
  },

  createPaymentIntent: {
    reservationId: "1",
    amount: 25.00
  },

  reservationUpdates: {
    restaurantId: "1"
  }
};

// Helper function to test GraphQL queries
export function generateCurlCommand(query: string, variables: any = {}, token?: string) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const body = JSON.stringify({
    query: query.trim(),
    variables
  });

  const headerString = Object.entries(headers)
    .map(([key, value]) => `-H "${key}: ${value}"`)
    .join(' ');

  return `curl -X POST http://localhost:3001/graphql ${headerString} -d '${body}'`;
}

// Example usage:
// console.log(generateCurlCommand(testQueries.searchRestaurants, testVariables.searchRestaurants));
