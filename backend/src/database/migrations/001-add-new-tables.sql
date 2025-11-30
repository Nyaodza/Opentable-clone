-- Database Migration: Add all new tables for gap resolution features
-- Run this migration to add all new functionality

-- ==========================================
-- GUEST RESERVATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS guest_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    party_size INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 20),
    status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
    special_requests TEXT,
    dietary_restrictions TEXT[],
    occasion_type VARCHAR(50),
    confirmation_code VARCHAR(10) UNIQUE NOT NULL,
    management_token VARCHAR(100) UNIQUE NOT NULL,
    sms_reminder_sent BOOLEAN DEFAULT FALSE,
    email_reminder_sent BOOLEAN DEFAULT FALSE,
    account_created_later BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guest_reservations_restaurant ON guest_reservations(restaurant_id);
CREATE INDEX idx_guest_reservations_date_time ON guest_reservations(date, time);
CREATE INDEX idx_guest_reservations_email ON guest_reservations(guest_email);
CREATE INDEX idx_guest_reservations_phone ON guest_reservations(guest_phone);
CREATE INDEX idx_guest_reservations_code ON guest_reservations(confirmation_code);
CREATE INDEX idx_guest_reservations_token ON guest_reservations(management_token);

-- ==========================================
-- GIFT CARDS
-- ==========================================
CREATE TABLE IF NOT EXISTS gift_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    pin VARCHAR(10) NOT NULL,
    purchased_by UUID REFERENCES users(id) ON DELETE SET NULL,
    redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    initial_amount DECIMAL(10,2) NOT NULL CHECK (initial_amount > 0),
    current_balance DECIMAL(10,2) NOT NULL CHECK (current_balance >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
    recipient_email VARCHAR(255),
    recipient_name VARCHAR(255),
    message TEXT,
    expiration_date TIMESTAMP,
    activation_date TIMESTAMP,
    redeemed_at TIMESTAMP,
    stripe_payment_intent_id VARCHAR(255),
    design_template VARCHAR(100),
    transaction_history JSONB DEFAULT '[]'::jsonb,
    is_physical_card BOOLEAN DEFAULT FALSE,
    shipping_address JSONB DEFAULT '{}'::jsonb,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gift_cards_code ON gift_cards(code);
CREATE INDEX idx_gift_cards_status ON gift_cards(status);
CREATE INDEX idx_gift_cards_purchased_by ON gift_cards(purchased_by);
CREATE INDEX idx_gift_cards_redeemed_by ON gift_cards(redeemed_by);

-- ==========================================
-- PRIVATE DINING EVENTS
-- ==========================================
CREATE TABLE IF NOT EXISTS private_dining_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('wedding', 'corporate', 'birthday', 'anniversary', 'holiday', 'meeting', 'other')),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    guest_count INTEGER NOT NULL CHECK (guest_count BETWEEN 10 AND 500),
    private_room_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'contract_sent', 'deposit_paid', 'completed', 'cancelled')),
    minimum_spend DECIMAL(10,2),
    deposit_amount DECIMAL(10,2),
    deposit_paid DECIMAL(10,2),
    estimated_total DECIMAL(10,2),
    actual_total DECIMAL(10,2),
    menu_preferences TEXT,
    selected_menu_items JSONB DEFAULT '[]'::jsonb,
    dietary_restrictions TEXT[],
    special_requests TEXT,
    audio_visual_needs JSONB DEFAULT '{}'::jsonb,
    decoration_requests JSONB DEFAULT '{}'::jsonb,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    company_name VARCHAR(255),
    contract_document_url VARCHAR(500),
    contract_signed_date TIMESTAMP,
    stripe_payment_intent_id VARCHAR(255),
    staff_notes TEXT,
    event_timeline JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_private_dining_restaurant ON private_dining_events(restaurant_id);
CREATE INDEX idx_private_dining_date ON private_dining_events(date);
CREATE INDEX idx_private_dining_status ON private_dining_events(status);
CREATE INDEX idx_private_dining_user ON private_dining_events(user_id);

