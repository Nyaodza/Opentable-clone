import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import Geolocation from 'react-native-geolocation-service';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { restaurantApi } from '../../services/api';
import { Restaurant, RootStackParamList } from '../../types';
import RestaurantCard from '../../components/RestaurantCard';
import LoadingSpinner from '../../components/LoadingSpinner';

type DiscoverScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation<DiscoverScreenNavigationProp>();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const cuisineTypes = [
    { name: 'Italian', icon: '🍝' },
    { name: 'Japanese', icon: '🍣' },
    { name: 'Mexican', icon: '🌮' },
    { name: 'Indian', icon: '🍛' },
    { name: 'French', icon: '🥐' },
    { name: 'Chinese', icon: '🥢' },
  ];

  const { data: featuredRestaurants, isLoading: loadingFeatured, refetch: refetchFeatured } = useQuery({
    queryKey: ['featuredRestaurants'],
    queryFn: () => restaurantApi.getRestaurants({ featured: true, limit: 10 }),
  });

  const { data: nearbyRestaurants, isLoading: loadingNearby, refetch: refetchNearby } = useQuery({
    queryKey: ['nearbyRestaurants', location],
    queryFn: () => {
      if (location) {
        return restaurantApi.getNearbyRestaurants(location.latitude, location.longitude, 10);
      }
      return restaurantApi.getRestaurants({ limit: 10 });
    },
  });

  const { data: topRatedRestaurants, isLoading: loadingTopRated, refetch: refetchTopRated } = useQuery({
    queryKey: ['topRatedRestaurants'],
    queryFn: () => restaurantApi.getRestaurants({ sortBy: 'rating', limit: 10 }),
  });

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const permission = await request(
        Platform.OS === 'ios' 
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      );
      
      if (permission === RESULTS.GRANTED) {
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Location error:', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchFeatured(),
      refetchNearby(),
      refetchTopRated(),
    ]);
    setRefreshing(false);
  };

  const renderCuisineType = ({ item }: { item: typeof cuisineTypes[0] }) => (
    <TouchableOpacity
      style={styles.cuisineCard}
      onPress={() => navigation.navigate('Search', { cuisineType: item.name })}
    >
      <Text style={styles.cuisineIcon}>{item.icon}</Text>
      <Text style={styles.cuisineName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderRestaurantItem = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      style={styles.restaurantItem}
      onPress={() => navigation.navigate('RestaurantDetails', { restaurantId: item.id })}
    >
      <RestaurantCard restaurant={item} />
    </TouchableOpacity>
  );

  if (loadingFeatured && loadingNearby && loadingTopRated) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good evening</Text>
            <Text style={styles.title}>Discover great places</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Icon name="notifications" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
        >
          <Icon name="search" size={20} color="#666" />
          <Text style={styles.searchPlaceholder}>Search restaurants...</Text>
        </TouchableOpacity>

        {/* Cuisine Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by cuisine</Text>
          <FlatList
            data={cuisineTypes}
            renderItem={renderCuisineType}
            keyExtractor={(item) => item.name}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cuisineList}
          />
        </View>

        {/* Featured Restaurants */}
        {featuredRestaurants?.restaurants && featuredRestaurants.restaurants.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Search', { featured: true })}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={featuredRestaurants.restaurants}
              renderItem={renderRestaurantItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.restaurantList}
            />
          </View>
        )}

        {/* Nearby Restaurants */}
        {nearbyRestaurants?.restaurants && nearbyRestaurants.restaurants.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {location ? 'Nearby' : 'Popular'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Search', { nearby: true })}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={nearbyRestaurants.restaurants}
              renderItem={renderRestaurantItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.restaurantList}
            />
          </View>
        )}

        {/* Top Rated */}
        {topRatedRestaurants?.restaurants && topRatedRestaurants.restaurants.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top rated</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Search', { sortBy: 'rating' })}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={topRatedRestaurants.restaurants}
              renderItem={renderRestaurantItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.restaurantList}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchPlaceholder: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666666',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  seeAll: {
    fontSize: 14,
    color: '#e91e63',
    fontWeight: '500',
  },
  cuisineList: {
    paddingHorizontal: 20,
  },
  cuisineCard: {
    alignItems: 'center',
    marginRight: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    minWidth: 80,
  },
  cuisineIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  cuisineName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
  restaurantList: {
    paddingHorizontal: 20,
  },
  restaurantItem: {
    marginRight: 16,
    width: width * 0.7,
  },
});

export default DiscoverScreen;