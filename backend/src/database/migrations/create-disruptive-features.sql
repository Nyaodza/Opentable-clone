-- Migration for Disruptive Innovation Features
-- OpenTable Clone - Phase 3 Implementation

-- Social Dining Groups
CREATE TABLE IF NOT EXISTS social_dining_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_members INTEGER DEFAULT 10,
    is_private BOOLEAN DEFAULT false,
    invite_code VARCHAR(50) UNIQUE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES social_dining_groups(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'banned')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, group_id)
);

CREATE TABLE IF NOT EXISTS group_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES social_dining_groups(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    proposed_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    party_size INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'proposed' CHECK (status IN ('proposed', 'voting', 'confirmed', 'completed', 'cancelled')),
    bill_split_type VARCHAR(20) DEFAULT 'equal' CHECK (bill_split_type IN ('equal', 'by_item', 'by_person', 'host_pays')),
    final_reservation_id UUID REFERENCES reservations(id),
    special_requests TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sustainability Tracking
CREATE TABLE IF NOT EXISTS sustainability_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    carbon_footprint DECIMAL(10, 2) DEFAULT 0,
    local_sourcing_percentage DECIMAL(5, 2) DEFAULT 0,
    waste_reduction_score DECIMAL(5, 2) DEFAULT 0,
    community_impact_score DECIMAL(5, 2) DEFAULT 0,
    certifications TEXT[] DEFAULT '{}',
    sustainability_rating DECIMAL(3, 2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sustainability_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{}',
    impact JSONB DEFAULT '{}',
    achievements JSONB DEFAULT '[]',
    goals JSONB DEFAULT '[]',
    insights JSONB DEFAULT '[]',
    notification_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blockchain Loyalty System
CREATE TABLE IF NOT EXISTS blockchain_loyalty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_balance DECIMAL(18, 8) DEFAULT 0 CHECK (token_balance >= 0),
    total_earned DECIMAL(18, 8) DEFAULT 0 CHECK (total_earned >= 0),
    total_redeemed DECIMAL(18, 8) DEFAULT 0 CHECK (total_redeemed >= 0),
    wallet_address VARCHAR(42) UNIQUE,
    smart_contract_address VARCHAR(42),
    blockchain_network VARCHAR(20) DEFAULT 'polygon' CHECK (blockchain_network IN ('ethereum', 'polygon', 'binance', 'testnet')),
    staking_balance DECIMAL(18, 8) DEFAULT 0 CHECK (staking_balance >= 0),
    staking_rewards DECIMAL(18, 8) DEFAULT 0 CHECK (staking_rewards >= 0),
    loyalty_tier VARCHAR(20) DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    tier_progress DECIMAL(5, 2) DEFAULT 0 CHECK (tier_progress >= 0 AND tier_progress <= 100),
    referral_tokens DECIMAL(18, 8) DEFAULT 0 CHECK (referral_tokens >= 0),
    nft_collectibles JSONB DEFAULT '[]',
    transaction_history JSONB DEFAULT '[]',
    last_synced_block BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_hash VARCHAR(66) UNIQUE,
    block_number BIGINT,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'stake', 'unstake', 'transfer', 'referral', 'nft_mint', 'tier_upgrade')),
    token_amount DECIMAL(18, 8) NOT NULL CHECK (token_amount >= 0),
    source_type VARCHAR(30) NOT NULL CHECK (source_type IN ('reservation', 'review', 'referral', 'social_share', 'birthday', 'anniversary', 'special_event', 'staking_reward', 'manual')),
    source_id UUID,
    destination_address VARCHAR(42),
    gas_used BIGINT,
    gas_fee DECIMAL(18, 8),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),
    confirmations INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Virtual Restaurant Experiences
