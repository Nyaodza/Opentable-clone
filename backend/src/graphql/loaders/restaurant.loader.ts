import DataLoader from 'dataloader';
import { Restaurant } from '../../models/restaurant.model';
import { Review } from '../../models/review.model';
import { User } from '../../models/user.model';

export class RestaurantLoader {
  restaurantById = new DataLoader<string, Restaurant | null>(
    async (ids) => {
      const restaurants = await Restaurant.findAll({
        where: { id: ids as string[] },
      });
      
      const restaurantMap = new Map(
        restaurants.map(r => [r.id, r])
      );
      
      return ids.map(id => restaurantMap.get(id) || null);
    },
    {
      cacheKeyFn: (key) => key,
      maxBatchSize: 100,
    }
  );

  reviewsByRestaurantId = new DataLoader<string, Review[]>(
    async (restaurantIds) => {
      const reviews = await Review.findAll({
        where: { restaurantId: restaurantIds as string[] },
        include: [User],
      });
      
      const reviewsMap = new Map<string, Review[]>();
      
      reviews.forEach(review => {
        const restaurantReviews = reviewsMap.get(review.restaurantId) || [];
        restaurantReviews.push(review);
        reviewsMap.set(review.restaurantId, restaurantReviews);
      });
      
      return restaurantIds.map(id => reviewsMap.get(id) || []);
    }
  );

  averageRatingByRestaurantId = new DataLoader<string, number>(
    async (restaurantIds) => {
      const restaurants = await Restaurant.findAll({
        where: { id: restaurantIds as string[] },
        attributes: ['id', 'averageRating'],
      });
      
      const ratingMap = new Map(
        restaurants.map(r => [r.id, r.averageRating])
      );
      
      return restaurantIds.map(id => ratingMap.get(id) || 0);
    }
  );

  totalReviewsByRestaurantId = new DataLoader<string, number>(
    async (restaurantIds) => {
      const restaurants = await Restaurant.findAll({
        where: { id: restaurantIds as string[] },
        attributes: ['id', 'totalReviews'],
      });
      
      const countMap = new Map(
        restaurants.map(r => [r.id, r.totalReviews])
      );
      
      return restaurantIds.map(id => countMap.get(id) || 0);
    }
  );

  clearAll() {
    this.restaurantById.clearAll();
    this.reviewsByRestaurantId.clearAll();
    this.averageRatingByRestaurantId.clearAll();
    this.totalReviewsByRestaurantId.clearAll();
  }
}