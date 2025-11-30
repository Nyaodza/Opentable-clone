-- Create OpenTable Clone Database Schema
-- PostgreSQL

-- Create database
CREATE DATABASE IF NOT EXISTS opentable_clone;

-- Use the database
\c opentable_clone;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'diner',
    loyalty_points INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Restaurants table
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    cuisine_type VARCHAR(50) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    website VARCHAR(255),
    price_range VARCHAR(10) NOT NULL,
    total_capacity INTEGER DEFAULT 0,
    images TEXT[],
    amenities TEXT[],
    settings JSONB DEFAULT '{}',
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tables table
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    capacity INTEGER NOT NULL,
    min_capacity INTEGER NOT NULL,
    location VARCHAR(50) DEFAULT 'indoor',
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id, table_number)
);

-- Restaurant Hours table
CREATE TABLE restaurant_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL,
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    last_reservation_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id, day_of_week)
);

-- Reservations table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    table_id UUID REFERENCES tables(id),
    date_time TIMESTAMP NOT NULL,
    party_size INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    special_requests TEXT,
    dietary_restrictions TEXT[],
    occasion_type VARCHAR(100),
    confirmation_code VARCHAR(20) UNIQUE NOT NULL,
    guest_info JSONB DEFAULT '{}',
    confirmed_at TIMESTAMP,
    seated_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    has_preferences BOOLEAN DEFAULT FALSE,
    modification_count INTEGER DEFAULT 0,
    points_awarded INTEGER DEFAULT 0,
    cancellation_policy_id UUID REFERENCES cancellation_policies(id)
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    food_rating INTEGER CHECK (food_rating >= 1 AND food_rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    ambiance_rating INTEGER CHECK (ambiance_rating >= 1 AND ambiance_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    comment TEXT NOT NULL,
    visit_date DATE NOT NULL,
    photos TEXT[],
    is_verified BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, restaurant_id, visit_date)
);

-- ====================================
-- NEW OPENTABLE FEATURES TABLES
-- ====================================

-- Reservation Preferences and Special Requests
CREATE TABLE reservation_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seating_preference VARCHAR(50) NOT NULL DEFAULT 'no_preference',
    alternative_seating_preference VARCHAR(255),
    occasion VARCHAR(50) NOT NULL DEFAULT 'none',
    occasion_details VARCHAR(255),
    special_requests TEXT,
    dietary_restrictions TEXT[],
    allergies TEXT[],
    accessibility_requirements TEXT[],
    noise_level_preference VARCHAR(20) DEFAULT 'no_preference',
    temperature_preference VARCHAR(20) DEFAULT 'no_preference',
    lighting_preference VARCHAR(20) DEFAULT 'no_preference',
    requires_highchair BOOLEAN DEFAULT FALSE,
    prefers_booth BOOLEAN DEFAULT FALSE,
    pet_friendly_required BOOLEAN DEFAULT FALSE,
    parking_required BOOLEAN DEFAULT FALSE,
    valet_preferred BOOLEAN DEFAULT FALSE,
    wine_preferences JSONB DEFAULT '{}',
    minimum_table_size INTEGER,
    table_configuration VARCHAR(50),
    text_updates BOOLEAN DEFAULT FALSE,
    email_confirmation BOOLEAN DEFAULT TRUE,
    call_reminder BOOLEAN DEFAULT FALSE,
    staff_notes TEXT,
    priority_level INTEGER DEFAULT 0 CHECK (priority_level >= 0 AND priority_level <= 10),
    is_vip_guest BOOLEAN DEFAULT FALSE,
    vip_reason VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reservation_id)
);

-- Waitlist System
CREATE TABLE waitlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    desired_date DATE NOT NULL,
    desired_time TIME NOT NULL,
    party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 20),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    position INTEGER NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 2,
    earliest_time TIME,
    latest_time TIME,
    alternative_dates DATE[],
    notification_methods TEXT[],
    phone_number VARCHAR(20),
    advance_notice_minutes INTEGER DEFAULT 15 CHECK (advance_notice_minutes >= 5 AND advance_notice_minutes <= 60),
    special_requests TEXT,
    seating_preferences TEXT[],
    accessibility_requirements TEXT[],
    expires_at TIMESTAMP NOT NULL,
    notified_at TIMESTAMP,
    respond_by TIMESTAMP,
    notification_attempts INTEGER DEFAULT 0,
    accepts_earlier_time BOOLEAN DEFAULT FALSE,
    accepts_later_time BOOLEAN DEFAULT FALSE,
    accepts_alternative_dates BOOLEAN DEFAULT FALSE,
    accepts_smaller_party BOOLEAN DEFAULT FALSE,
    converted_reservation_id UUID,
    converted_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    analytics JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX waitlist_restaurant_date_status_idx ON waitlists(restaurant_id, desired_date, status);
CREATE INDEX waitlist_user_status_idx ON waitlists(user_id, status);
CREATE INDEX waitlist_position_restaurant_date_idx ON waitlists(position, restaurant_id, desired_date);
CREATE INDEX waitlist_expires_at_idx ON waitlists(expires_at);

