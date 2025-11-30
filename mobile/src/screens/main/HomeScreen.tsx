import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceRange: string;
  image: string;
  distance?: number;
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<Restaurant[]>([]);
  const [featuredRestaurants, setFeaturedRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Mock data - replace with API calls
    setNearbyRestaurants([
      {
        id: '1',
        name: 'The French Laundry',
        cuisine: 'French',
        rating: 4.9,
        priceRange: '$$$$',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
        distance: 2.5,
      },
      {
        id: '2',
        name: 'Nobu',
        cuisine: 'Japanese',
        rating: 4.7,
        priceRange: '$$$',
        image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
        distance: 1.2,
      },
    ]);

    setFeaturedRestaurants([
      {
        id: '3',
        name: 'Per Se',
        cuisine: 'Contemporary',
        rating: 4.8,
        priceRange: '$$$$',
        image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Evening</Text>
        <Text style={styles.subtitle}>Find your perfect dining experience</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF6B35' }]}
          onPress={() => navigation.navigate('DineNow' as never)}
        >
          <Text style={styles.actionIcon}>⚡</Text>
          <Text style={styles.actionText}>Dine Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#4A90E2' }]}
          onPress={() => navigation.navigate('Search' as never)}
        >
          <Text style={styles.actionIcon}>🔍</Text>
          <Text style={styles.actionText}>Search</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#7B68EE' }]}
          onPress={() => navigation.navigate('Favorites' as never)}
        >
          <Text style={styles.actionIcon}>❤️</Text>
          <Text style={styles.actionText}>Favorites</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#50C878' }]}
          onPress={() => navigation.navigate('Reservations' as never)}
        >
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionText}>Bookings</Text>
        </TouchableOpacity>
      </View>

      {/* Nearby Restaurants */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
          {nearbyRestaurants.map((restaurant) => (
            <TouchableOpacity
              key={restaurant.id}
              style={styles.card}
              onPress={() =>
                navigation.navigate('RestaurantDetail' as never, { id: restaurant.id } as never)
              }
            >
              <Image source={{ uri: restaurant.image }} style={styles.cardImage} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{restaurant.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {restaurant.cuisine} • {restaurant.priceRange}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.rating}>⭐ {restaurant.rating}</Text>
                  {restaurant.distance && (
                    <Text style={styles.distance}>{restaurant.distance} km</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Featured Restaurants */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>

        {featuredRestaurants.map((restaurant) => (
          <TouchableOpacity
            key={restaurant.id}
            style={styles.listItem}
            onPress={() =>
              navigation.navigate('RestaurantDetail' as never, { id: restaurant.id } as never)
            }
          >
            <Image source={{ uri: restaurant.image }} style={styles.listImage} />
            <View style={styles.listContent}>
              <Text style={styles.listTitle}>{restaurant.name}</Text>
              <Text style={styles.listSubtitle}>
                {restaurant.cuisine} • {restaurant.priceRange}
              </Text>
              <Text style={styles.rating}>⭐ {restaurant.rating}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cuisines */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Cuisines</Text>
        <View style={styles.cuisineGrid}>
          {['Italian', 'Japanese', 'Mexican', 'American', 'Chinese', 'Thai'].map((cuisine) => (
            <TouchableOpacity key={cuisine} style={styles.cuisineButton}>
              <Text style={styles.cuisineText}>{cuisine}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  seeAll: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  carousel: {
    marginLeft: -16,
    paddingLeft: 16,
  },
  card: {
    width: 280,
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rating: {
    fontSize: 14,
    color: '#FFB800',
  },
  distance: {
    fontSize: 14,
    color: '#999',
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listImage: {
    width: 100,
    height: 100,
  },
  listContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  listSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  cuisineButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cuisineText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
});
