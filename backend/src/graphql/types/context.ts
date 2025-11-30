import { Request, Response } from 'express';
import { User } from '../../models/user.model';
import { Tenant } from '../../models/tenant.model';
import { RestaurantLoader } from '../loaders/restaurant.loader';
import { UserLoader } from '../loaders/user.loader';
import { ReservationLoader } from '../loaders/reservation.loader';

export interface AuthContext {
  req: Request;
  res: Response;
  user?: User;
  tenant?: Tenant;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  loaders: {
    restaurant: RestaurantLoader;
    user: UserLoader;
    reservation: ReservationLoader;
  };
}