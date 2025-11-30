export const restaurantTypeDefs = `#graphql
  type Restaurant {
    id: ID!
    tenantId: String!
    name: String!
    slug: String!
    description: String!
    cuisineType: String!
    priceRange: PriceRange!
    images: [String!]!
    mainImage: String!
    address: String!
    city: String!
    state: String!
    country: String!
    zipCode: String!
    latitude: Float
    longitude: Float
    phone: String!
    email: String!
    website: String
    operatingHours: [OperatingHour!]!
    capacity: Int!
    isActive: Boolean!
    isVerified: Boolean!
    features: [String!]!
    parkingOptions: [String!]!
    paymentMethods: [String!]!
    ambiance: [String!]!
    dietaryRestrictions: [String!]!
    dressCode: String
    averageRating: Float!
    totalReviews: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
    reviews(limit: Int, offset: Int, sortBy: ReviewSortBy): ReviewConnection!
    availableSlots(date: Date!, partySize: Int!, time: String): [TimeSlot!]!
    similarRestaurants(limit: Int): [Restaurant!]!
    menu: Menu
    promotions: [Promotion!]!
    isFavorited: Boolean!
    distance: Float
  }

  type OperatingHour {
    dayOfWeek: Int!
    openTime: String!
    closeTime: String!
    isClosed: Boolean!
  }

  type TimeSlot {
    time: String!
    available: Boolean!
    tablesAvailable: Int!
  }

  type Menu {
    id: ID!
    restaurantId: String!
    categories: [MenuCategory!]!
    lastUpdated: DateTime!
  }

  type MenuCategory {
    id: ID!
    name: String!
    description: String
    items: [MenuItem!]!
    displayOrder: Int!
  }

  type MenuItem {
    id: ID!
    name: String!
    description: String!
    price: Float!
    images: [String!]
    allergens: [String!]
    dietaryLabels: [String!]
    isAvailable: Boolean!
    preparationTime: Int
  }

  type Promotion {
    id: ID!
    title: String!
    description: String!
    discountPercent: Int
    discountAmount: Float
    validFrom: DateTime!
    validUntil: DateTime!
    conditions: String
    promoCode: String
  }

  type RestaurantConnection {
    edges: [RestaurantEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    facets: SearchFacets
  }

  type RestaurantEdge {
    node: Restaurant!
    cursor: String!
  }

  type SearchFacets {
    cuisineTypes: [FacetValue!]!
    priceRanges: [FacetValue!]!
    features: [FacetValue!]!
    dietaryRestrictions: [FacetValue!]!
    cities: [FacetValue!]!
  }

  type FacetValue {
    value: String!
    count: Int!
  }

  enum PriceRange {
    BUDGET
    MODERATE
    UPSCALE
    FINE_DINING
  }

  input RestaurantFilterInput {
    cuisineTypes: [String!]
    priceRanges: [PriceRange!]
    cities: [String!]
    features: [String!]
    dietaryRestrictions: [String!]
    minRating: Float
    maxDistance: Float
    isOpen: Boolean
    hasAvailability: Boolean
  }

  input RestaurantSearchInput {
    query: String
    location: LocationInput
    date: Date
    time: String
    partySize: Int
    filters: RestaurantFilterInput
    sortBy: RestaurantSortBy
  }

  input LocationInput {
    latitude: Float!
    longitude: Float!
    radius: Float
  }

  enum RestaurantSortBy {
    RELEVANCE
    RATING
    DISTANCE
    PRICE_LOW_TO_HIGH
    PRICE_HIGH_TO_LOW
    POPULARITY
    AVAILABILITY
  }

  input CreateRestaurantInput {
    name: String!
    description: String!
    cuisineType: String!
    priceRange: PriceRange!
    address: String!
    city: String!
    state: String!
    country: String!
    zipCode: String!
    phone: String!
    email: String!
    website: String
    operatingHours: [OperatingHourInput!]!
    capacity: Int!
    features: [String!]
    parkingOptions: [String!]
    paymentMethods: [String!]
    ambiance: [String!]
    dietaryRestrictions: [String!]
    dressCode: String
  }

  input OperatingHourInput {
    dayOfWeek: Int!
    openTime: String!
    closeTime: String!
    isClosed: Boolean
  }

  input UpdateRestaurantInput {
    name: String
    description: String
    cuisineType: String
    priceRange: PriceRange
    phone: String
    email: String
    website: String
    operatingHours: [OperatingHourInput!]
    capacity: Int
    features: [String!]
    parkingOptions: [String!]
    paymentMethods: [String!]
    ambiance: [String!]
    dietaryRestrictions: [String!]
    dressCode: String
    isActive: Boolean
  }

  extend type Query {
    restaurant(id: ID, slug: String): Restaurant
    restaurants(
      first: Int
      after: String
      last: Int
      before: String
      search: RestaurantSearchInput
    ): RestaurantConnection!
    searchRestaurants(search: RestaurantSearchInput!, first: Int, after: String): RestaurantConnection!
    nearbyRestaurants(location: LocationInput!, first: Int, after: String): RestaurantConnection!
    trendingRestaurants(location: LocationInput, first: Int): [Restaurant!]!
    recommendedRestaurants(first: Int): [Restaurant!]!
    favoriteRestaurants(first: Int, after: String): RestaurantConnection!
  }

  extend type Mutation {
    createRestaurant(input: CreateRestaurantInput!): Restaurant!
    updateRestaurant(id: ID!, input: UpdateRestaurantInput!): Restaurant!
    deleteRestaurant(id: ID!): Boolean!
    toggleFavoriteRestaurant(restaurantId: ID!): Restaurant!
    uploadRestaurantImage(restaurantId: ID!, image: Upload!, type: ImageType!): Restaurant!
    updateMenu(restaurantId: ID!, menu: MenuInput!): Menu!
    createPromotion(restaurantId: ID!, promotion: PromotionInput!): Promotion!
  }

  extend type Subscription {
    restaurantAvailabilityChanged(restaurantId: ID!, date: Date!): [TimeSlot!]!
    restaurantUpdated(restaurantId: ID!): Restaurant!
  }

  enum ImageType {
    MAIN
    GALLERY
    MENU
  }

  input MenuInput {
    categories: [MenuCategoryInput!]!
  }

  input MenuCategoryInput {
    name: String!
    description: String
    items: [MenuItemInput!]!
    displayOrder: Int!
  }

  input MenuItemInput {
    name: String!
    description: String!
    price: Float!
    allergens: [String!]
    dietaryLabels: [String!]
    isAvailable: Boolean
    preparationTime: Int
  }

  input PromotionInput {
    title: String!
    description: String!
    discountPercent: Int
    discountAmount: Float
    validFrom: DateTime!
    validUntil: DateTime!
    conditions: String
    promoCode: String
  }
`;