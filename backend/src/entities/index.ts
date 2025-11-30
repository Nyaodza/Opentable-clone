// TypeORM Entities
export { User } from './user.entity';
export { Restaurant } from './restaurant.entity';
export { Reservation } from './reservation.entity';
export { Review } from './review.entity';
export { Table } from './table.entity';
export { Menu } from './menu.entity';
export { MenuItem } from './menu-item.entity';
export { Payment } from './payment.entity';
export { Favorite } from './favorite.entity';

// Entity arrays for TypeORM configuration
export const entities = [
  User,
  Restaurant,
  Reservation,
  Review,
  Table,
  Menu,
  MenuItem,
  Payment,
  Favorite,
];