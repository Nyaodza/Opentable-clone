import { GraphQLError } from 'graphql';
import { Restaurant } from '../../models/restaurant.model';
import { ReservationService } from '../../services/reservation.service';
import { RecommendationService } from '../../services/recommendation.service';
import { RestaurantLoader } from '../loaders/restaurant.loader';
import { SearchService } from '../../services/search.service';
import { AuthContext } from '../types/context';
import { uploadImage } from '../../utils/upload';
import { pubsub } from '../pubsub';

export const restaurantResolvers = {
  Query: {
    restaurant: async (
      _: any,
      { id, slug }: { id?: string; slug?: string },
      { loaders }: AuthContext
    ) => {
      if (!id && !slug) {
        throw new GraphQLError('Either id or slug must be provided');
      }
      
      if (id) {
        return loaders.restaurant.load(id);
      }
      
      return Restaurant.findOne({ where: { slug } });
    },

    restaurants: async (
      _: any,
      args: any,
      { tenant }: AuthContext
    ) => {
      const { first = 20, after, search } = args;
      
      const query: any = {
        where: {
          tenantId: tenant?.id,
          isActive: true,
        },
        limit: first + 1,
      };

      if (after) {
        query.where.id = { $gt: after };
      }

      if (search?.filters) {
        // Apply filters
        const { filters } = search;
        if (filters.cuisineTypes?.length) {
          query.where.cuisineType = { $in: filters.cuisineTypes };
        }
        if (filters.priceRanges?.length) {
          query.where.priceRange = { $in: filters.priceRanges };
        }
        if (filters.minRating) {
          query.where.averageRating = { $gte: filters.minRating };
        }
      }

      const restaurants = await Restaurant.findAll(query);
      const hasNextPage = restaurants.length > first;
      const edges = restaurants.slice(0, first).map(restaurant => ({
        node: restaurant,
        cursor: restaurant.id,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!after,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor,
        },
        totalCount: await Restaurant.count({ where: query.where }),
      };
    },

    searchRestaurants: async (
      _: any,
      { search, first = 20, after }: any,
      { user, tenant }: AuthContext
    ) => {
      return SearchService.searchRestaurants({
        ...search,
        tenantId: tenant?.id,
        userId: user?.id,
        limit: first,
        cursor: after,
      });
    },

    nearbyRestaurants: async (
      _: any,
      { location, first = 20, after }: any,
      { tenant }: AuthContext
    ) => {
      const restaurants = await SearchService.findNearbyRestaurants(
        location.latitude,
        location.longitude,
        location.radius || 10,
        {
          tenantId: tenant?.id,
          limit: first,
          cursor: after,
        }
      );

      return {
        edges: restaurants.map(r => ({
          node: r,
          cursor: r.id,
        })),
        pageInfo: {
          hasNextPage: restaurants.length === first,
          hasPreviousPage: !!after,
        },
        totalCount: restaurants.length,
      };
    },

    trendingRestaurants: async (
      _: any,
      { location, first = 10 }: any,
      { tenant }: AuthContext
    ) => {
      return RecommendationService.getTrendingRestaurants(location, first);
    },

    recommendedRestaurants: async (
      _: any,
      { first = 10 }: any,
      { user }: AuthContext
    ) => {
      if (!user) {
        throw new GraphQLError('Authentication required');
      }

      const recommendations = await RecommendationService.getPersonalizedRecommendations(
        user.id,
        { limit: first }
      );

      return Promise.all(
        recommendations.map(r => Restaurant.findByPk(r.restaurantId))
      );
    },

    favoriteRestaurants: async (
      _: any,
      { first = 20, after }: any,
      { user }: AuthContext
    ) => {
      if (!user) {
        throw new GraphQLError('Authentication required');
      }

      // This would need a favorites junction table
      // Simplified for now
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      };
    },
  },

  Mutation: {
    createRestaurant: async (
      _: any,
      { input }: any,
      { user, tenant }: AuthContext
    ) => {
      if (!user || !['RESTAURANT_OWNER', 'ADMIN'].includes(user.role)) {
        throw new GraphQLError('Not authorized');
      }

      return Restaurant.create({
        ...input,
        tenantId: tenant?.id,
        ownerId: user.id,
      });
    },

    updateRestaurant: async (
      _: any,
      { id, input }: any,
      { user }: AuthContext
    ) => {
      const restaurant = await Restaurant.findByPk(id);
      
      if (!restaurant) {
        throw new GraphQLError('Restaurant not found');
      }

      if (!user || (user.role !== 'ADMIN' && restaurant.ownerId !== user.id)) {
        throw new GraphQLError('Not authorized');
      }

      await restaurant.update(input);
      
      // Notify subscribers
      pubsub.publish(`RESTAURANT_UPDATED_${id}`, {
        restaurantUpdated: restaurant,
      });

      return restaurant;
    },

    deleteRestaurant: async (
      _: any,
      { id }: any,
      { user }: AuthContext
    ) => {
      const restaurant = await Restaurant.findByPk(id);
      
      if (!restaurant) {
        throw new GraphQLError('Restaurant not found');
      }

      if (!user || (user.role !== 'ADMIN' && restaurant.ownerId !== user.id)) {
        throw new GraphQLError('Not authorized');
      }

      await restaurant.destroy();
      return true;
    },

    uploadRestaurantImage: async (
      _: any,
      { restaurantId, image, type }: any,
      { user }: AuthContext
    ) => {
      const restaurant = await Restaurant.findByPk(restaurantId);
      
      if (!restaurant) {
        throw new GraphQLError('Restaurant not found');
      }

      if (!user || (user.role !== 'ADMIN' && restaurant.ownerId !== user.id)) {
        throw new GraphQLError('Not authorized');
      }

      const imageUrl = await uploadImage(image, `restaurants/${restaurantId}`);

      if (type === 'MAIN') {
        await restaurant.update({ mainImage: imageUrl });
      } else {
        const images = [...restaurant.images, imageUrl];
        await restaurant.update({ images });
      }

      return restaurant;
    },
  },

  Subscription: {
    restaurantAvailabilityChanged: {
      subscribe: (_: any, { restaurantId, date }: any) => {
        return pubsub.asyncIterator([`AVAILABILITY_CHANGED_${restaurantId}_${date}`]);
      },
    },

    restaurantUpdated: {
      subscribe: (_: any, { restaurantId }: any) => {
        return pubsub.asyncIterator([`RESTAURANT_UPDATED_${restaurantId}`]);
      },
    },
  },

  Restaurant: {
    reviews: async (restaurant: any, { limit = 10, offset = 0, sortBy = 'RECENT' }: any) => {
      const order = sortBy === 'RATING' ? [['rating', 'DESC']] : [['createdAt', 'DESC']];
      
      const reviews = await restaurant.getReviews({
        limit: limit + 1,
        offset,
        order,
      });

      const hasMore = reviews.length > limit;
      const edges = reviews.slice(0, limit).map((review: any) => ({
        node: review,
        cursor: review.id,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: hasMore,
          hasPreviousPage: offset > 0,
        },
        totalCount: await restaurant.countReviews(),
      };
    },

    availableSlots: async (restaurant: any, { date, partySize, time }: any) => {
      return ReservationService.getAvailableSlots(
        restaurant.id,
        new Date(date),
        partySize,
        time
      );
    },

    similarRestaurants: async (restaurant: any, { limit = 5 }: any) => {
      return RecommendationService.getSimilarRestaurants(restaurant.id, limit);
    },

    isFavorited: async (restaurant: any, _: any, { user }: AuthContext) => {
      if (!user) return false;
      // Check favorites table
      return false; // Simplified
    },

    distance: async (restaurant: any, _: any, { userLocation }: AuthContext) => {
      if (!userLocation || !restaurant.latitude || !restaurant.longitude) {
        return null;
      }

      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (restaurant.latitude - userLocation.latitude) * Math.PI / 180;
      const dLon = (restaurant.longitude - userLocation.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(userLocation.latitude * Math.PI / 180) * 
        Math.cos(restaurant.latitude * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    },
  },
};