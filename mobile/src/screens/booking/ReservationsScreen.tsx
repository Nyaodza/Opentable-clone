import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface Reservation {
  id: string;
  restaurant: {
    id: string;
    name: string;
    image: string;
    address: string;
  };
  date: string;
  time: string;
  partySize: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  confirmationCode: string;
}

export default function ReservationsScreen() {
  const navigation = useNavigation();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReservations();
  }, [filter]);

  const loadReservations = async () => {
    try {
      // Mock data - replace with API call
      const mockData: Reservation[] = [
        {
          id: '1',
          restaurant: {
            id: '1',
            name: 'The French Laundry',
            image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
            address: '6640 Washington Street, Yountville, CA',
          },
          date: '2025-10-15',
          time: '19:00',
          partySize: 2,
          status: 'confirmed',
          confirmationCode: 'ABC123',
        },
        {
          id: '2',
          restaurant: {
            id: '2',
            name: 'Nobu',
            image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
            address: '757 9th Ave, New York, NY',
          },
          date: '2025-10-20',
          time: '20:30',
          partySize: 4,
          status: 'confirmed',
          confirmationCode: 'XYZ789',
        },
      ];

      setReservations(mockData);
    } catch (error) {
      console.error('Failed to load reservations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReservations();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#50C878';
      case 'pending':
        return '#FFB800';
      case 'cancelled':
        return '#FF6B6B';
      case 'completed':
        return '#999';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reservations</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'past' && styles.filterTabActive]}
          onPress={() => setFilter('past')}
        >
          <Text style={[styles.filterText, filter === 'past' && styles.filterTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reservations List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {reservations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No Reservations</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'upcoming'
                ? 'Book your next dining experience'
                : 'Your past reservations will appear here'}
            </Text>
            {filter === 'upcoming' && (
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => navigation.navigate('Home' as never)}
              >
                <Text style={styles.bookButtonText}>Find Restaurants</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          reservations.map((reservation) => (
            <TouchableOpacity
              key={reservation.id}
              style={styles.reservationCard}
              onPress={() =>
                navigation.navigate('ReservationDetail' as never, { id: reservation.id } as never)
              }
            >
              <View style={styles.cardLeft}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateMonth}>
                    {new Date(reservation.date).toLocaleDateString('en-US', { month: 'short' })}
                  </Text>
                  <Text style={styles.dateDay}>
                    {new Date(reservation.date).getDate()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.restaurantName}>{reservation.restaurant.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(reservation.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{getStatusText(reservation.status)}</Text>
                  </View>
                </View>

                <Text style={styles.address} numberOfLines={1}>
                  {reservation.restaurant.address}
                </Text>

                <View style={styles.details}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>🕐</Text>
                    <Text style={styles.detailText}>{reservation.time}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>👥</Text>
                    <Text style={styles.detailText}>
                      {reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>🎫</Text>
                    <Text style={styles.detailText}>{reservation.confirmationCode}</Text>
                  </View>
                </View>

                {reservation.status === 'confirmed' && (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Modify</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]}>
                      <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#4A90E2',
  },
  filterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  bookButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reservationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLeft: {
    width: 80,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBox: {
    alignItems: 'center',
  },
  dateMonth: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dateDay: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  restaurantName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: '#666',
  },
});
