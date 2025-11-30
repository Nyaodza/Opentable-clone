import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

const publishClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

const subscribeClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

export const pubsub = new RedisPubSub({
  publisher: publishClient,
  subscriber: subscribeClient,
});

// Event types for type safety
export const EVENTS = {
  RESERVATION_CREATED: 'RESERVATION_CREATED',
  RESERVATION_UPDATED: 'RESERVATION_UPDATED',
  RESERVATION_CANCELLED: 'RESERVATION_CANCELLED',
  RESTAURANT_UPDATED: 'RESTAURANT_UPDATED',
  AVAILABILITY_CHANGED: 'AVAILABILITY_CHANGED',
  REVIEW_CREATED: 'REVIEW_CREATED',
  NOTIFICATION_CREATED: 'NOTIFICATION_CREATED',
  USER_UPDATED: 'USER_UPDATED',
} as const;

export type EventType = typeof EVENTS[keyof typeof EVENTS];