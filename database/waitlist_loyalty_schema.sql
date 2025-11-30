-- Add waitlist and loyalty program tables to OpenTable Clone Database
-- PostgreSQL

-- Waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    requested_date DATE NOT NULL,
    preferred_time_start TIME NOT NULL,
    preferred_time_end TIME NOT NULL,
    party_size INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'waiting',
    position INTEGER NOT NULL,
    estimated_wait_minutes INTEGER,
    notified_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    notes TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loyalty transactions table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    restaurant_id UUID REFERENCES restaurants(id),
    type VARCHAR(50) NOT NULL,
    points INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description VARCHAR(255) NOT NULL,
    reference_id VARCHAR(255),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loyalty rewards catalog
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    points_cost INTEGER NOT NULL,
    minimum_tier VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    value DECIMAL(10, 2),
    max_redemptions INTEGER DEFAULT 0,
    current_redemptions INTEGER DEFAULT 0,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    restrictions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User redeemed rewards
CREATE TABLE IF NOT EXISTS user_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    reward_id UUID NOT NULL REFERENCES loyalty_rewards(id),
    redemption_code VARCHAR(20) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_waitlist_user ON waitlist(user_id);
CREATE INDEX idx_waitlist_restaurant_date ON waitlist(restaurant_id, requested_date);
CREATE INDEX idx_waitlist_status ON waitlist(status);
CREATE INDEX idx_waitlist_position ON waitlist(restaurant_id, requested_date, position);

CREATE INDEX idx_loyalty_transactions_user ON loyalty_transactions(user_id);
CREATE INDEX idx_loyalty_transactions_type ON loyalty_transactions(type);
CREATE INDEX idx_loyalty_transactions_reference ON loyalty_transactions(reference_id);

CREATE INDEX idx_loyalty_rewards_tier ON loyalty_rewards(minimum_tier);
CREATE INDEX idx_loyalty_rewards_points ON loyalty_rewards(points_cost);
CREATE INDEX idx_loyalty_rewards_active ON loyalty_rewards(is_active);

CREATE INDEX idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX idx_user_rewards_code ON user_rewards(redemption_code);
CREATE INDEX idx_user_rewards_used ON user_rewards(is_used);

-- Triggers for updated_at
CREATE TRIGGER update_waitlist_updated_at BEFORE UPDATE ON waitlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_transactions_updated_at BEFORE UPDATE ON loyalty_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_rewards_updated_at BEFORE UPDATE ON loyalty_rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_rewards_updated_at BEFORE UPDATE ON user_rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample loyalty rewards
INSERT INTO loyalty_rewards (name, description, points_cost, minimum_tier, category, value, restrictions) VALUES
('$10 Dining Credit', 'Get $10 off your next reservation', 500, 'bronze', 'dining', 10.00, '{"minimumPartySize": 2}'),
('Free Appetizer', 'Complimentary appetizer at participating restaurants', 750, 'silver', 'dining', 15.00, '{}'),
('Priority Reservations', 'Skip the waitlist for 30 days', 1000, 'gold', 'experience', 0, '{}'),
('$25 Dining Credit', 'Get $25 off your next reservation', 1200, 'gold', 'dining', 25.00, '{"minimumPartySize": 4}'),
('VIP Experience Package', 'Premium table + complimentary wine pairing', 2000, 'platinum', 'experience', 100.00, '{"minimumPartySize": 2}'),
('Chef''s Table Experience', 'Exclusive chef''s table dinner for 2', 3000, 'platinum', 'experience', 200.00, '{"minimumPartySize": 2, "maxPartySize": 2}');

-- Sample birthday rewards (admin can award these)
INSERT INTO loyalty_rewards (name, description, points_cost, minimum_tier, category, value, valid_from, valid_until) VALUES
('Birthday Dessert', 'Complimentary birthday dessert', 0, 'bronze', 'birthday', 12.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year');