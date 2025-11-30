import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { redisClient } from './redis';

// Use Redis PubSub for production, in-memory for development
export const pubsub = process.env.NODE_ENV === 'production' 
  ? new RedisPubSub({
      publisher: redisClient,
      subscriber: redisClient.duplicate(),
    })
  : new PubSub();

// Event types
export const EVENTS = {
  RESERVATION_CREATED: 'RESERVATION_CREATED',
  RESERVATION_UPDATED: 'RESERVATION_UPDATED',
  AVAILABILITY_CHANGED: 'AVAILABILITY_CHANGED',
  USER_NOTIFICATION: 'USER_NOTIFICATION',
  RESTAURANT_UPDATED: 'RESTAURANT_UPDATED',
  REVIEW_CREATED: 'REVIEW_CREATED',
} as const;

export type EventType = typeof EVENTS[keyof typeof EVENTS];
