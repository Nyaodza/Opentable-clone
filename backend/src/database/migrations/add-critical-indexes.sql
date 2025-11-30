-- ============================================
-- Critical Performance Indexes Migration
-- OpenTable Clone Platform
-- Created: November 2025
-- ============================================

-- This migration adds critical indexes to improve query performance
-- for high-traffic operations. Run with CONCURRENTLY to avoid locks.

BEGIN;

-- ============================================
-- RESERVATIONS TABLE INDEXES
-- ============================================

-- User reservation lookup (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_user_date 
ON reservations(user_id, date DESC);

-- Restaurant reservation management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_restaurant_status 
ON reservations(restaurant_id, status, date);

-- Upcoming reservations query (dashboard, reminders)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_upcoming 
ON reservations(date, time) 
WHERE status IN ('confirmed', 'pending');

-- Date range queries for reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_date_range 
ON reservations(restaurant_id, date, created_at);

-- Cancellation tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_cancelled 
ON reservations(restaurant_id, cancelled_at DESC) 
WHERE status = 'cancelled';

-- No-show tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_noshow 
ON reservations(restaurant_id, date) 
WHERE status = 'no_show';

-- Confirmation code lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_confirmation_code 
ON reservations(confirmation_code) 
WHERE confirmation_code IS NOT NULL;

-- Party size analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_party_size 
ON reservations(restaurant_id, party_size, date);

-- ============================================
-- RESTAURANTS TABLE INDEXES
-- ============================================

-- Geospatial search (requires PostGIS)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_location 
                 ON restaurants USING GIST(location)';
    END IF;
END $$;

-- Cuisine and rating search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_cuisine_rating 
ON restaurants(cuisine_type, rating DESC);

-- Active and verified restaurants (most queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_active_verified 
ON restaurants(is_active, is_verified) 
WHERE is_active = true AND is_verified = true;

-- Price range filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_price_rating 
ON restaurants(price_range, rating DESC) 
WHERE is_active = true;

-- City/location search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_city_cuisine 
ON restaurants(city, cuisine_type, rating DESC);

-- Owner lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_owner 
ON restaurants(owner_id);

-- Name search (text pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_name_trgm 
ON restaurants USING gin(name gin_trgm_ops);

-- Full-text search on name and description
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_fulltext 
ON restaurants USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ============================================
-- REVIEWS TABLE INDEXES
-- ============================================

-- Restaurant reviews (sorted by date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_restaurant_date 
ON reviews(restaurant_id, created_at DESC);

-- Restaurant rating aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_restaurant_rating 
ON reviews(restaurant_id, rating DESC, created_at DESC);

-- User reviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_user 
ON reviews(user_id, created_at DESC);

-- Verified reviews only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_verified 
ON reviews(restaurant_id, is_verified, created_at DESC) 
WHERE is_verified = true;

-- Helpful reviews (for sorting)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_helpful 
ON reviews(restaurant_id, helpful_votes DESC) 
WHERE helpful_votes > 0;

-- Recent reviews for moderation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_pending_moderation 
ON reviews(created_at DESC) 
WHERE moderation_status = 'pending';

-- ============================================
-- USERS TABLE INDEXES
-- ============================================

-- Email lookup (unique, but index helps)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
ON users(email) 
WHERE is_active = true;

-- Role-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users(role) 
WHERE is_active = true;

-- Last login tracking (for analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login 
ON users(last_login_at DESC) 
WHERE last_login_at IS NOT NULL;

-- Phone verification
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_verified 
ON users(phone) 
WHERE phone_verified = true AND phone IS NOT NULL;

-- ============================================
-- TABLES (Restaurant Tables) INDEXES
-- ============================================

-- Restaurant table lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tables_restaurant_capacity 
ON tables(restaurant_id, capacity, is_available);

-- Available tables query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tables_available 
ON tables(restaurant_id, capacity) 
WHERE is_available = true AND is_active = true;

-- Table number lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tables_number 
ON tables(restaurant_id, table_number);

-- ============================================
-- WAITLIST TABLE INDEXES
-- ============================================

-- Active waitlist entries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waitlist_restaurant_active 
ON waitlist(restaurant_id, created_at) 
WHERE status = 'waiting';

-- User waitlist lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waitlist_user 
ON waitlist(user_id, created_at DESC);

-- Position tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waitlist_position 
ON waitlist(restaurant_id, position) 
WHERE status = 'waiting';

-- ============================================
-- LOYALTY_POINTS TABLE INDEXES
-- ============================================

-- User points balance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loyalty_user_balance 
ON loyalty_points(user_id, created_at DESC);

-- Points expiration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loyalty_expiring 
ON loyalty_points(expires_at) 
WHERE expires_at IS NOT NULL AND status = 'active';

-- Points by type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loyalty_type 
ON loyalty_points(user_id, transaction_type, created_at DESC);

-- ============================================
-- PAYMENTS TABLE INDEXES
-- ============================================

-- Reservation payment lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_reservation 
ON payments(reservation_id);

-- User payment history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user 
ON payments(user_id, created_at DESC);

-- Payment status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status 
ON payments(status, created_at DESC);

-- Stripe payment intent lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_stripe_intent 
ON payments(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- Refund tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_refunds 
ON payments(reservation_id, status) 
WHERE status = 'refunded';

-- ============================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================

-- User notifications (unread first)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC);

-- Scheduled notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_scheduled 
ON notifications(scheduled_at) 
WHERE sent_at IS NULL AND scheduled_at IS NOT NULL;

-- ============================================
-- FAVORITES TABLE INDEXES
-- ============================================

-- User favorites
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_user 
ON favorites(user_id, created_at DESC);

-- Restaurant favorites count
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_restaurant 
ON favorites(restaurant_id);

-- ============================================
-- ANALYTICS/METRICS INDEXES
-- ============================================

-- Restaurant daily metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurant_metrics_daily 
ON restaurant_metrics(restaurant_id, date DESC);

-- Aggregate statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurant_metrics_aggregate 
ON restaurant_metrics(restaurant_id, metric_type, date DESC);

-- ============================================
-- AUDIT LOG INDEXES
-- ============================================

-- Entity audit trail
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_entity 
ON audit_logs(entity_type, entity_id, created_at DESC);

-- User audit trail
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user 
ON audit_logs(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- Action type lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_action 
ON audit_logs(action_type, created_at DESC);

-- ============================================
-- SESSION MANAGEMENT INDEXES
-- ============================================

-- Active sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_active 
ON sessions(user_id, expires_at) 
WHERE expires_at > NOW();

-- Token lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_token 
ON sessions(token) 
WHERE expires_at > NOW();

-- ============================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================

-- Restaurant search with multiple filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_search_composite 
ON restaurants(city, cuisine_type, price_range, rating DESC) 
WHERE is_active = true AND is_verified = true;

-- Reservation availability check
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_availability 
ON reservations(restaurant_id, date, time, status) 
WHERE status NOT IN ('cancelled', 'no_show');

-- User activity composite
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_composite 
ON reservations(user_id, status, date DESC);

COMMIT;

-- ============================================
-- INDEX MAINTENANCE NOTES
-- ============================================
/*
  MAINTENANCE TASKS:
  
  1. Run ANALYZE after creating indexes:
     ANALYZE reservations;
     ANALYZE restaurants;
     ANALYZE reviews;
     ANALYZE users;
     ANALYZE tables;
     
  2. Monitor index usage:
     SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
     FROM pg_stat_user_indexes
     ORDER BY idx_scan DESC;
     
  3. Find unused indexes:
     SELECT indexname, idx_scan
     FROM pg_stat_user_indexes
     WHERE idx_scan = 0
     AND schemaname = 'public';
     
  4. Check index sizes:
     SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass))
     FROM pg_indexes
     WHERE schemaname = 'public'
     ORDER BY pg_relation_size(indexname::regclass) DESC;
     
  5. Reindex periodically (during low traffic):
     REINDEX INDEX CONCURRENTLY idx_reservations_user_date;
*/

