import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import { restaurantApi } from '../../services/api';
import { Restaurant, RootStackParamList, SearchFilters } from '../../types';
import RestaurantCard from '../../components/RestaurantCard';
import LoadingSpinner from '../../components/LoadingSpinner';

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const route = useRoute();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    cuisineType: '',
    priceRange: '',
    rating: 0,
    distance: 25,
    features: [],
    openNow: false,
  });

  const cuisineTypes = [
    'Italian', 'Japanese', 'Mexican', 'Indian', 'French', 'Chinese',
    'Thai', 'American', 'Mediterranean', 'Korean', 'Vietnamese', 'Spanish'
  ];

  const priceRanges = [
    { label: '$', value: 'budget' },
    { label: '$$', value: 'moderate' },
    { label: '$$$', value: 'expensive' },
    { label: '$$$$', value: 'luxury' }
  ];

  const features = [
    'Outdoor Seating', 'Parking Available', 'Wheelchair Accessible',
    'Live Music', 'Full Bar', 'Wine Bar', 'Private Dining',
    'Happy Hour', 'Brunch', 'Late Night', 'Delivery', 'Takeout'
  ];

  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ['searchRestaurants', searchQuery, filters],
    queryFn: () => {
      if (searchQuery.trim()) {
        return restaurantApi.searchRestaurants(searchQuery, filters);
      }
      return restaurantApi.getRestaurants({ ...filters, limit: 50 });
    },
  });

  useEffect(() => {
    // Apply initial filters from navigation params
    const params = route.params as any;
    if (params) {
      setFilters(prev => ({ ...prev, ...params }));
    }
  }, [route.params]);

  const handleSearch = () => {
    refetch();
  };

  const toggleFeature = (feature: string) => {
    setFilters(prev => ({
      ...prev,
      features: prev.features?.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...(prev.features || []), feature]
    }));
  };

  const clearFilters = () => {
    setFilters({
      cuisineType: '',
      priceRange: '',
      rating: 0,
      distance: 25,
      features: [],
      openNow: false,
    });
  };

  const renderRestaurantItem = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      style={styles.restaurantItem}
      onPress={() => navigation.navigate('RestaurantDetails', { restaurantId: item.id })}
    >
      <RestaurantCard restaurant={item} />
    </TouchableOpacity>
  );

  const renderMapView = () => (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
    >
      {searchResults?.restaurants?.map((restaurant: Restaurant) => (
        <Marker
          key={restaurant.id}
          coordinate={{
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
          }}
          title={restaurant.name}
          description={restaurant.cuisineType}
          onPress={() => navigation.navigate('RestaurantDetails', { restaurantId: restaurant.id })}
        />
      ))}
    </MapView>
  );

  const renderFiltersModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.filtersContainer}>
        <View style={styles.filtersHeader}>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.filtersTitle}>Filters</Text>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.filtersContent}>
          {/* Cuisine Type */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Cuisine Type</Text>
            <View style={styles.cuisineGrid}>
              {cuisineTypes.map(cuisine => (
                <TouchableOpacity
                  key={cuisine}
                  style={[
                    styles.cuisineChip,
                    filters.cuisineType === cuisine && styles.cuisineChipSelected
                  ]}
                  onPress={() => setFilters(prev => ({
                    ...prev,
                    cuisineType: prev.cuisineType === cuisine ? '' : cuisine
                  }))}
                >
                  <Text style={[
                    styles.cuisineChipText,
                    filters.cuisineType === cuisine && styles.cuisineChipTextSelected
                  ]}>
                    {cuisine}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            <View style={styles.priceGrid}>
              {priceRanges.map(price => (
                <TouchableOpacity
                  key={price.value}
                  style={[
                    styles.priceChip,
                    filters.priceRange === price.value && styles.priceChipSelected
                  ]}
                  onPress={() => setFilters(prev => ({
                    ...prev,
                    priceRange: prev.priceRange === price.value ? '' : price.value
                  }))}
                >
                  <Text style={[
                    styles.priceChipText,
                    filters.priceRange === price.value && styles.priceChipTextSelected
                  ]}>
                    {price.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Features */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Features</Text>
            <View style={styles.featuresGrid}>
              {features.map(feature => (
                <TouchableOpacity
                  key={feature}
                  style={[
                    styles.featureChip,
                    filters.features?.includes(feature) && styles.featureChipSelected
                  ]}
                  onPress={() => toggleFeature(feature)}
                >
                  <Text style={[
                    styles.featureChipText,
                    filters.features?.includes(feature) && styles.featureChipTextSelected
                  ]}>
                    {feature}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map(rating => (
                <TouchableOpacity
                  key={rating}
                  style={styles.starButton}
                  onPress={() => setFilters(prev => ({
                    ...prev,
                    rating: prev.rating === rating ? 0 : rating
                  }))}
                >
                  <Icon
                    name="star"
                    size={32}
                    color={rating <= (filters.rating || 0) ? '#ffc107' : '#e0e0e0'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.filtersFooter}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => {
              setShowFilters(false);
              handleSearch();
            }}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.searchActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowFilters(true)}
          >
            <Icon name="tune" size={20} color="#e91e63" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowMap(!showMap)}
          >
            <Icon name={showMap ? "view-list" : "map"} size={20} color="#e91e63" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Filters */}
      {(filters.cuisineType || filters.priceRange || (filters.features && filters.features.length > 0)) && (
        <ScrollView horizontal style={styles.activeFilters} showsHorizontalScrollIndicator={false}>
          {filters.cuisineType && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>{filters.cuisineType}</Text>
              <TouchableOpacity
                onPress={() => setFilters(prev => ({ ...prev, cuisineType: '' }))}
              >
                <Icon name="close" size={16} color="#e91e63" />
              </TouchableOpacity>
            </View>
          )}
          {filters.priceRange && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>
                {priceRanges.find(p => p.value === filters.priceRange)?.label}
              </Text>
              <TouchableOpacity
                onPress={() => setFilters(prev => ({ ...prev, priceRange: '' }))}
              >
                <Icon name="close" size={16} color="#e91e63" />
              </TouchableOpacity>
            </View>
          )}
          {filters.features?.map(feature => (
            <View key={feature} style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>{feature}</Text>
              <TouchableOpacity onPress={() => toggleFeature(feature)}>
                <Icon name="close" size={16} color="#e91e63" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Results */}
      {isLoading ? (
        <LoadingSpinner />
      ) : showMap ? (
        renderMapView()
      ) : (
        <FlatList
          data={searchResults?.restaurants || []}
          renderItem={renderRestaurantItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="search-off" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No restaurants found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
            </View>
          }
        />
      )}

      {renderFiltersModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    marginLeft: 8,
  },
  searchActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  activeFilters: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0f5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#e91e63',
    marginRight: 4,
  },
  map: {
    flex: 1,
  },
  resultsList: {
    padding: 16,
  },
  restaurantItem: {
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  filtersContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearText: {
    fontSize: 16,
    color: '#e91e63',
  },
  filtersContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterSection: {
    marginVertical: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cuisineChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cuisineChipSelected: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  cuisineChipText: {
    fontSize: 14,
    color: '#333',
  },
  cuisineChipTextSelected: {
    color: '#ffffff',
  },
  priceGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  priceChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  priceChipSelected: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  priceChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  priceChipTextSelected: {
    color: '#ffffff',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  featureChipSelected: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  featureChipText: {
    fontSize: 12,
    color: '#333',
  },
  featureChipTextSelected: {
    color: '#ffffff',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    marginRight: 8,
  },
  filtersFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  applyButton: {
    backgroundColor: '#e91e63',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default SearchScreen;