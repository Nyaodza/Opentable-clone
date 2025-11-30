import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../src/models/User';
import { Restaurant } from '../../src/models/Restaurant';
import { Reservation } from '../../src/models/Reservation';
import { auth } from '../../src/middleware/auth.middleware';
import reservationRoutes from '../../src/routes/reservation.routes';

const app = express();
app.use(express.json());
app.use(auth);
app.use('/reservations', reservationRoutes);

describe('Reservation Controller', () => {
  let testUser: any;
  let testRestaurant: any;
  let authToken: string;

  beforeEach(async () => {
    // Create test user
    testUser = await global.testUtils.createTestUser();
    
    // Create test restaurant
    testRestaurant = await global.testUtils.createTestRestaurant(testUser.id);
    
    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  describe('POST /reservations', () => {
    it('should create a reservation successfully', async () => {
      const reservationData = {
        restaurantId: testRestaurant.id,
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        partySize: 4,
        specialRequests: 'Window table please',
        occasionType: 'Birthday'
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reservationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.reservation.restaurantId).toBe(testRestaurant.id);
      expect(response.body.reservation.partySize).toBe(4);
      expect(response.body.reservation.confirmationCode).toBeDefined();
      expect(response.body.reservation.status).toBe('confirmed');
    });

    it('should not create reservation for non-existent restaurant', async () => {
      const reservationData = {
        restaurantId: 'non-existent-id',
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        partySize: 2
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reservationData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should not create reservation for past date', async () => {
      const reservationData = {
        restaurantId: testRestaurant.id,
        dateTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        partySize: 2
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('past');
    });

    it('should not create duplicate reservation at same time', async () => {
      const dateTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Create first reservation
      await global.testUtils.createTestReservation(testUser.id, testRestaurant.id, {
        dateTime
      });

      const reservationData = {
        restaurantId: testRestaurant.id,
        dateTime,
        partySize: 2
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already have');
    });

    it('should validate party size', async () => {
      const reservationData = {
        restaurantId: testRestaurant.id,
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        partySize: 0 // Invalid party size
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /reservations/my', () => {
    beforeEach(async () => {
      // Create test reservations
      await global.testUtils.createTestReservation(testUser.id, testRestaurant.id, {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'confirmed'
      });
      
      await global.testUtils.createTestReservation(testUser.id, testRestaurant.id, {
        dateTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'completed'
      });
    });

    it('should get user reservations', async () => {
      const response = await request(app)
        .get('/reservations/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reservations).toHaveLength(2);
      expect(response.body.reservations[0].userId).toBe(testUser.id);
    });

    it('should filter upcoming reservations', async () => {
      const response = await request(app)
        .get('/reservations/my?upcoming=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reservations).toHaveLength(1);
      expect(response.body.reservations[0].status).toBe('confirmed');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/reservations/my?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reservations).toHaveLength(1);
      expect(response.body.reservations[0].status).toBe('completed');
    });
  });

  describe('PUT /reservations/:id', () => {
    let testReservation: any;

    beforeEach(async () => {
      testReservation = await global.testUtils.createTestReservation(
        testUser.id, 
        testRestaurant.id,
        { dateTime: new Date(Date.now() + 48 * 60 * 60 * 1000) } // Day after tomorrow
      );
    });

    it('should update reservation successfully', async () => {
      const updateData = {
        partySize: 6,
        specialRequests: 'Updated request'
      };

      const response = await request(app)
        .put(`/reservations/${testReservation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reservation.partySize).toBe(6);
      expect(response.body.reservation.specialRequests).toBe('Updated request');
    });

    it('should not update reservation close to date', async () => {
      // Update reservation to be soon (within 2 hours)
      await testReservation.update({
        dateTime: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour from now
      });

      const updateData = {
        partySize: 6
      };

      const response = await request(app)
        .put(`/reservations/${testReservation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('2 hours');
    });

    it('should not update other user\'s reservation', async () => {
      const otherUser = await global.testUtils.createTestUser({ email: 'other@example.com' });
      const otherUserReservation = await global.testUtils.createTestReservation(
        otherUser.id, 
        testRestaurant.id
      );

      const updateData = {
        partySize: 6
      };

      const response = await request(app)
        .put(`/reservations/${otherUserReservation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /reservations/:id', () => {
    let testReservation: any;

    beforeEach(async () => {
      testReservation = await global.testUtils.createTestReservation(
        testUser.id, 
        testRestaurant.id
      );
    });

    it('should cancel reservation successfully', async () => {
      const response = await request(app)
        .delete(`/reservations/${testReservation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Change of plans' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify reservation is cancelled
      const updatedReservation = await Reservation.findByPk(testReservation.id);
      expect(updatedReservation!.status).toBe('cancelled');
      expect(updatedReservation!.cancellationReason).toBe('Change of plans');
    });

    it('should not cancel already cancelled reservation', async () => {
      await testReservation.update({ status: 'cancelled' });

      const response = await request(app)
        .delete(`/reservations/${testReservation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already cancelled');
    });

    it('should not cancel completed reservation', async () => {
      await testReservation.update({ status: 'completed' });

      const response = await request(app)
        .delete(`/reservations/${testReservation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('completed');
    });
  });
});