-- ==========================================
-- RESTAURANT ONBOARDING
-- ==========================================
CREATE TABLE IF NOT EXISTS restaurant_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1 CHECK (current_step BETWEEN 1 AND 7),
    basic_info_complete BOOLEAN DEFAULT FALSE,
    hours_complete BOOLEAN DEFAULT FALSE,
    menu_complete BOOLEAN DEFAULT FALSE,
    tables_complete BOOLEAN DEFAULT FALSE,
    photos_complete BOOLEAN DEFAULT FALSE,
    policies_complete BOOLEAN DEFAULT FALSE,
    payment_complete BOOLEAN DEFAULT FALSE,
    is_complete BOOLEAN DEFAULT FALSE,
    draft_data JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id)
);

CREATE INDEX idx_onboarding_restaurant ON restaurant_onboarding(restaurant_id);
CREATE INDEX idx_onboarding_user ON restaurant_onboarding(user_id);
CREATE INDEX idx_onboarding_complete ON restaurant_onboarding(is_complete);

-- ==========================================
-- RESERVATION DEPOSITS
-- ==========================================
CREATE TABLE IF NOT EXISTS reservation_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'captured', 'refunded', 'failed')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'prepayment', 'no_show_fee')),
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    authorized_at TIMESTAMP,
    captured_at TIMESTAMP,
    refunded_at TIMESTAMP,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    refund_reason TEXT,
    is_refundable BOOLEAN DEFAULT TRUE,
    refundable_until TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deposits_reservation ON reservation_deposits(reservation_id);
CREATE INDEX idx_deposits_user ON reservation_deposits(user_id);
CREATE INDEX idx_deposits_restaurant ON reservation_deposits(restaurant_id);
CREATE INDEX idx_deposits_status ON reservation_deposits(status);

-- ==========================================
-- DATA EXPORT REQUESTS (GDPR)
-- ==========================================
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_url VARCHAR(500),
    expires_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_export_requests_user ON data_export_requests(user_id);
CREATE INDEX idx_export_requests_status ON data_export_requests(status);

-- ==========================================
-- DATA DELETION REQUESTS (GDPR)
-- ==========================================
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'cancelled')),
    reason TEXT,
    scheduled_for TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deletion_requests_user ON data_deletion_requests(user_id);
CREATE INDEX idx_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX idx_deletion_requests_scheduled ON data_deletion_requests(scheduled_for);

-- ==========================================
-- UPDATE TRIGGERS FOR updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guest_reservations_updated_at BEFORE UPDATE ON guest_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gift_cards_updated_at BEFORE UPDATE ON gift_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_private_dining_events_updated_at BEFORE UPDATE ON private_dining_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_onboarding_updated_at BEFORE UPDATE ON restaurant_onboarding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservation_deposits_updated_at BEFORE UPDATE ON reservation_deposits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_export_requests_updated_at BEFORE UPDATE ON data_export_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_deletion_requests_updated_at BEFORE UPDATE ON data_deletion_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ADD CONSENT FIELDS TO USERS TABLE
-- ==========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS analytics_consent BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS third_party_consent BOOLEAN DEFAULT FALSE;

-- ==========================================
-- SEED DATA (Optional - for testing)
-- ==========================================
-- Uncomment to insert test data

-- INSERT INTO gift_cards (code, pin, initial_amount, current_balance, status, expiration_date) VALUES
-- ('GIFT-1234-5678-ABCD', '123456', 100.00, 100.00, 'active', CURRENT_TIMESTAMP + INTERVAL '1 year');

COMMENT ON TABLE guest_reservations IS 'Reservations made without user authentication';
COMMENT ON TABLE gift_cards IS 'Digital and physical gift cards for platform';
COMMENT ON TABLE private_dining_events IS 'Large party and event bookings';
COMMENT ON TABLE restaurant_onboarding IS 'Track restaurant setup progress';
COMMENT ON TABLE reservation_deposits IS 'Payment deposits and prepayments for reservations';
COMMENT ON TABLE data_export_requests IS 'GDPR Article 15 - Right to data portability';
COMMENT ON TABLE data_deletion_requests IS 'GDPR Article 17 - Right to be forgotten';

-- Migration complete
SELECT 'Migration completed successfully. All tables created.' AS status;
