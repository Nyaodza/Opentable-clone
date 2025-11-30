import { GraphQLSchema } from 'graphql';
import { mergeSchemas } from '@graphql-tools/schema';
import { restaurantSchema } from './restaurant.schema';
import { userSchema } from './user.schema';
import { reservationSchema } from './reservation.schema';
import { reviewSchema } from './review.schema';
import { searchSchema } from './search.schema';
import { tenantSchema } from './tenant.schema';
import { analyticsSchema } from './analytics.schema';

export const schema = mergeSchemas({
  schemas: [
    restaurantSchema,
    userSchema,
    reservationSchema,
    reviewSchema,
    searchSchema,
    tenantSchema,
    analyticsSchema,
  ],
});