export const userTypeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    fullName: String!
    phone: String
    profileImage: String
    isActive: Boolean!
    isVerified: Boolean!
    role: UserRole!
    preferences: UserPreferences!
    loyaltyPoints: Int!
    membershipTier: MembershipTier!
    createdAt: DateTime!
    updatedAt: DateTime!
    reservations(
      first: Int
      after: String
      status: ReservationStatus
      startDate: Date
      endDate: Date
    ): ReservationConnection!
    reviews(first: Int, after: String): ReviewConnection!
    favoriteRestaurants(first: Int, after: String): RestaurantConnection!
    notifications: [Notification!]!
    savedCreditCards: [SavedCreditCard!]!
    addresses: [Address!]!
  }

  type UserPreferences {
    cuisineTypes: [String!]!
    priceRanges: [PriceRange!]!
    dietaryRestrictions: [String!]!
    preferredRadius: Float!
    emailNotifications: Boolean!
    smsNotifications: Boolean!
    pushNotifications: Boolean!
    language: String!
    currency: String!
    timeZone: String!
  }

  type SavedCreditCard {
    id: ID!
    last4: String!
    brand: String!
    expiryMonth: Int!
    expiryYear: Int!
    isDefault: Boolean!
  }

  type Address {
    id: ID!
    label: String!
    line1: String!
    line2: String
    city: String!
    state: String!
    country: String!
    zipCode: String!
    isDefault: Boolean!
  }

  type Notification {
    id: ID!
    type: NotificationType!
    title: String!
    message: String!
    data: JSONObject
    isRead: Boolean!
    createdAt: DateTime!
  }

  enum UserRole {
    CUSTOMER
    RESTAURANT_OWNER
    RESTAURANT_STAFF
    ADMIN
    SUPER_ADMIN
  }

  enum MembershipTier {
    BASIC
    SILVER
    GOLD
    PLATINUM
  }

  enum NotificationType {
    RESERVATION_CONFIRMED
    RESERVATION_CANCELLED
    RESERVATION_REMINDER
    REVIEW_REQUEST
    PROMOTION
    LOYALTY_POINTS
    SYSTEM
  }

  type AuthPayload {
    user: User!
    token: String!
    refreshToken: String!
    expiresIn: Int!
  }

  type RefreshTokenPayload {
    token: String!
    refreshToken: String!
    expiresIn: Int!
  }

  input SignUpInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    phone: String
    acceptTerms: Boolean!
  }

  input SignInInput {
    email: String!
    password: String!
    rememberMe: Boolean
  }

  input UpdateProfileInput {
    firstName: String
    lastName: String
    phone: String
    preferences: UserPreferencesInput
  }

  input UserPreferencesInput {
    cuisineTypes: [String!]
    priceRanges: [PriceRange!]
    dietaryRestrictions: [String!]
    preferredRadius: Float
    emailNotifications: Boolean
    smsNotifications: Boolean
    pushNotifications: Boolean
    language: String
    currency: String
    timeZone: String
  }

  input AddAddressInput {
    label: String!
    line1: String!
    line2: String
    city: String!
    state: String!
    country: String!
    zipCode: String!
    isDefault: Boolean
  }

  input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
  }

  extend type Query {
    me: User
    user(id: ID!): User
    users(
      first: Int
      after: String
      role: UserRole
      search: String
    ): UserConnection!
    checkEmailAvailability(email: String!): Boolean!
  }

  extend type Mutation {
    signUp(input: SignUpInput!): AuthPayload!
    signIn(input: SignInInput!): AuthPayload!
    signOut: Boolean!
    refreshToken(refreshToken: String!): RefreshTokenPayload!
    updateProfile(input: UpdateProfileInput!): User!
    uploadProfileImage(image: Upload!): User!
    changePassword(input: ChangePasswordInput!): User!
    requestPasswordReset(email: String!): Boolean!
    resetPassword(token: String!, newPassword: String!): AuthPayload!
    verifyEmail(token: String!): User!
    resendVerificationEmail: Boolean!
    deleteAccount(password: String!): Boolean!
    addAddress(input: AddAddressInput!): Address!
    updateAddress(id: ID!, input: AddAddressInput!): Address!
    deleteAddress(id: ID!): Boolean!
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: Boolean!
    updateNotificationSettings(input: UserPreferencesInput!): User!
  }

  extend type Subscription {
    notificationReceived: Notification!
    profileUpdated: User!
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }
`;