-- Reservation Modifications
CREATE TABLE reservation_modifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    modification_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    source VARCHAR(30) NOT NULL DEFAULT 'user_initiated',
    original_details JSONB NOT NULL,
    requested_changes JSONB NOT NULL,
    approved_changes JSONB,
    reason TEXT,
    customer_notes TEXT,
    restaurant_notes TEXT,
    rejection_reason TEXT,
    expires_at TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by UUID,
    modification_fee DECIMAL(10,2) DEFAULT 0,
    cancellation_fee DECIMAL(10,2) DEFAULT 0,
    fee_waived BOOLEAN DEFAULT FALSE,
    fee_waiver_reason VARCHAR(255),
    requires_availability_check BOOLEAN DEFAULT TRUE,
    availability_confirmed BOOLEAN DEFAULT FALSE,
    alternative_offers TEXT[],
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    is_urgent BOOLEAN DEFAULT FALSE,
    urgency_reason VARCHAR(255),
    notify_customer BOOLEAN DEFAULT TRUE,
    notify_restaurant BOOLEAN DEFAULT TRUE,
    communication_log JSONB DEFAULT '[]',
    requires_approval BOOLEAN DEFAULT FALSE,
    auto_approved BOOLEAN DEFAULT FALSE,
    approval_workflow VARCHAR(100),
    parent_modification_id UUID,
    child_modification_ids UUID[],
    impact JSONB DEFAULT '{}',
    audit_log JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX modification_reservation_status_idx ON reservation_modifications(original_reservation_id, status);
CREATE INDEX modification_user_created_idx ON reservation_modifications(user_id, created_at);
CREATE INDEX modification_restaurant_status_idx ON reservation_modifications(restaurant_id, status);
CREATE INDEX modification_expires_at_idx ON reservation_modifications(expires_at);

-- OpenTable Points Program
CREATE TABLE opentable_points_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_balance INTEGER NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
    total_lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (total_lifetime_points >= 0),
    total_points_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (total_points_redeemed >= 0),
    membership_tier VARCHAR(20) NOT NULL DEFAULT 'member',
    tier_achieved_date TIMESTAMP,
    points_to_next_tier INTEGER DEFAULT 0,
    points_expiring_in_30_days INTEGER DEFAULT 0,
    next_expiration_date TIMESTAMP,
    current_year_points INTEGER DEFAULT 0,
    current_year INTEGER DEFAULT 2024,
    total_reservations INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_referrals INTEGER DEFAULT 0,
    is_vip BOOLEAN DEFAULT FALSE,
    vip_invite_code VARCHAR(50),
    last_activity_date TIMESTAMP,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX points_accounts_tier_idx ON opentable_points_accounts(membership_tier);
CREATE INDEX points_accounts_lifetime_idx ON opentable_points_accounts(total_lifetime_points);

CREATE TABLE opentable_points_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_change INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    balance_after INTEGER NOT NULL,
    related_reservation_id UUID REFERENCES reservations(id),
    related_restaurant_id UUID REFERENCES restaurants(id),
    expires_at TIMESTAMP,
    is_expired BOOLEAN DEFAULT FALSE,
    redemption_details JSONB DEFAULT '{}',
    admin_note TEXT,
    processed_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX points_transactions_user_created_idx ON opentable_points_transactions(user_id, created_at);
CREATE INDEX points_transactions_type_idx ON opentable_points_transactions(transaction_type);
CREATE INDEX points_transactions_reservation_idx ON opentable_points_transactions(related_reservation_id);
CREATE INDEX points_transactions_expires_idx ON opentable_points_transactions(expires_at);

CREATE TABLE points_redemption_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    points_required INTEGER NOT NULL CHECK (points_required >= 1),
    monetary_value DECIMAL(10,2),
    eligible_tiers TEXT[],
    restaurant_id UUID REFERENCES restaurants(id),
    is_active BOOLEAN DEFAULT TRUE,
    total_redeemed INTEGER DEFAULT 0,
    max_redemptions_per_user INTEGER,
    available_from TIMESTAMP,
    available_until TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX redemption_catalog_category_active_idx ON points_redemption_catalog(category, is_active);
CREATE INDEX redemption_catalog_points_idx ON points_redemption_catalog(points_required);
CREATE INDEX redemption_catalog_restaurant_idx ON points_redemption_catalog(restaurant_id);

-- Cancellation Policies
CREATE TABLE cancellation_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_type VARCHAR(20) NOT NULL DEFAULT 'standard',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    free_cancellation_hours INTEGER NOT NULL DEFAULT 24,
    minimum_notice_hours INTEGER DEFAULT 2,
    grace_period_minutes INTEGER DEFAULT 15,
    fee_structure JSONB NOT NULL,
    applicable_conditions JSONB DEFAULT '{}',
    waiver_conditions JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    total_applications INTEGER DEFAULT 0,
    total_fees_collected DECIMAL(10,2) DEFAULT 0,
    total_waivers INTEGER DEFAULT 0,
    total_waived_amount DECIMAL(10,2) DEFAULT 0,
    business_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX cancellation_policies_restaurant_idx ON cancellation_policies(restaurant_id);
