import { ReservationService } from '../../src/services/reservation.service';
import Reservation from '../../src/models/reservation.model';
import Restaurant from '../../src/models/restaurant.model';
import RestaurantTable from '../../src/models/restaurant-table.model';
import { createTestUser, createTestRestaurant, createTestReservation } from '../setup';
import { addDays, format } from 'date-fns';

describe('ReservationService', () => {
  let testUser: any;
  let testRestaurant: any;
  let testTable: any;

  beforeEach(async () => {
    await Reservation.destroy({ where: {} });
    await RestaurantTable.destroy({ where: {} });
    await Restaurant.destroy({ where: {} });
    
    testUser = await createTestUser();
    const owner = await createTestUser({ 
      email: 'owner@test.com',
      role: 'restaurant_owner' 
    });
    testRestaurant = await createTestRestaurant(owner.id);
    testTable = await RestaurantTable.create({
      restaurantId: testRestaurant.id,
      tableNumber: 'T1',
      capacity: 4,
      isActive: true,
    });
  });

  describe('createReservation', () => {
    it('should create a reservation successfully', async () => {
      const reservationData = {
        restaurantId: testRestaurant.id,
        date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        time: '19:00',
        partySize: 2,
        specialRequests: 'Window seat please',
      };

      const reservation = await ReservationService.createReservation(
        testUser.id,
        reservationData
      );

      expect(reservation).toBeDefined();
      expect(reservation.userId).toBe(testUser.id);
      expect(reservation.restaurantId).toBe(testRestaurant.id);
      expect(reservation.partySize).toBe(2);
      expect(reservation.status).toBe('confirmed');
      expect(reservation.confirmationCode).toBeDefined();
    });

    it('should throw error for past date reservation', async () => {
      const reservationData = {
        restaurantId: testRestaurant.id,
        date: format(addDays(new Date(), -1), 'yyyy-MM-dd'),
        time: '19:00',
        partySize: 2,
      };

      await expect(
        ReservationService.createReservation(testUser.id, reservationData)
      ).rejects.toThrow('Cannot make reservations for past dates');
    });

    it('should throw error if restaurant is inactive', async () => {
      await testRestaurant.update({ isActive: false });

      const reservationData = {
        restaurantId: testRestaurant.id,
        date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        time: '19:00',
        partySize: 2,
      };

      await expect(
        ReservationService.createReservation(testUser.id, reservationData)
      ).rejects.toThrow('Restaurant is not accepting reservations');
    });

    it('should throw error if no tables available', async () => {
      // Create a reservation that takes the only table
      await createTestReservation(testUser.id, testRestaurant.id, {
        date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        time: '19:00',
        tableId: testTable.id,
      });

      const reservationData = {
        restaurantId: testRestaurant.id,
        date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        time: '19:00',
        partySize: 2,
      };

      await expect(
        ReservationService.createReservation(testUser.id, reservationData)
      ).rejects.toThrow('No tables available for the requested time');
    });

    it('should handle deposit requirements', async () => {
      await testRestaurant.update({ reservationDeposit: 25 });

      const reservationData = {
        restaurantId: testRestaurant.id,
        date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        time: '19:00',
        partySize: 2,
      };

      const reservation = await ReservationService.createReservation(
        testUser.id,
        reservationData
      );

      expect(reservation.depositAmount).toBe(25);
      expect(reservation.depositPaid).toBe(false);
    });

    it('should respect max advance booking days', async () => {
      await testRestaurant.update({ maxAdvanceBookingDays: 30 });

      const reservationData = {
        restaurantId: testRestaurant.id,
        date: format(addDays(new Date(), 45), 'yyyy-MM-dd'),
        time: '19:00',
        partySize: 2,
      };

      await expect(
        ReservationService.createReservation(testUser.id, reservationData)
      ).rejects.toThrow('Cannot book more than 30 days in advance');
    });
  });

  describe('getAvailableSlots', () => {
    it('should return available time slots', async () => {
      const date = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      
      const slots = await ReservationService.getAvailableSlots(
        testRestaurant.id,
        date,
        2
      );

      expect(slots).toBeDefined();
      expect(Array.isArray(slots)).toBe(true);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toHaveProperty('time');
      expect(slots[0]).toHaveProperty('available');
    });

    it('should mark slots as unavailable when tables are booked', async () => {
      const date = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      
      // Book the only table
      await createTestReservation(testUser.id, testRestaurant.id, {
        date,
        time: '19:00',
        tableId: testTable.id,
      });

      const slots = await ReservationService.getAvailableSlots(
        testRestaurant.id,
        date,
        2
      );

      const slot1900 = slots.find(s => s.time === '19:00');
      expect(slot1900?.available).toBe(false);
    });

    it('should consider party size when checking availability', async () => {
      const date = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      
      const slotsForTwo = await ReservationService.getAvailableSlots(
        testRestaurant.id,
        date,
        2
      );

      const slotsForSix = await ReservationService.getAvailableSlots(
        testRestaurant.id,
        date,
        6 // Larger than table capacity
      );

      expect(slotsForTwo.some(s => s.available)).toBe(true);
      expect(slotsForSix.every(s => !s.available)).toBe(true);
    });
  });

  describe('cancelReservation', () => {
    it('should cancel reservation successfully', async () => {
      const reservation = await createTestReservation(
        testUser.id,
        testRestaurant.id
      );

      await ReservationService.cancelReservation(reservation.id, testUser.id);

      const updated = await Reservation.findByPk(reservation.id);
      expect(updated!.status).toBe('cancelled');
    });

    it('should throw error if reservation not found', async () => {
      await expect(
        ReservationService.cancelReservation('non-existent-id', testUser.id)
      ).rejects.toThrow('Reservation not found');
    });

    it('should throw error if user is not the owner', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com' });
      const reservation = await createTestReservation(
        testUser.id,
        testRestaurant.id
      );

      await expect(
        ReservationService.cancelReservation(reservation.id, otherUser.id)
      ).rejects.toThrow('Reservation not found');
    });

    it('should throw error if reservation is already cancelled', async () => {
      const reservation = await createTestReservation(
        testUser.id,
        testRestaurant.id,
        { status: 'cancelled' }
      );

      await expect(
        ReservationService.cancelReservation(reservation.id, testUser.id)
      ).rejects.toThrow('Reservation is already cancelled');
    });

    it('should throw error if reservation is in the past', async () => {
      const reservation = await createTestReservation(
        testUser.id,
        testRestaurant.id,
        {
          date: format(addDays(new Date(), -1), 'yyyy-MM-dd'),
          time: '19:00',
        }
      );

      await expect(
        ReservationService.cancelReservation(reservation.id, testUser.id)
      ).rejects.toThrow('Cannot cancel past reservations');
    });
  });

  describe('updateReservation', () => {
    it('should update reservation successfully', async () => {
      const reservation = await createTestReservation(
        testUser.id,
        testRestaurant.id,
        { partySize: 2 }
      );

      const updated = await ReservationService.updateReservation(
        reservation.id,
        testUser.id,
        { partySize: 4 }
      );

      expect(updated.partySize).toBe(4);
    });

    it('should update date and time', async () => {
      const reservation = await createTestReservation(
        testUser.id,
        testRestaurant.id
      );

      const newDate = format(addDays(new Date(), 2), 'yyyy-MM-dd');
      const updated = await ReservationService.updateReservation(
        reservation.id,
        testUser.id,
        { 
          date: newDate,
          time: '20:00' 
        }
      );

      expect(format(updated.date, 'yyyy-MM-dd')).toBe(newDate);
      expect(updated.time).toBe('20:00');
    });

    it('should throw error if new slot is not available', async () => {
      const reservation = await createTestReservation(
        testUser.id,
        testRestaurant.id
      );

      // Book the table for the new time
      await createTestReservation(testUser.id, testRestaurant.id, {
        date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        time: '20:00',
        tableId: testTable.id,
      });

      await expect(
        ReservationService.updateReservation(
          reservation.id,
          testUser.id,
          {
            date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
            time: '20:00',
          }
        )
      ).rejects.toThrow('No tables available for the requested time');
    });
  });

  describe('getUserReservations', () => {
    it('should return user reservations', async () => {
      await createTestReservation(testUser.id, testRestaurant.id);
      await createTestReservation(testUser.id, testRestaurant.id, {
        date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
      });

      const reservations = await ReservationService.getUserReservations(testUser.id);

      expect(reservations).toHaveLength(2);
      expect(reservations[0].userId).toBe(testUser.id);
    });

    it('should filter by status', async () => {
      await createTestReservation(testUser.id, testRestaurant.id, {
        status: 'confirmed',
      });
      await createTestReservation(testUser.id, testRestaurant.id, {
        status: 'cancelled',
      });

      const confirmed = await ReservationService.getUserReservations(
        testUser.id,
        { status: 'confirmed' }
      );

      expect(confirmed).toHaveLength(1);
      expect(confirmed[0].status).toBe('confirmed');
    });

    it('should filter upcoming reservations', async () => {
      await createTestReservation(testUser.id, testRestaurant.id, {
        date: format(addDays(new Date(), -1), 'yyyy-MM-dd'),
      });
      await createTestReservation(testUser.id, testRestaurant.id, {
        date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      });

      const upcoming = await ReservationService.getUserReservations(
        testUser.id,
        { upcoming: true }
      );

      expect(upcoming).toHaveLength(1);
    });
  });

  describe('getRestaurantReservations', () => {
    it('should return restaurant reservations', async () => {
      const owner = await Restaurant.findByPk(testRestaurant.id, {
        attributes: ['ownerId'],
      });
      
      await createTestReservation(testUser.id, testRestaurant.id);
      await createTestReservation(testUser.id, testRestaurant.id);

      const reservations = await ReservationService.getRestaurantReservations(
        testRestaurant.id,
        owner!.ownerId
      );

      expect(reservations).toHaveLength(2);
    });

    it('should filter by date', async () => {
      const owner = await Restaurant.findByPk(testRestaurant.id, {
        attributes: ['ownerId'],
      });
      
      const targetDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      
      await createTestReservation(testUser.id, testRestaurant.id, {
        date: targetDate,
      });
      await createTestReservation(testUser.id, testRestaurant.id, {
        date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
      });

      const reservations = await ReservationService.getRestaurantReservations(
        testRestaurant.id,
        owner!.ownerId,
        { date: targetDate }
      );

      expect(reservations).toHaveLength(1);
    });
  });
});