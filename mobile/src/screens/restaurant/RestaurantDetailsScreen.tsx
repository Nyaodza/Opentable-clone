import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import { restaurantApi, reviewApi, waitlistApi } from '../../services/api';
import { RootStackParamList, Review } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';

type RestaurantDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const RestaurantDetailsScreen: React.FC = () => {
  const navigation = useNavigation<RestaurantDetailsScreenNavigationProp>();
  const route = useRoute();
  const { restaurantId } = route.params as { restaurantId: string };
  const queryClient = useQueryClient();
  
  const [selectedTab, setSelectedTab] = useState<'overview' | 'reviews' | 'photos'>('overview');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => restaurantApi.getRestaurantById(restaurantId),
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['restaurantReviews', restaurantId],
    queryFn: () => reviewApi.getRestaurantReviews(restaurantId, { limit: 5 }),
  });

  const joinWaitlistMutation = useMutation({
    mutationFn: (data: any) => waitlistApi.joinWaitlist(data),
    onSuccess: () => {
      Alert.alert('Success', 'You have been added to the waitlist!');
      queryClient.invalidateQueries({ queryKey: ['myWaitlistEntries'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to join waitlist');
    },
  });

  const handleReservation = () => {
    navigation.navigate('BookReservation', { restaurantId });
  };

  const handleJoinWaitlist = () => {
    Alert.alert(
      'Join Waitlist',
      'Would you like to join the waitlist for this restaurant?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join Waitlist',
          onPress: () => {
            const today = new Date().toISOString().split('T')[0];
            joinWaitlistMutation.mutate({
              restaurantId,
              requestedDate: today,
              preferredTimeStart: '18:00',
              preferredTimeEnd: '20:00',
              partySize: 2,
            });
          },
        },
      ]
    );
  };

  const handleCall = () => {
    if (restaurant?.phone) {
      Linking.openURL(`tel:${restaurant.phone}`);
    }
  };

  const handleDirections = () => {
    if (restaurant) {
      const url = `maps://app?daddr=${restaurant.latitude},${restaurant.longitude}`;
      Linking.openURL(url).catch(() => {
        const fallbackUrl = `https://maps.google.com/maps?daddr=${restaurant.latitude},${restaurant.longitude}`;
        Linking.openURL(fallbackUrl);
      });
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Icon key={i} name="star" size={16} color="#ffc107" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Icon key="half" name="star-half" size={16} color="#ffc107" />);
    }
    
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Icon key={`empty-${i}`} name="star-border" size={16} color="#e0e0e0" />);
    }
    
    return stars;
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{restaurant?.description}</Text>
      </View>

      {/* Features */}
      {restaurant?.features && restaurant.features.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featuresContainer}>
            {restaurant.features.map((feature, index) => (
              <View key={index} style={styles.featureChip}>
                <Icon name="check" size={16} color="#4caf50" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <TouchableOpacity style={styles.addressContainer} onPress={handleDirections}>
          <Icon name="location-on" size={20} color="#e91e63" />
          <View style={styles.addressText}>
            <Text style={styles.address}>
              {restaurant?.address}, {restaurant?.city}, {restaurant?.state} {restaurant?.zipCode}
            </Text>
            <Text style={styles.directionsText}>Tap for directions</Text>
          </View>
        </TouchableOpacity>
        
        {restaurant && (
          <MapView
            style={styles.miniMap}
            region={{
              latitude: restaurant.latitude,
              longitude: restaurant.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: restaurant.latitude,
                longitude: restaurant.longitude,
              }}
              title={restaurant.name}
            />
          </MapView>
        )}
      </View>

      {/* Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
          <Icon name="phone" size={20} color="#e91e63" />
          <Text style={styles.contactText}>{restaurant?.phone}</Text>
        </TouchableOpacity>
        {restaurant?.website && (
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => Linking.openURL(restaurant.website!)}
          >
            <Icon name="language" size={20} color="#e91e63" />
            <Text style={styles.contactText}>{restaurant.website}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      {reviewsData?.reviews?.map((review: Review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewUser}>
              <Image
                source={{
                  uri: `https://ui-avatars.com/api/?name=${review.user.firstName}+${review.user.lastName}&background=e91e63&color=ffffff&size=40`,
                }}
                style={styles.reviewAvatar}
              />
              <View style={styles.reviewUserInfo}>
                <Text style={styles.reviewUserName}>
                  {review.user.firstName} {review.user.lastName}
                </Text>
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <View style={styles.reviewRating}>
              {renderStars(review.overallRating)}
            </View>
          </View>
          <Text style={styles.reviewComment}>{review.comment}</Text>
          {review.photos && review.photos.length > 0 && (
            <ScrollView horizontal style={styles.reviewPhotos}>
              {review.photos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.reviewPhoto}
                />
              ))}
            </ScrollView>
          )}
        </View>
      ))}
      
      <TouchableOpacity
        style={styles.seeAllReviewsButton}
        onPress={() => {/* Navigate to all reviews */}}
      >
        <Text style={styles.seeAllReviewsText}>See All Reviews</Text>
        <Icon name="chevron-right" size={20} color="#e91e63" />
      </TouchableOpacity>
    </View>
  );

  const renderPhotosTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.photosGrid}>
        {restaurant?.images?.map((image, index) => (
          <TouchableOpacity
            key={index}
            style={styles.photoItem}
            onPress={() => setSelectedImageIndex(index)}
          >
            <Image source={{ uri: image }} style={styles.photoImage} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Restaurant not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: restaurant.images?.[selectedImageIndex] || 'https://via.placeholder.com/400x250?text=Restaurant'
            }}
            style={styles.headerImage}
          />
          <View style={styles.imageOverlay}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.imageActions}>
              <TouchableOpacity style={styles.imageActionButton}>
                <Icon name="share" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageActionButton}>
                <Icon name="favorite-border" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Restaurant Info */}
        <View style={styles.restaurantInfo}>
          <View style={styles.titleSection}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <View style={styles.ratingContainer}>
              <View style={styles.stars}>
                {renderStars(restaurant.averageRating)}
              </View>
              <Text style={styles.ratingText}>
                {restaurant.averageRating.toFixed(1)} ({restaurant.totalReviews} reviews)
              </Text>
            </View>
          </View>

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Icon name="restaurant" size={16} color="#666" />
              <Text style={styles.metaText}>{restaurant.cuisineType}</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="attach-money" size={16} color="#666" />
              <Text style={styles.metaText}>
                {restaurant.priceRange === 'budget' && '$'}
                {restaurant.priceRange === 'moderate' && '$$'}
                {restaurant.priceRange === 'expensive' && '$$$'}
                {restaurant.priceRange === 'luxury' && '$$$$'}
              </Text>
            </View>
            {restaurant.distance && (
              <View style={styles.metaItem}>
                <Icon name="location-on" size={16} color="#666" />
                <Text style={styles.metaText}>{restaurant.distance.toFixed(1)} mi</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleReservation}>
            <Icon name="event" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Reserve Table</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleJoinWaitlist}>
            <Icon name="queue" size={20} color="#e91e63" />
            <Text style={styles.secondaryButtonText}>Join Waitlist</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
            onPress={() => setSelectedTab('overview')}
          >
            <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'reviews' && styles.activeTab]}
            onPress={() => setSelectedTab('reviews')}
          >
            <Text style={[styles.tabText, selectedTab === 'reviews' && styles.activeTabText]}>
              Reviews ({restaurant.totalReviews})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'photos' && styles.activeTab]}
            onPress={() => setSelectedTab('photos')}
          >
            <Text style={[styles.tabText, selectedTab === 'photos' && styles.activeTabText]}>
              Photos ({restaurant.images?.length || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'reviews' && renderReviewsTab()}
        {selectedTab === 'photos' && renderPhotosTab()}
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
  imageContainer: {
    position: 'relative',
  },
  headerImage: {
    width: width,
    height: 250,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  imageActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantInfo: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666666',
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e91e63',
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e91e63',
  },
  secondaryButtonText: {
    color: '#e91e63',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    marginHorizontal: 20,
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  activeTabText: {
    color: '#e91e63',
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666666',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featureText: {
    fontSize: 12,
    color: '#4caf50',
    marginLeft: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    marginLeft: 8,
  },
  address: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 2,
  },
  directionsText: {
    fontSize: 12,
    color: '#e91e63',
  },
  miniMap: {
    height: 150,
    borderRadius: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 8,
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  reviewDate: {
    fontSize: 12,
    color: '#666666',
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
    marginBottom: 8,
  },
  reviewPhotos: {
    flexDirection: 'row',
  },
  reviewPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  seeAllReviewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  seeAllReviewsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e91e63',
    marginRight: 4,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  photoItem: {
    width: (width - 48) / 3,
    height: (width - 48) / 3,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});

export default RestaurantDetailsScreen;