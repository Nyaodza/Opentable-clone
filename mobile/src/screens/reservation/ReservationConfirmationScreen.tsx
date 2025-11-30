import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { reservationApi } from '../../services/api';
import { RootStackParamList } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';

type ReservationConfirmationScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const ReservationConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<ReservationConfirmationScreenNavigationProp>();
  const route = useRoute();
  const { reservationId } = route.params as { reservationId: string };
  const queryClient = useQueryClient();

  const { data: reservation, isLoading } = useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: () => reservationApi.getReservationById(reservationId),
  });

  const cancelReservationMutation = useMutation({
    mutationFn: () => reservationApi.cancelReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
      Alert.alert('Cancelled', 'Your reservation has been cancelled', [
        { text: 'OK', onPress: () => navigation.navigate('MainTabs') }
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to cancel reservation');
    },
  });

  useEffect(() => {
    // Mark as read in notifications
    // Could trigger analytics event here
  }, []);

  const handleCall = () => {
    if (reservation?.restaurant.phone) {
      Linking.openURL(`tel:${reservation.restaurant.phone}`);
    }
  };

  const handleDirections = () => {
    if (reservation?.restaurant) {
      const restaurant = reservation.restaurant;
      const url = `maps://app?daddr=${restaurant.latitude},${restaurant.longitude}`;
      Linking.openURL(url).catch(() => {
        const fallbackUrl = `https://maps.google.com/maps?daddr=${restaurant.latitude},${restaurant.longitude}`;
        Linking.openURL(fallbackUrl);
      });
    }
  };

  const handleModifyReservation = () => {
    navigation.navigate('EditReservation', { reservationId });
  };

  const handleCancelReservation = () => {
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel this reservation? This action cannot be undone.',
      [
        { text: 'Keep Reservation', style: 'cancel' },
        {
          text: 'Cancel Reservation',
          style: 'destructive',
          onPress: () => cancelReservationMutation.mutate(),
        },
      ]
    );
  };

  const handleAddToCalendar = () => {
    if (reservation) {
      const startDate = format(new Date(reservation.dateTime), "yyyyMMdd'T'HHmmss");
      const endDate = format(new Date(new Date(reservation.dateTime).getTime() + 2 * 60 * 60 * 1000), "yyyyMMdd'T'HHmmss");
      const title = encodeURIComponent(`Dinner at ${reservation.restaurant.name}`);
      const details = encodeURIComponent(`Reservation for ${reservation.partySize} at ${reservation.restaurant.name}`);
      const location = encodeURIComponent(`${reservation.restaurant.address}, ${reservation.restaurant.city}`);
      
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
      
      Linking.openURL(calendarUrl);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!reservation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#f44336" />
          <Text style={styles.errorTitle}>Reservation Not Found</Text>
          <Text style={styles.errorText}>We couldn't find your reservation.</Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.homeButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIcon}>
            <Icon name="check-circle" size={64} color="#4caf50" />
          </View>
          <Text style={styles.successTitle}>Reservation Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            We've sent you a confirmation email with all the details.
          </Text>
        </View>

        {/* Reservation Details Card */}
        <View style={styles.reservationCard}>
          <View style={styles.restaurantInfo}>
            <Image
              source={{
                uri: reservation.restaurant.images?.[0] || 'https://via.placeholder.com/80x80?text=Restaurant'
              }}
              style={styles.restaurantImage}
            />
            <View style={styles.restaurantDetails}>
              <Text style={styles.restaurantName}>{reservation.restaurant.name}</Text>
              <Text style={styles.restaurantCuisine}>{reservation.restaurant.cuisineType}</Text>
              <View style={styles.ratingContainer}>
                <Icon name="star" size={16} color="#ffc107" />
                <Text style={styles.ratingText}>
                  {reservation.restaurant.averageRating.toFixed(1)} ({reservation.restaurant.totalReviews} reviews)
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.reservationDetails}>
            <View style={styles.detailRow}>
              <Icon name="event" size={20} color="#e91e63" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {format(new Date(reservation.dateTime), 'EEEE, MMMM dd, yyyy')}
                </Text>
                <Text style={styles.detailValue}>
                  {format(new Date(reservation.dateTime), 'h:mm a')}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon name="people" size={20} color="#e91e63" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Party Size</Text>
                <Text style={styles.detailValue}>
                  {reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon name="confirmation-number" size={20} color="#e91e63" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Confirmation Code</Text>
                <Text style={styles.confirmationCode}>#{reservation.confirmationCode}</Text>
              </View>
            </View>

            {reservation.table && (
              <View style={styles.detailRow}>
                <Icon name="table-restaurant" size={20} color="#e91e63" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Table</Text>
                  <Text style={styles.detailValue}>Table {reservation.table.number}</Text>
                </View>
              </View>
            )}

            {reservation.occasionType && (
              <View style={styles.detailRow}>
                <Icon name="celebration" size={20} color="#e91e63" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Occasion</Text>
                  <Text style={styles.detailValue}>{reservation.occasionType}</Text>
                </View>
              </View>
            )}
          </View>

          {(reservation.specialRequests || reservation.dietaryRestrictions) && (
            <View style={styles.requestsSection}>
              <Text style={styles.requestsTitle}>Special Notes</Text>
              {reservation.specialRequests && (
                <View style={styles.requestItem}>
                  <Text style={styles.requestLabel}>Special Requests:</Text>
                  <Text style={styles.requestText}>{reservation.specialRequests}</Text>
                </View>
              )}
              {reservation.dietaryRestrictions && (
                <View style={styles.requestItem}>
                  <Text style={styles.requestLabel}>Dietary Restrictions:</Text>
                  <Text style={styles.requestText}>{reservation.dietaryRestrictions}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Restaurant Location */}
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>Restaurant Location</Text>
          <View style={styles.addressContainer}>
            <Icon name="location-on" size={20} color="#666" />
            <Text style={styles.addressText}>
              {reservation.restaurant.address}{'\n'}
              {reservation.restaurant.city}, {reservation.restaurant.state} {reservation.restaurant.zipCode}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
              <Icon name="phone" size={20} color="#e91e63" />
              <Text style={styles.contactButtonText}>Call Restaurant</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={handleDirections}>
              <Icon name="directions" size={20} color="#e91e63" />
              <Text style={styles.contactButtonText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.calendarButton} onPress={handleAddToCalendar}>
            <Icon name="event" size={20} color="#2196f3" />
            <Text style={styles.calendarButtonText}>Add to Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modifyButton} onPress={handleModifyReservation}>
            <Icon name="edit" size={20} color="#ff9800" />
            <Text style={styles.modifyButtonText}>Modify Reservation</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelReservation}>
            <Icon name="cancel" size={20} color="#f44336" />
            <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for your visit</Text>
          <View style={styles.tipItem}>
            <Icon name="schedule" size={16} color="#666" />
            <Text style={styles.tipText}>Arrive 10-15 minutes early for your reservation</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="phone" size={16} color="#666" />
            <Text style={styles.tipText}>Call ahead if you're running late</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="rate-review" size={16} color="#666" />
            <Text style={styles.tipText}>Don't forget to leave a review after your meal</Text>
          </View>
        </View>

        {/* Done Button */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  reservationCard: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  restaurantInfo: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  restaurantImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  reservationDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
    marginLeft: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  confirmationCode: {
    fontSize: 18,
    color: '#e91e63',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  requestsSection: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  requestsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  requestItem: {
    marginBottom: 8,
  },
  requestLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 2,
  },
  requestText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginLeft: 12,
  },
  contactInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e91e63',
    marginLeft: 6,
  },
  actionButtons: {
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  calendarButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2196f3',
    marginLeft: 8,
  },
  modifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  modifyButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ff9800',
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#f44336',
    marginLeft: 8,
  },
  tipsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    marginLeft: 12,
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: '#e91e63',
    marginHorizontal: 20,
    marginBottom: 40,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
  },
  homeButton: {
    backgroundColor: '#e91e63',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ReservationConfirmationScreen;