import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Restaurant } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress?: () => void;
  style?: any;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onPress, style }) => {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Icon key={i} name="star" size={14} color="#ffc107" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Icon key="half" name="star-half" size={14} color="#ffc107" />
      );
    }
    
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Icon key={`empty-${i}`} name="star-border" size={14} color="#e0e0e0" />
      );
    }
    
    return stars;
  };

  const getPriceRangeDisplay = (priceRange: string) => {
    switch (priceRange) {
      case 'budget':
        return '$';
      case 'moderate':
        return '$$';
      case 'expensive':
        return '$$$';
      case 'luxury':
        return '$$$$';
      default:
        return '$$';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: restaurant.images?.[0] || 'https://via.placeholder.com/300x200?text=Restaurant'
          }}
          style={styles.image}
          resizeMode="cover"
        />
        {restaurant.distance && (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>
              {restaurant.distance.toFixed(1)} mi
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {restaurant.name}
        </Text>
        
        <Text style={styles.cuisine} numberOfLines={1}>
          {restaurant.cuisineType}
        </Text>
        
        <View style={styles.ratingContainer}>
          <View style={styles.stars}>
            {renderStars(restaurant.averageRating)}
          </View>
          <Text style={styles.ratingText}>
            {restaurant.averageRating.toFixed(1)}
          </Text>
          <Text style={styles.reviewCount}>
            ({restaurant.totalReviews})
          </Text>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.locationContainer}>
            <Icon name="location-on" size={14} color="#666" />
            <Text style={styles.location} numberOfLines={1}>
              {restaurant.city}, {restaurant.state}
            </Text>
          </View>
          <Text style={styles.priceRange}>
            {getPriceRangeDisplay(restaurant.priceRange)}
          </Text>
        </View>
        
        {restaurant.features && restaurant.features.length > 0 && (
          <View style={styles.featuresContainer}>
            {restaurant.features.slice(0, 2).map((feature, index) => (
              <View key={index} style={styles.featureBadge}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  cuisine: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#666666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  location: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
    flex: 1,
  },
  priceRange: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e91e63',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  featureBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featureText: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '500',
  },
});

export default RestaurantCard;