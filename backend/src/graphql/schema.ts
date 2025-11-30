// Using template literal for GraphQL schema instead of gql tag
const gql = (strings: TemplateStringsArray, ...values: any[]) => strings.raw[0];

export const typeDefs = gql`
  scalar JSON
  scalar Date
  scalar Upload

  # Core User Types
  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    phone: String
    profilePicture: String
    preferences: UserPreferences
    loyaltyProgram: LoyaltyProgram
    blockchainLoyalty: BlockchainLoyalty
    sustainabilityProfile: UserSustainabilityProfile
    createdAt: String!
    updatedAt: String!
  }

  type UserPreferences {
    cuisineTypes: [String!]!
    dietaryRestrictions: [String!]!
    priceRange: String
    preferredLocations: [String!]!
    notificationSettings: NotificationSettings!
  }

  type NotificationSettings {
    email: Boolean!
    push: Boolean!
    sms: Boolean!
    marketing: Boolean!
  }

  # Restaurant Types
  type Restaurant {
    id: ID!
    name: String!
    description: String
    cuisine: String!
    address: Address!
    phone: String!
    email: String
    website: String
    images: [String!]!
    rating: Float
    priceRange: String!
    capacity: Int!
    amenities: [String!]!
    openingHours: [OpeningHour!]!
    availability: [DayAvailability!]!
    reviews: [Review!]!
    sustainabilityMetrics: SustainabilityMetrics
    virtualExperiences: [VirtualExperience!]!
    socialDiningGroups: [SocialDiningGroup!]!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Address {
    street: String!
    city: String!
    state: String!
    zipCode: String!
    country: String!
    latitude: Float
    longitude: Float
  }

  type OpeningHour {
    dayOfWeek: Int!
    openTime: String!
    closeTime: String!
    isOpen: Boolean!
  }

  type DayAvailability {
    date: String!
    timeSlots: [TimeSlot!]!
  }

  type TimeSlot {
    time: String!
    availableSeats: Int!
    isAvailable: Boolean!
  }

  # Reservation Types
  type Reservation {
    id: ID!
    user: User!
    restaurant: Restaurant!
    date: String!
    time: String!
    partySize: Int!
    status: ReservationStatus!
    specialRequests: String
    confirmationCode: String!
    estimatedDuration: Int
    actualArrivalTime: String
    actualDepartureTime: String
    payment: Payment
    review: Review
    createdAt: String!
    updatedAt: String!
  }

  enum ReservationStatus {
    PENDING
    CONFIRMED
    SEATED
    COMPLETED
    CANCELLED
    NO_SHOW
  }

  # Review Types
  type Review {
    id: ID!
    user: User!
    restaurant: Restaurant!
    reservation: Reservation
    rating: Int!
    comment: String
    photos: [String!]
    response: RestaurantResponse
    isVerified: Boolean!
    helpfulCount: Int!
    createdAt: String!
    updatedAt: String!
  }

  type RestaurantResponse {
    message: String!
    respondedAt: String!
  }

  # Payment Types
  type Payment {
    id: ID!
    reservation: Reservation!
    amount: Float!
    currency: String!
    status: PaymentStatus!
    paymentMethod: String!
    transactionId: String
    createdAt: String!
  }

  enum PaymentStatus {
    PENDING
    COMPLETED
    FAILED
    REFUNDED
  }

  # Loyalty Program Types
  type LoyaltyProgram {
    id: ID!
    user: User!
    points: Int!
    tier: LoyaltyTier!
    totalSpent: Float!
    totalVisits: Int!
    benefits: [String!]!
    expiringPoints: Int!
    expirationDate: String
    createdAt: String!
    updatedAt: String!
  }

  enum LoyaltyTier {
    BRONZE
    SILVER
    GOLD
    PLATINUM
    DIAMOND
  }

  # Analytics Types
  type AnalyticsData {
    totalReservations: Int!
    totalRevenue: Float!
    averageRating: Float!
    popularTimeSlots: [TimeSlotAnalytics!]!
    topRestaurants: [RestaurantAnalytics!]!
    userGrowth: [UserGrowthData!]!
    revenueGrowth: [RevenueGrowthData!]!
  }

  type TimeSlotAnalytics {
    time: String!
    reservationCount: Int!
  }

  type RestaurantAnalytics {
    restaurant: Restaurant!
    reservationCount: Int!
    revenue: Float!
    averageRating: Float!
  }

  type UserGrowthData {
    date: String!
    newUsers: Int!
    totalUsers: Int!
  }

  type RevenueGrowthData {
    date: String!
    revenue: Float!
    reservations: Int!
  }

  # Social Dining Types
  type SocialDiningGroup {
    id: ID!
    name: String!
    description: String
    creator: User!
    members: [GroupMembership!]!
    maxMembers: Int!
    isPrivate: Boolean!
    inviteCode: String
    preferences: GroupPreferences!
    reservations: [GroupReservation!]!
    createdAt: String!
    updatedAt: String!
  }

  type GroupMembership {
    id: ID!
    user: User!
    group: SocialDiningGroup!
    role: GroupRole!
    status: MembershipStatus!
    joinedAt: String!
  }

  enum GroupRole {
    ADMIN
    MODERATOR
    MEMBER
  }

  enum MembershipStatus {
    ACTIVE
    INVITED
    BANNED
  }

  type GroupPreferences {
    cuisineTypes: [String!]!
    priceRange: String
    preferredLocations: [String!]!
    dietaryRestrictions: [String!]!
  }

  type GroupReservation {
    id: ID!
    group: SocialDiningGroup!
    restaurant: Restaurant!
    proposedBy: User!
    date: String!
    time: String!
    partySize: Int!
    status: GroupReservationStatus!
    votes: [ReservationVote!]!
    finalReservation: Reservation
    billSplitType: BillSplitType!
    specialRequests: String
    createdAt: String!
  }

  enum GroupReservationStatus {
    PROPOSED
    VOTING
    CONFIRMED
    COMPLETED
    CANCELLED
  }

  enum BillSplitType {
    EQUAL
    BY_ITEM
    BY_PERSON
    HOST_PAYS
  }

  type ReservationVote {
    id: ID!
    user: User!
    vote: VoteType!
    comment: String
    createdAt: String!
  }

  enum VoteType {
    YES
    NO
    MAYBE
  }

  # AI Concierge Types
  type AIConciergeResponse {
    response: String!
    intent: String!
    entities: JSON!
    confidence: Float!
    suggestions: [String!]!
    followUpQuestions: [String!]!
    actionRequired: Boolean!
    conversationContext: JSON!
  }

  # Sustainability Types
  type SustainabilityMetrics {
    id: ID!
    restaurant: Restaurant!
    carbonFootprint: Float!
    localSourcingPercentage: Float!
    wasteReductionScore: Float!
    communityImpactScore: Float!
    certifications: [String!]!
    sustainabilityRating: Float!
    lastUpdated: String!
  }

  type UserSustainabilityProfile {
    id: ID!
    user: User!
    preferences: SustainabilityPreferences!
    impact: SustainabilityImpact!
    achievements: [SustainabilityAchievement!]!
    goals: [SustainabilityGoal!]!
    insights: [SustainabilityInsight!]!
    notificationSettings: SustainabilityNotificationSettings!
  }

  type SustainabilityPreferences {
    prioritizeLocalSourcing: Boolean!
    prioritizeLowCarbon: Boolean!
    prioritizeWasteReduction: Boolean!
    prioritizeCommunityImpact: Boolean!
    minimumSustainabilityRating: Float!
  }

  type SustainabilityImpact {
    totalCarbonSaved: Float!
    localBusinessesSupported: Int!
    wasteReduced: Float!
    communityImpactScore: Float!
    sustainableMealsCount: Int!
  }

  type SustainabilityAchievement {
    id: String!
    name: String!
    description: String!
    iconUrl: String!
    unlockedAt: String!
  }

  type SustainabilityGoal {
    id: String!
    type: String!
    target: Float!
    current: Float!
    deadline: String
    isCompleted: Boolean!
  }

  type SustainabilityInsight {
    type: String!
    message: String!
    impact: Float!
    recommendation: String!
    generatedAt: String!
  }

  type SustainabilityNotificationSettings {
    weeklyReport: Boolean!
    achievementUnlocked: Boolean!
    goalReminder: Boolean!
    newSustainableOptions: Boolean!
  }

  # Blockchain Loyalty Types
  type BlockchainLoyalty {
    id: ID!
    user: User!
    tokenBalance: Float!
    totalEarned: Float!
    totalRedeemed: Float!
    walletAddress: String
    blockchainNetwork: String!
    stakingBalance: Float!
    stakingRewards: Float!
    loyaltyTier: String!
    tierProgress: Float!
    referralTokens: Float!
    nftCollectibles: [NFTCollectible!]!
    transactionHistory: [BlockchainTransaction!]!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type BlockchainTransaction {
    id: ID!
    user: User!
    transactionHash: String
    blockNumber: Int
    transactionType: String!
    tokenAmount: Float!
    sourceType: String!
    sourceId: String
    status: String!
    confirmations: Int!
    metadata: JSON
    createdAt: String!
  }

  type NFTCollectible {
    id: ID!
    tokenId: Int!
    name: String!
    description: String
    imageUrl: String
    rarity: String!
    attributes: [NFTAttribute!]!
  }

  type NFTAttribute {
    trait: String!
    value: String!
  }

  # Virtual Experience Types
  type VirtualExperience {
    id: ID!
    restaurant: Restaurant!
    title: String!
    description: String!
    experienceType: String!
    duration: Int!
    maxParticipants: Int!
    price: Float!
    currency: String!
    availableSlots: [VirtualTimeSlot!]!
    vrAssets: VRAssets!
    streamingUrl: String
    interactiveElements: [InteractiveElement!]!
    requirements: [String!]!
    language: String!
    difficulty: String!
    rating: Float!
    totalBookings: Int!
    isActive: Boolean!
    createdAt: String!
  }

  type VirtualBooking {
    id: ID!
    user: User!
    virtualExperience: VirtualExperience!
    bookingDate: String!
    startTime: String!
    endTime: String!
    participants: [VirtualParticipant!]!
    totalPrice: Float!
    currency: String!
    status: String!
    paymentStatus: String!
    sessionId: String
    joinUrl: String
    vrRoomId: String
    specialRequests: String
    deviceInfo: DeviceInfo!
    feedback: VirtualFeedback
    completedAt: String
    createdAt: String!
  }

  type VirtualParticipant {
    name: String!
    email: String
    age: Int
    dietaryRestrictions: [String!]
  }

  type VRAssets {
    sceneUrl: String
    audioUrl: String
    videoUrl: String
    interactiveObjects: [String!]
    thumbnailUrl: String
  }

  type InteractiveElement {
    type: String!
    name: String!
    description: String
    triggerCondition: String
    action: String!
  }

  type VirtualTimeSlot {
    date: String!
    startTime: String!
    endTime: String!
    available: Int!
    price: Float
  }

  type DeviceInfo {
    type: String!
    model: String
    capabilities: [String!]!
  }

  type VirtualFeedback {
    rating: Float!
    comment: String
    highlights: [String!]
    improvements: [String!]
    wouldRecommend: Boolean!
  }

  # Voice/IoT Types
  type VoiceResponse {
    text: String!
    ssml: String
    shouldEndSession: Boolean!
    reprompt: String
    cardTitle: String
    cardContent: String
    displayData: JSON
  }

  type IoTDevice {
    id: ID!
    user: User!
    deviceType: String!
    deviceName: String!
    capabilities: [String!]!
    isActive: Boolean!
    lastSeen: String!
    settings: JSON!
  }

  # Input Types
  input RegisterInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    phone: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input UpdateProfileInput {
    firstName: String
    lastName: String
    phone: String
    profilePicture: Upload
    preferences: UserPreferencesInput
  }

  input UserPreferencesInput {
    cuisineTypes: [String!]
    dietaryRestrictions: [String!]
    priceRange: String
    preferredLocations: [String!]
    notificationSettings: NotificationSettingsInput
  }

  input NotificationSettingsInput {
    email: Boolean
    push: Boolean
    sms: Boolean
    marketing: Boolean
  }

  input RestaurantSearchInput {
    query: String
    location: String
    cuisine: String
    priceRange: String
    date: String
    time: String
    partySize: Int
    amenities: [String!]
    rating: Float
    limit: Int
    offset: Int
  }

  input CreateReservationInput {
    restaurantId: ID!
    date: String!
    time: String!
    partySize: Int!
    specialRequests: String
  }

  input UpdateReservationInput {
    date: String
    time: String
    partySize: Int
    specialRequests: String
  }

  input CreateReviewInput {
    restaurantId: ID!
    reservationId: ID
    rating: Int!
    comment: String
    photos: [Upload!]
  }

  input UpdateReviewInput {
    rating: Int
    comment: String
    photos: [Upload!]
  }

  input PaymentInput {
    reservationId: ID!
    amount: Float!
    currency: String!
    paymentMethodId: String!
  }

  input SocialDiningGroupInput {
    name: String!
    description: String
    maxMembers: Int
    isPrivate: Boolean
    preferences: GroupPreferencesInput!
  }

  input GroupPreferencesInput {
    cuisineTypes: [String!]!
    priceRange: String
    preferredLocations: [String!]!
    dietaryRestrictions: [String!]!
  }

  input GroupReservationInput {
    groupId: ID!
    restaurantId: ID!
    date: String!
    time: String!
    partySize: Int!
    billSplitType: BillSplitType!
    specialRequests: String
  }

  input BlockchainLoyaltyInput {
    walletAddress: String
    blockchainNetwork: String
  }

  input TokenEarnInput {
    amount: Float!
    sourceType: String!
    sourceId: String
    metadata: JSON
  }

  input TokenRedeemInput {
    amount: Float!
    rewardType: String!
    metadata: JSON
  }

  input StakingInput {
    amount: Float!
    duration: Int!
  }

  input VirtualExperienceSearchInput {
    experienceType: String
    restaurantId: String
    date: String
    maxPrice: Float
    difficulty: String
    language: String
    hasVR: Boolean
    location: String
    limit: Int
    offset: Int
  }

  input VirtualBookingInput {
    virtualExperienceId: ID!
    bookingDate: String!
    startTime: String!
    participants: [VirtualParticipantInput!]!
    specialRequests: String
    deviceInfo: DeviceInfoInput!
  }

  input VirtualParticipantInput {
    name: String!
    email: String
    age: Int
    dietaryRestrictions: [String!]
  }

  input DeviceInfoInput {
    type: String!
    model: String
    capabilities: [String!]!
  }

  input VirtualFeedbackInput {
    rating: Float!
    comment: String
    highlights: [String!]
    improvements: [String!]
    wouldRecommend: Boolean!
  }

  input VoiceCommandInput {
    command: String!
    deviceType: String!
    deviceId: String
    sessionId: String
  }

  input IoTDeviceInput {
    deviceType: String!
    deviceName: String!
    capabilities: [String!]!
    settings: JSON
  }

  # Return Types
  type AuthPayload {
    token: String!
    user: User!
  }

  type RestaurantSearchResult {
    restaurants: [Restaurant!]!
    total: Int!
    hasMore: Boolean!
  }

  type PaymentResult {
    success: Boolean!
    paymentId: String
    clientSecret: String
    error: String
  }

  type RefundResult {
    success: Boolean!
    refundId: String
    amount: Float
    error: String
  }

  # Query Type
  type Query {
    # User queries
    me: User
    user(id: ID!): User

    # Restaurant queries
    restaurant(id: ID!): Restaurant
    restaurants(input: RestaurantSearchInput!): RestaurantSearchResult!

    # Reservation queries
    reservation(id: ID!): Reservation
    reservations(userId: ID, restaurantId: ID, status: ReservationStatus): [Reservation!]!

    # Review queries
    review(id: ID!): Review
    reviews(restaurantId: ID!, limit: Int, offset: Int): [Review!]!

    # Payment queries
    payment(id: ID!): Payment

    # Loyalty queries
    loyaltyProgram(userId: ID!): LoyaltyProgram

    # Analytics queries
    analytics: AnalyticsData

    # Social Dining queries
    socialDiningGroup(id: ID!): SocialDiningGroup
    socialDiningGroups(userId: ID!): [SocialDiningGroup!]!
    groupReservations(groupId: ID!): [GroupReservation!]!

    # AI Concierge queries
    aiConciergeChat(message: String!, context: JSON): AIConciergeResponse!

    # Sustainability queries
    sustainabilityMetrics(restaurantId: ID!): SustainabilityMetrics
    userSustainabilityProfile(userId: ID!): UserSustainabilityProfile

    # Blockchain Loyalty queries
    blockchainLoyalty(userId: ID!): BlockchainLoyalty
    blockchainTransactions(userId: ID!, limit: Int): [BlockchainTransaction!]!
    loyaltyLeaderboard(limit: Int): [BlockchainLoyalty!]!

    # Virtual Experience queries
    virtualExperience(id: ID!): VirtualExperience
    virtualExperiences(input: VirtualExperienceSearchInput!): [VirtualExperience!]!
    virtualBooking(id: ID!): VirtualBooking
    virtualBookings(userId: ID!, status: String): [VirtualBooking!]!
    popularVirtualExperiences(limit: Int): [VirtualExperience!]!

    # Voice/IoT queries
    iotDevices(userId: ID!): [IoTDevice!]!
    activeVRSession(sessionId: String!): JSON
  }

  # Mutation Type
  type Mutation {
    # User mutations
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    updateProfile(input: UpdateProfileInput!): User!

    # Restaurant mutations
    createRestaurant(input: CreateRestaurantInput!): Restaurant!
    updateRestaurant(id: ID!, input: UpdateRestaurantInput!): Restaurant!

    # Reservation mutations
    createReservation(input: CreateReservationInput!): Reservation!
    updateReservation(id: ID!, input: UpdateReservationInput!): Reservation!
    cancelReservation(id: ID!, reason: String): Reservation!

    # Review mutations
    createReview(input: CreateReviewInput!): Review!
    updateReview(id: ID!, input: UpdateReviewInput!): Review!
    deleteReview(id: ID!): Boolean!

    # Payment mutations
    processPayment(input: PaymentInput!): PaymentResult!
    refundPayment(paymentId: ID!, reason: String): RefundResult!

    # Social Dining mutations
    createSocialDiningGroup(input: SocialDiningGroupInput!): SocialDiningGroup!
    inviteToGroup(groupId: ID!, userIds: [ID!]!): Boolean!
    joinGroup(groupId: ID!, inviteCode: String): Boolean!
    leaveGroup(groupId: ID!): Boolean!
    createGroupReservation(input: GroupReservationInput!): GroupReservation!
    voteOnGroupReservation(reservationId: ID!, vote: VoteType!): Boolean!

    # Blockchain Loyalty mutations
    createLoyaltyAccount(input: BlockchainLoyaltyInput): BlockchainLoyalty!
    earnTokens(input: TokenEarnInput!): BlockchainTransaction!
    redeemTokens(input: TokenRedeemInput!): BlockchainTransaction!
    stakeTokens(input: StakingInput!): BlockchainTransaction!
    unstakeTokens: BlockchainTransaction!

    # Virtual Experience mutations
    createVirtualBooking(input: VirtualBookingInput!): VirtualBooking!
    cancelVirtualBooking(bookingId: ID!, reason: String): Boolean!
    startVRSession(bookingId: ID!): JSON!
    endVRSession(sessionId: String!): Boolean!
    submitVirtualFeedback(bookingId: ID!, feedback: VirtualFeedbackInput!): Boolean!

    # Voice/IoT mutations
    processVoiceCommand(input: VoiceCommandInput!): VoiceResponse!
    registerIoTDevice(input: IoTDeviceInput!): IoTDevice!
    updateDeviceStatus(deviceId: ID!, isActive: Boolean!): Boolean!
  }

  # Subscription Type
  type Subscription {
    # Core subscriptions
    reservationUpdated(userId: ID!): Reservation
    restaurantUpdated(restaurantId: ID!): Restaurant
    reviewAdded(restaurantId: ID!): Review
    loyaltyUpdated(userId: ID!): LoyaltyProgram
    analyticsUpdated: AnalyticsData

    # Disruptive feature subscriptions
    blockchainLoyaltyUpdated(userId: ID!): BlockchainLoyalty
    tokenTransactionUpdated(userId: ID!): BlockchainTransaction
    virtualBookingUpdated(userId: ID!): VirtualBooking
    vrSessionUpdated(sessionId: String!): JSON
    socialGroupUpdated(groupId: ID!): SocialDiningGroup
    deviceMessageReceived(deviceId: ID!): JSON
  }
`;