CREATE TABLE IF NOT EXISTS virtual_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    experience_type VARCHAR(30) NOT NULL CHECK (experience_type IN ('vr_tour', 'virtual_dining', 'cooking_class', 'chef_table', 'wine_tasting', 'cultural_experience')),
    duration INTEGER NOT NULL CHECK (duration >= 15 AND duration <= 480),
    max_participants INTEGER DEFAULT 10 CHECK (max_participants >= 1 AND max_participants <= 100),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    available_slots JSONB DEFAULT '[]',
    vr_assets JSONB DEFAULT '{}',
    streaming_url VARCHAR(500),
    interactive_elements JSONB DEFAULT '[]',
    requirements JSONB DEFAULT '[]',
    language VARCHAR(10) DEFAULT 'en',
    difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    rating DECIMAL(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    total_bookings INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS virtual_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    virtual_experience_id UUID NOT NULL REFERENCES virtual_experiences(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    participants JSONB DEFAULT '[]',
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_id VARCHAR(100),
    session_id VARCHAR(100),
    join_url VARCHAR(500),
    vr_room_id VARCHAR(100),
    special_requests TEXT,
    device_info JSONB DEFAULT '{}',
    feedback JSONB,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_social_dining_groups_creator ON social_dining_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_reservations_group ON group_reservations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_reservations_restaurant ON group_reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_group_reservations_date ON group_reservations(reservation_date);

CREATE INDEX IF NOT EXISTS idx_sustainability_metrics_restaurant ON sustainability_metrics(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_user_sustainability_profiles_user ON user_sustainability_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_blockchain_loyalty_user ON blockchain_loyalty(user_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_loyalty_wallet ON blockchain_loyalty(wallet_address);
CREATE INDEX IF NOT EXISTS idx_blockchain_loyalty_tier ON blockchain_loyalty(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_user ON blockchain_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_hash ON blockchain_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_status ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_type ON blockchain_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_virtual_experiences_restaurant ON virtual_experiences(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_virtual_experiences_type ON virtual_experiences(experience_type);
CREATE INDEX IF NOT EXISTS idx_virtual_experiences_active ON virtual_experiences(is_active);
CREATE INDEX IF NOT EXISTS idx_virtual_bookings_user ON virtual_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_virtual_bookings_experience ON virtual_bookings(virtual_experience_id);
CREATE INDEX IF NOT EXISTS idx_virtual_bookings_date ON virtual_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_virtual_bookings_status ON virtual_bookings(status);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_social_dining_groups_updated_at BEFORE UPDATE ON social_dining_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_reservations_updated_at BEFORE UPDATE ON group_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sustainability_metrics_updated_at BEFORE UPDATE ON sustainability_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sustainability_profiles_updated_at BEFORE UPDATE ON user_sustainability_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blockchain_loyalty_updated_at BEFORE UPDATE ON blockchain_loyalty FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blockchain_transactions_updated_at BEFORE UPDATE ON blockchain_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_virtual_experiences_updated_at BEFORE UPDATE ON virtual_experiences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_virtual_bookings_updated_at BEFORE UPDATE ON virtual_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO sustainability_metrics (restaurant_id, carbon_footprint, local_sourcing_percentage, waste_reduction_score, community_impact_score, certifications, sustainability_rating)
SELECT 
    id,
    RANDOM() * 100 + 50, -- Carbon footprint between 50-150
    RANDOM() * 100, -- Local sourcing 0-100%
    RANDOM() * 100, -- Waste reduction 0-100
    RANDOM() * 100, -- Community impact 0-100
    ARRAY['organic', 'local_sourcing']::TEXT[],
    RANDOM() * 2 + 3 -- Rating between 3-5
FROM restaurants 
LIMIT 10;

-- Sample virtual experiences
INSERT INTO virtual_experiences (restaurant_id, title, description, experience_type, duration, max_participants, price, vr_assets, requirements, difficulty)
SELECT 
    id,
    'Virtual Kitchen Tour',
    'Take an immersive tour of our professional kitchen and learn about our cooking techniques.',
    'vr_tour',
    45,
    20,
    29.99,
    '{"thumbnailUrl": "/images/vr-kitchen-tour.jpg", "sceneUrl": "/vr/kitchen-scene.glb"}',
    '["vr_headset", "mobile_app"]',
    'beginner'
FROM restaurants 
LIMIT 5;

COMMIT;