CREATE INDEX cancellation_policies_type_active_idx ON cancellation_policies(policy_type, is_active);
CREATE INDEX cancellation_policies_default_idx ON cancellation_policies(is_default);

CREATE TABLE cancellation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES cancellation_policies(id) ON DELETE CASCADE,
    cancellation_reason VARCHAR(50) NOT NULL,
    customer_note TEXT,
    hours_before_reservation INTEGER NOT NULL,
    fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    fee_waived BOOLEAN DEFAULT FALSE,
    waiver_reason VARCHAR(255),
    waived_by VARCHAR(255),
    fee_collected BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(50),
    refund_id VARCHAR(100),
    refund_details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reservation_id)
);

CREATE INDEX cancellation_events_policy_idx ON cancellation_events(policy_id);
CREATE INDEX cancellation_events_reason_idx ON cancellation_events(cancellation_reason);
CREATE INDEX cancellation_events_fee_idx ON cancellation_events(fee_amount);

-- No-Show Tracking System
CREATE TABLE no_show_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    incident_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    expected_party_size INTEGER NOT NULL,
    actual_party_size INTEGER DEFAULT 0,
    no_show_status VARCHAR(30) NOT NULL,
    minutes_late INTEGER DEFAULT 0,
    grace_period_minutes INTEGER DEFAULT 30,
    severity_level INTEGER NOT NULL DEFAULT 1,
    estimated_revenue_loss DECIMAL(10,2) DEFAULT 0,
    prime_time_slot BOOLEAN DEFAULT FALSE,
    high_demand_period BOOLEAN DEFAULT FALSE,
    customer_explanation TEXT,
    customer_contacted BOOLEAN DEFAULT FALSE,
    contact_attempts INTEGER DEFAULT 0,
    contact_methods TEXT[],
    customer_responded BOOLEAN DEFAULT FALSE,
    table_reassigned BOOLEAN DEFAULT FALSE,
    waitlist_conversions INTEGER DEFAULT 0,
    restaurant_notes TEXT,
    auto_detected BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    confirmed_by VARCHAR(255),
    user_no_show_count INTEGER DEFAULT 0,
    user_recent_no_shows INTEGER DEFAULT 0,
    user_reliability_score DECIMAL(5,2) DEFAULT 100,
    external_factors JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reservation_id)
);

CREATE INDEX no_show_incidents_user_created_idx ON no_show_incidents(user_id, created_at);
CREATE INDEX no_show_incidents_restaurant_date_idx ON no_show_incidents(restaurant_id, incident_date);
CREATE INDEX no_show_incidents_status_idx ON no_show_incidents(no_show_status);
CREATE INDEX no_show_incidents_severity_idx ON no_show_incidents(severity_level);

CREATE TABLE no_show_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_reservations INTEGER DEFAULT 0,
    total_no_shows INTEGER DEFAULT 0,
    recent_no_shows INTEGER DEFAULT 0,
    consecutive_no_shows INTEGER DEFAULT 0,
    reliability_score DECIMAL(5,2) DEFAULT 100 CHECK (reliability_score >= 0 AND reliability_score <= 100),
    no_show_rate DECIMAL(5,2) DEFAULT 0,
    current_penalty_level VARCHAR(30) DEFAULT 'warning',
    is_restricted BOOLEAN DEFAULT FALSE,
    restriction_ends_at TIMESTAMP,
    restrictions JSONB DEFAULT '{}',
    total_penalty_fees DECIMAL(10,2) DEFAULT 0,
    outstanding_fees DECIMAL(10,2) DEFAULT 0,
    points_deducted INTEGER DEFAULT 0,
    successful_reservations_since_penalty INTEGER DEFAULT 0,
    last_no_show_date TIMESTAMP,
    rehabilitation_start_date TIMESTAMP,
    rehabilitation_target INTEGER DEFAULT 5,
    risk_factors JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX no_show_profiles_reliability_idx ON no_show_profiles(reliability_score);
CREATE INDEX no_show_profiles_penalty_idx ON no_show_profiles(current_penalty_level);

-- Indexes for performance
CREATE INDEX idx_restaurants_location ON restaurants(city, state);
CREATE INDEX idx_restaurants_cuisine ON restaurants(cuisine_type);
CREATE INDEX idx_restaurants_price ON restaurants(price_range);
CREATE INDEX idx_reservations_datetime ON reservations(date_time);
CREATE INDEX idx_reservations_restaurant ON reservations(restaurant_id, date_time);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reviews_restaurant ON reviews(restaurant_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_hours_updated_at BEFORE UPDATE ON restaurant_hours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_reservation_preferences_flag()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE reservations 
    SET has_preferences = TRUE 
    WHERE id = NEW.reservation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservation_preferences_trigger
    AFTER INSERT ON reservation_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_reservation_preferences_flag();

CREATE OR REPLACE FUNCTION update_modification_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE reservations 
    SET modification_count = modification_count + 1 
    WHERE id = NEW.original_reservation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservation_modifications_trigger
    AFTER INSERT ON reservation_modifications
    FOR EACH ROW
    EXECUTE FUNCTION update_modification_count();