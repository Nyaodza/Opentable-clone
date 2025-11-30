import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatePicker from 'react-native-date-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, isAfter, startOfDay } from 'date-fns';
import { reservationApi, restaurantApi } from '../../services/api';
import { RootStackParamList } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';

type EditReservationScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const EditReservationScreen: React.FC = () => {
  const navigation = useNavigation<EditReservationScreenNavigationProp>();
  const route = useRoute();
  const { reservationId } = route.params as { reservationId: string };
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [partySize, setPartySize] = useState(2);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const timeSlots = [
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  const partySizes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const { data: reservation, isLoading } = useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: () => reservationApi.getReservationById(reservationId),
  });

  const { data: availability, isLoading: availabilityLoading, refetch: checkAvailability } = useQuery({
    queryKey: ['availability', reservation?.restaurantId, selectedDate, selectedTime, partySize],
    queryFn: () => {
      if (!reservation) return null;
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      return restaurantApi.getRestaurantAvailability(reservation.restaurantId, dateString, selectedTime, partySize);
    },
    enabled: !!reservation,
  });

  const updateReservationMutation = useMutation({
    mutationFn: (data: any) => reservationApi.updateReservation(reservationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation', reservationId] });
      Alert.alert('Success', 'Your reservation has been updated!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Update Failed', error.message || 'Unable to update reservation');
    },
  });

  useEffect(() => {
    if (reservation) {
      const reservationDate = new Date(reservation.dateTime);
      setSelectedDate(reservationDate);
      setSelectedTime(format(reservationDate, 'HH:mm'));
      setPartySize(reservation.partySize);
      setSpecialRequests(reservation.specialRequests || '');
    }
  }, [reservation]);

  useEffect(() => {
    if (reservation) {
      const originalDate = new Date(reservation.dateTime);
      const originalTime = format(originalDate, 'HH:mm');
      
      const hasDateTimeChange = 
        format(selectedDate, 'yyyy-MM-dd') !== format(originalDate, 'yyyy-MM-dd') ||
        selectedTime !== originalTime;
      
      const hasPartySizeChange = partySize !== reservation.partySize;
      const hasRequestsChange = specialRequests !== (reservation.specialRequests || '');
      
      setHasChanges(hasDateTimeChange || hasPartySizeChange || hasRequestsChange);
    }
  }, [selectedDate, selectedTime, partySize, specialRequests, reservation]);

  useEffect(() => {
    if (hasChanges) {
      checkAvailability();
    }
  }, [selectedDate, selectedTime, partySize, hasChanges]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const canModifyReservation = () => {
    if (!reservation) return false;
    
    // Can only modify confirmed reservations
    if (reservation.status !== 'confirmed') return false;
    
    // Can only modify future reservations (at least 2 hours in advance)
    const hoursUntilReservation = (new Date(reservation.dateTime).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilReservation >= 2;
  };

  const handleSaveChanges = () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    if (!availability?.available) {
      Alert.alert('Not Available', 'The selected time is not available. Please choose a different time.');
      return;
    }

    const updatedData: any = {};

    // Check what changed
    const originalDate = new Date(reservation!.dateTime);
    const originalTime = format(originalDate, 'HH:mm');
    
    if (format(selectedDate, 'yyyy-MM-dd') !== format(originalDate, 'yyyy-MM-dd') || selectedTime !== originalTime) {
      updatedData.dateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`);
    }
    
    if (partySize !== reservation!.partySize) {
      updatedData.partySize = partySize;
    }
    
    if (specialRequests !== (reservation!.specialRequests || '')) {
      updatedData.specialRequests = specialRequests.trim() || undefined;
    }

    updateReservationMutation.mutate(updatedData);
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!reservation) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Reservation not found</Text>
      </SafeAreaView>
    );
  }

  if (!canModifyReservation()) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="lock" size={64} color="#f44336" />
          <Text style={styles.errorTitle}>Cannot Modify</Text>
          <Text style={styles.errorText}>
            This reservation cannot be modified. Reservations can only be modified at least 2 hours in advance.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Reservation</Text>
        <TouchableOpacity
          style={[styles.saveButton, (!hasChanges || !availability?.available) && styles.saveButtonDisabled]}
          onPress={handleSaveChanges}
          disabled={!hasChanges || !availability?.available || updateReservationMutation.isPending}
        >
          <Text style={[styles.saveButtonText, (!hasChanges || !availability?.available) && styles.saveButtonTextDisabled]}>
            {updateReservationMutation.isPending ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Restaurant Info */}
        <View style={styles.restaurantHeader}>
          <Text style={styles.restaurantName}>{reservation.restaurant.name}</Text>
          <Text style={styles.confirmationCode}>#{reservation.confirmationCode}</Text>
        </View>

        {/* Current vs New Comparison */}
        {hasChanges && (
          <View style={styles.changesPreview}>
            <Text style={styles.changesTitle}>Changes Preview</Text>
            
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonColumn}>
                <Text style={styles.comparisonLabel}>Current</Text>
                <Text style={styles.comparisonValue}>
                  {format(new Date(reservation.dateTime), 'MMM dd, yyyy • h:mm a')}
                </Text>
                <Text style={styles.comparisonValue}>
                  {reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'}
                </Text>
              </View>
              
              <Icon name="arrow-forward" size={20} color="#666" />
              
              <View style={styles.comparisonColumn}>
                <Text style={styles.comparisonLabel}>New</Text>
                <Text style={styles.comparisonValue}>
                  {format(selectedDate, 'MMM dd, yyyy')} • {selectedTime}
                </Text>
                <Text style={styles.comparisonValue}>
                  {partySize} {partySize === 1 ? 'guest' : 'guests'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
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
            <Text style={styles.sectionTitle}>Time</Text>
            {availabilityLoading && hasChanges && (
              <Text style={styles.checkingText}>Checking availability...</Text>
            )}
          </View>
          <View style={styles.timeSlotsContainer}>
            {timeSlots.map(time => {
              const isSelected = selectedTime === time;
              const isAvailable = availability?.availableSlots?.includes(time) || !hasChanges;
              
              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    isSelected && styles.timeSlotSelected,
                    !isAvailable && styles.timeSlotUnavailable
                  ]}
                  onPress={() => setSelectedTime(time)}
                  disabled={!isAvailable && hasChanges}
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

        {/* Special Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Requests</Text>
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

        {/* Availability Status */}
        {hasChanges && availability && (
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

        {/* Warning about modification policy */}
        <View style={styles.policyContainer}>
          <Icon name="info" size={16} color="#666" />
          <Text style={styles.policyText}>
            Reservations can be modified up to 2 hours before the scheduled time. 
            Changes are subject to availability.
          </Text>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e91e63',
    borderRadius: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  saveButtonTextDisabled: {
    color: '#999999',
  },
  scrollView: {
    flex: 1,
  },
  restaurantHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  confirmationCode: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'monospace',
  },
  changesPreview: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  changesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comparisonColumn: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  comparisonValue: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
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
  policyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9f9f9',
    padding: 16,
    margin: 20,
    borderRadius: 12,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
    marginLeft: 8,
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
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: '#e91e63',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default EditReservationScreen;