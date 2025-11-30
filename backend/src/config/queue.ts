import Bull from 'bull';
import { sendReservationReminder } from './email';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';

// Create queues
export const emailQueue = new Bull('email', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

export const notificationQueue = new Bull('notification', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Process email queue
emailQueue.process(async (job) => {
  const { type, data } = job.data;

  switch (type) {
    case 'reservation-reminder':
      const reservation = await Reservation.findByPk(data.reservationId, {
        include: [
          { model: Restaurant, as: 'restaurant' },
          { model: User, as: 'user' }
        ]
      });
      
      if (reservation && reservation.status === 'confirmed') {
        await sendReservationReminder(reservation);
      }
      break;
    
    default:
      console.log('Unknown email job type:', type);
  }
});

// Schedule reminder emails
export const scheduleReservationReminder = async (reservationId: string, dateTime: Date) => {
  const reminderTime = new Date(dateTime);
  reminderTime.setDate(reminderTime.getDate() - 1); // 24 hours before
  reminderTime.setHours(10, 0, 0, 0); // Send at 10 AM

  const delay = reminderTime.getTime() - Date.now();
  
  if (delay > 0) {
    await emailQueue.add(
      {
        type: 'reservation-reminder',
        data: { reservationId }
      },
      { delay }
    );
  }
};

// Process notification queue
notificationQueue.process(async (job) => {
  const { type, data } = job.data;
  // Process real-time notifications here
  console.log('Processing notification:', type, data);
});

// Error handling
emailQueue.on('failed', (job, err) => {
  console.error('Email job failed:', job.id, err);
});

notificationQueue.on('failed', (job, err) => {
  console.error('Notification job failed:', job.id, err);
});