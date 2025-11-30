import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatePicker from 'react-native-date-picker';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { restaurantApi, reservationApi } from '../../services/api';
import { RootStackParamList } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';

type BookReservationScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const BookReservationScreen: React.FC = () => {
  const navigation = useNavigation<BookReservationScreenNavigationProp>();
  const route = useRoute();
  const { restaurantId } = route.params as { restaurantId: string };

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [partySize, setPartySize] = useState(2);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [occasionType, setOccasionType] = useState('');

  const timeSlots = [
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  const partySizes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const occasions = [
    '', 'Birthday', 'Anniversary', 'Date Night', 'Business Dinner',
    'Family Gathering', 'Celebration', 'Other'
  ];

  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => restaurantApi.getRestaurantById(restaurantId),
  });

  const { data: availability, isLoading: availabilityLoading, refetch: checkAvailability } = useQuery({
    queryKey: ['availability', restaurantId, selectedDate, selectedTime, partySize],
    queryFn: () => {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      return restaurantApi.getRestaurantAvailability(restaurantId, dateString, selectedTime, partySize);
    },
    enabled: !!restaurantId,
  });

  const createReservationMutation = useMutation({
    mutationFn: (reservationData: any) => reservationApi.createReservation(reservationData),
    onSuccess: (data) => {
      navigation.navigate('ReservationConfirmation', { reservationId: data.reservation.id });
    },
    onError: (error: any) => {
      Alert.alert('Reservation Failed', error.message || 'Unable to create reservation');
    },
  });

  useEffect(() => {
    checkAvailability();
  }, [selectedDate, selectedTime, partySize]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    const maxDate = addDays(today, 60); // 60 days in advance
    return isBefore(date, today) || isAfter(date, maxDate);
  };

  const handleReservation = () => {
    if (!availability?.available) {
      Alert.alert('Not Available', 'This time slot is not available. Please select a different time.');
      return;
    }

    const reservationData = {
      restaurantId,
      dateTime: new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`),
      partySize,
      specialRequests: specialRequests.trim() || undefined,
      dietaryRestrictions: dietaryRestrictions.trim() || undefined,
      occasionType: occasionType || undefined,
    };

    createReservationMutation.mutate(reservationData);
  };

  if (restaurantLoading) {
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
        {/* Restaurant Header */}
        <View style={styles.restaurantHeader}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text style={styles.restaurantInfo}>
            {restaurant.cuisineType} • {restaurant.city}
          </Text>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="event" size={20} color="#e91e63" />
            <Text style={styles.dateButtonText}>
              {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
            </Text>
            <Icon name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Party Size */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Party Size</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.partySizeContainer}>
            {partySizes.map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.partySizeButton,
                  partySize === size && styles.partySizeButtonSelected
                ]}
                onPress={() => setPartySize(size)}
              >
                <Text style={[
                  styles.partySizeText,
                  partySize === size && styles.partySizeTextSelected
                ]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Time</Text>
            {availabilityLoading && (
              <Text style={styles.checkingText}>Checking availability...</Text>
            )}
          </View>
          <View style={styles.timeSlotsContainer}>
            {timeSlots.map(time => {
              const isSelected = selectedTime === time;
              const isAvailable = availability?.availableSlots?.includes(time);
              
              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    isSelected && styles.timeSlotSelected,
                    !isAvailable && styles.timeSlotUnavailable
                  ]}
                  onPress={() => setSelectedTime(time)}
                  disabled={!isAvailable}
                >
                  <Text style={[
                    styles.timeSlotText,
                    isSelected && styles.timeSlotTextSelected,
                    !isAvailable && styles.timeSlotTextUnavailable
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Occasion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Occasion (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.occasionContainer}>
            {occasions.map(occasion => (
              <TouchableOpacity
                key={occasion || 'none'}
                style={[
                  styles.occasionChip,
                  occasionType === occasion && styles.occasionChipSelected
                ]}
                onPress={() => setOccasionType(occasion)}
              >
                <Text style={[
                  styles.occasionChipText,
                  occasionType === occasion && styles.occasionChipTextSelected
                ]}>
                  {occasion || 'None'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Special Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Requests (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., window table, quiet area, high chair needed..."
            value={specialRequests}
            onChangeText={setSpecialRequests}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Dietary Restrictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Restrictions (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., vegetarian, gluten-free, nut allergy..."
            value={dietaryRestrictions}
            onChangeText={setDietaryRestrictions}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        {/* Reservation Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Reservation Summary</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Restaurant:</Text>
            <Text style={styles.summaryValue}>{restaurant.name}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Date & Time:</Text>
            <Text style={styles.summaryValue}>
              {format(selectedDate, 'MMM dd, yyyy')} at {selectedTime}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Party Size:</Text>
            <Text style={styles.summaryValue}>
              {partySize} {partySize === 1 ? 'guest' : 'guests'}
            </Text>
          </View>
          {occasionType && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Occasion:</Text>
              <Text style={styles.summaryValue}>{occasionType}</Text>
            </View>
          )}
        </View>

        {/* Availability Status */}
        {availability && (
          <View style={[
            styles.availabilityStatus,
            availability.available ? styles.availableStatus : styles.unavailableStatus
          ]}>
            <Icon
              name={availability.available ? 'check-circle' : 'cancel'}
              size={20}
              color={availability.available ? '#4caf50' : '#f44336'}
            />
            <Text style={[
              styles.availabilityText,
              { color: availability.available ? '#4caf50' : '#f44336' }
            ]}>
              {availability.available ? 'Available' : 'Not Available'}
            </Text>
          </View>
        )}

        {/* Reserve Button */}
        <TouchableOpacity
          style={[
            styles.reserveButton,
            (!availability?.available || createReservationMutation.isPending) && styles.reserveButtonDisabled
          ]}
          onPress={handleReservation}
          disabled={!availability?.available || createReservationMutation.isPending}
        >
          <Text style={styles.reserveButtonText}>
            {createReservationMutation.isPending ? 'Creating Reservation...' : 'Confirm Reservation'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePicker
        modal
        open={showDatePicker}
        date={selectedDate}
        mode="date"
        onConfirm={handleDateChange}
        onCancel={() => setShowDatePicker(false)}
        minimumDate={new Date()}
        maximumDate={addDays(new Date(), 60)}
      />
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
  restaurantHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  restaurantInfo: {
    fontSize: 16,
    color: '#666666',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  checkingText: {
    fontSize: 12,
    color: '#e91e63',
    fontStyle: 'italic',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
  },
  partySizeContainer: {
    flexDirection: 'row',
  },
  partySizeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  partySizeButtonSelected: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  partySizeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  partySizeTextSelected: {
    color: '#ffffff',
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 70,
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  timeSlotUnavailable: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  timeSlotTextSelected: {
    color: '#ffffff',
  },
  timeSlotTextUnavailable: {
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  occasionContainer: {
    flexDirection: 'row',
  },
  occasionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  occasionChipSelected: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  occasionChipText: {
    fontSize: 14,
    color: '#333333',
  },
  occasionChipTextSelected: {
    color: '#ffffff',
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333333',
    minHeight: 80,
  },
  summarySection: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  availabilityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 20,
    borderRadius: 12,
  },
  availableStatus: {
    backgroundColor: '#f0f8ff',
  },
  unavailableStatus: {
    backgroundColor: '#fff5f5',
  },
  availabilityText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reserveButton: {
    backgroundColor: '#e91e63',
    margin: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  reserveButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  reserveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default BookReservationScreen;