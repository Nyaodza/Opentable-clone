import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import { reservationApi } from '../../services/api';
import { Reservation, RootStackParamList } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';

type ReservationsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const ReservationsScreen: React.FC = () => {
  const navigation = useNavigation<ReservationsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const { data: reservationsData, isLoading, refetch } = useQuery({
    queryKey: ['myReservations', selectedTab],
    queryFn: () => reservationApi.getMyReservations({
      upcoming: selectedTab === 'upcoming' ? 'true' : 'false'
    }),
  });

  const cancelReservationMutation = useMutation({
    mutationFn: (reservationId: string) => reservationApi.cancelReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
      Alert.alert('Success', 'Reservation cancelled successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to cancel reservation');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCancelReservation = (reservation: Reservation) => {
    const canCancel = isAfter(new Date(reservation.dateTime), new Date());
    
    if (!canCancel) {
      Alert.alert('Cannot Cancel', 'You cannot cancel past reservations');
      return;
    }

    Alert.alert(
      'Cancel Reservation',
      `Are you sure you want to cancel your reservation at ${reservation.restaurant.name}?`,
      [
        { text: 'Keep Reservation', style: 'cancel' },
        {
          text: 'Cancel Reservation',
          style: 'destructive',
          onPress: () => cancelReservationMutation.mutate(reservation.id),
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#4caf50';
      case 'pending':
        return '#ff9800';
      case 'cancelled':
        return '#f44336';
      case 'completed':
        return '#2196f3';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'check-circle';
      case 'pending':
        return 'schedule';
      case 'cancelled':
        return 'cancel';
      case 'completed':
        return 'check-circle-outline';
      default:
        return 'help';
    }
  };

  const canWriteReview = (reservation: Reservation) => {
    return reservation.status === 'completed' && 
           isBefore(new Date(reservation.dateTime), new Date());
  };

  const canModify = (reservation: Reservation) => {
    return reservation.status === 'confirmed' && 
           isAfter(new Date(reservation.dateTime), new Date());
  };

  const renderReservationItem = ({ item }: { item: Reservation }) => (
    <TouchableOpacity
      style={styles.reservationCard}
      onPress={() => navigation.navigate('RestaurantDetails', { restaurantId: item.restaurantId })}
    >
      <View style={styles.cardHeader}>
        <Image
          source={{
            uri: item.restaurant.images?.[0] || 'https://via.placeholder.com/80x80?text=Restaurant'
          }}
          style={styles.restaurantImage}
        />
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{item.restaurant.name}</Text>
          <Text style={styles.restaurantCuisine}>{item.restaurant.cuisineType}</Text>
          <View style={styles.statusContainer}>
            <Icon
              name={getStatusIcon(item.status)}
              size={16}
              color={getStatusColor(item.status)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.reservationDetails}>
        <View style={styles.detailRow}>
          <Icon name="event" size={16} color="#666" />
          <Text style={styles.detailText}>
            {format(new Date(item.dateTime), 'EEEE, MMM dd, yyyy')}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="schedule" size={16} color="#666" />
          <Text style={styles.detailText}>
            {format(new Date(item.dateTime), 'h:mm a')}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="people" size={16} color="#666" />
          <Text style={styles.detailText}>
            {item.partySize} {item.partySize === 1 ? 'guest' : 'guests'}
          </Text>
        </View>
        {item.confirmationCode && (
          <View style={styles.detailRow}>
            <Icon name="confirmation-number" size={16} color="#666" />
            <Text style={styles.detailText}>#{item.confirmationCode}</Text>
          </View>
        )}
      </View>

      {item.specialRequests && (
        <View style={styles.specialRequests}>
          <Text style={styles.specialRequestsTitle}>Special Requests:</Text>
          <Text style={styles.specialRequestsText}>{item.specialRequests}</Text>
        </View>
      )}

      <View style={styles.cardActions}>
        {canModify(item) && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => navigation.navigate('EditReservation', { reservationId: item.id })}
            >
              <Icon name="edit" size={16} color="#2196f3" />
              <Text style={[styles.actionButtonText, { color: '#2196f3' }]}>
                Modify
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelReservation(item)}
            >
              <Icon name="cancel" size={16} color="#f44336" />
              <Text style={[styles.actionButtonText, { color: '#f44336' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </>
        )}
        
        {canWriteReview(item) && (
          <TouchableOpacity
            style={[styles.actionButton, styles.reviewButton]}
            onPress={() => navigation.navigate('WriteReview', { 
              restaurantId: item.restaurantId,
              reservationId: item.id 
            })}
          >
            <Icon name="rate-review" size={16} color="#e91e63" />
            <Text style={[styles.actionButtonText, { color: '#e91e63' }]}>
              Write Review
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.detailsButton]}
          onPress={() => navigation.navigate('RestaurantDetails', { restaurantId: item.restaurantId })}
        >
          <Icon name="info" size={16} color="#666" />
          <Text style={[styles.actionButtonText, { color: '#666' }]}>
            Details
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon 
        name={selectedTab === 'upcoming' ? 'event-available' : 'history'} 
        size={64} 
        color="#ccc" 
      />
      <Text style={styles.emptyTitle}>
        No {selectedTab} reservations
      </Text>
      <Text style={styles.emptySubtitle}>
        {selectedTab === 'upcoming' 
          ? "When you make a reservation, it will appear here"
          : "Your past dining experiences will show up here"
        }
      </Text>
      {selectedTab === 'upcoming' && (
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={styles.exploreButtonText}>Explore Restaurants</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reservations</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('Search')}
        >
          <Icon name="add" size={24} color="#e91e63" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'upcoming' && styles.activeTab]}
          onPress={() => setSelectedTab('upcoming')}
        >
          <Text style={[styles.tabText, selectedTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'past' && styles.activeTab]}
          onPress={() => setSelectedTab('past')}
        >
          <Text style={[styles.tabText, selectedTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={reservationsData?.reservations || []}
          renderItem={renderReservationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.reservationsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#e91e63']}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    margin: 16,
    borderRadius: 8,
    padding: 4,
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
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  activeTabText: {
    color: '#e91e63',
  },
  reservationsList: {
    padding: 16,
  },
  reservationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  restaurantImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  reservationDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
  },
  specialRequests: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  specialRequestsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  specialRequestsText: {
    fontSize: 14,
    color: '#333333',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  editButton: {
    borderColor: '#2196f3',
    backgroundColor: '#f3f9ff',
  },
  cancelButton: {
    borderColor: '#f44336',
    backgroundColor: '#fff5f5',
  },
  reviewButton: {
    borderColor: '#e91e63',
    backgroundColor: '#fff0f5',
  },
  detailsButton: {
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#e91e63',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ReservationsScreen;