import { User } from './User';
import { Restaurant } from './Restaurant';
import { Reservation } from './Reservation';
import { Review } from './Review';
import { Payment } from './Payment';
import { LoyaltyProgram } from './LoyaltyProgram';
import { SocialDiningGroup } from './SocialDiningGroup';
import { GroupMembership } from './GroupMembership';
import { GroupReservation } from './GroupReservation';
import { SustainabilityMetrics } from './SustainabilityMetrics';
import { UserSustainabilityProfile } from './UserSustainabilityProfile';
import { BlockchainLoyalty } from './BlockchainLoyalty';
import { BlockchainTransaction } from './BlockchainTransaction';
import { VirtualExperience } from './VirtualExperience';
import { VirtualBooking } from './VirtualBooking';

// Define all model associations
export function defineAssociations() {
  // User associations
  User.hasMany(Reservation, { foreignKey: 'userId', as: 'reservations' });
  User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
  User.hasOne(LoyaltyProgram, { foreignKey: 'userId', as: 'loyaltyProgram' });
  User.hasOne(BlockchainLoyalty, { foreignKey: 'userId', as: 'blockchainLoyalty' });
  User.hasOne(UserSustainabilityProfile, { foreignKey: 'userId', as: 'sustainabilityProfile' });
  User.hasMany(SocialDiningGroup, { foreignKey: 'creatorId', as: 'createdGroups' });
  User.hasMany(GroupMembership, { foreignKey: 'userId', as: 'groupMemberships' });
  User.hasMany(BlockchainTransaction, { foreignKey: 'userId', as: 'blockchainTransactions' });
  User.hasMany(VirtualBooking, { foreignKey: 'userId', as: 'virtualBookings' });

  // Restaurant associations
  Restaurant.hasMany(Reservation, { foreignKey: 'restaurantId', as: 'reservations' });
  Restaurant.hasMany(Review, { foreignKey: 'restaurantId', as: 'reviews' });
  Restaurant.hasOne(SustainabilityMetrics, { foreignKey: 'restaurantId', as: 'sustainabilityMetrics' });
  Restaurant.hasMany(VirtualExperience, { foreignKey: 'restaurantId', as: 'virtualExperiences' });

  // Reservation associations
  Reservation.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Reservation.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
  Reservation.hasOne(Payment, { foreignKey: 'reservationId', as: 'payment' });
  Reservation.hasOne(Review, { foreignKey: 'reservationId', as: 'review' });

  // Review associations
  Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Review.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
  Review.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });

  // Payment associations
  Payment.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
  Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Loyalty Program associations
  LoyaltyProgram.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Social Dining Group associations
  SocialDiningGroup.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });
  SocialDiningGroup.hasMany(GroupMembership, { foreignKey: 'groupId', as: 'memberships' });
  SocialDiningGroup.hasMany(GroupReservation, { foreignKey: 'groupId', as: 'groupReservations' });

  // Group Membership associations
  GroupMembership.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  GroupMembership.belongsTo(SocialDiningGroup, { foreignKey: 'groupId', as: 'group' });

  // Group Reservation associations
  GroupReservation.belongsTo(SocialDiningGroup, { foreignKey: 'groupId', as: 'group' });
  GroupReservation.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
  GroupReservation.belongsTo(User, { foreignKey: 'proposedById', as: 'proposedBy' });
  GroupReservation.belongsTo(Reservation, { foreignKey: 'finalReservationId', as: 'finalReservation' });

  // Sustainability associations
  SustainabilityMetrics.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
  UserSustainabilityProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Blockchain Loyalty associations
  BlockchainLoyalty.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  BlockchainTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Virtual Experience associations
  VirtualExperience.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
  VirtualExperience.hasMany(VirtualBooking, { foreignKey: 'virtualExperienceId', as: 'bookings' });

  // Virtual Booking associations
  VirtualBooking.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  VirtualBooking.belongsTo(VirtualExperience, { foreignKey: 'virtualExperienceId', as: 'virtualExperience' });

  console.log('✅ Model associations defined successfully');
}

// Export all models for easy import
export {
  User,
  Restaurant,
  Reservation,
  Review,
  Payment,
  LoyaltyProgram,
  SocialDiningGroup,
  GroupMembership,
  GroupReservation,
  SustainabilityMetrics,
  UserSustainabilityProfile,
  BlockchainLoyalty,
  BlockchainTransaction,
  VirtualExperience,
  VirtualBooking,
};
