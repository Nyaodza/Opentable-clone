-- Floor plan and table management schema for OpenTable Clone
-- PostgreSQL

-- Floor plans table
CREATE TABLE IF NOT EXISTS floor_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    width INTEGER NOT NULL DEFAULT 800,
    height INTEGER NOT NULL DEFAULT 600,
    layout JSONB NOT NULL DEFAULT '{"tables": [], "walls": [], "fixtures": [], "zones": []}',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_default_per_restaurant UNIQUE(restaurant_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Table assignments table (tracking table usage)
CREATE TABLE IF NOT EXISTS table_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    reservation_id UUID NOT NULL,
    assigned_at TIMESTAMP NOT NULL,
    seated_at TIMESTAMP,
    vacated_at TIMESTAMP,
    estimated_duration INTEGER, -- in minutes
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_floor_plans_restaurant ON floor_plans(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_floor_plans_active ON floor_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_floor_plans_default ON floor_plans(restaurant_id, is_default);

CREATE INDEX IF NOT EXISTS idx_table_assignments_table ON table_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_table_assignments_reservation ON table_assignments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_table_assignments_time ON table_assignments(assigned_at, vacated_at);
CREATE INDEX IF NOT EXISTS idx_table_assignments_seated ON table_assignments(seated_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_floor_plans_updated_at 
    BEFORE UPDATE ON floor_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_table_assignments_updated_at 
    BEFORE UPDATE ON table_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample floor plan layout structure (JSONB examples)
-- {
--   "tables": [
--     {
--       "id": "table-uuid",
--       "x": 100,
--       "y": 150,
--       "width": 80,
--       "height": 80,
--       "rotation": 0,
--       "shape": "circle"
--     }
--   ],
--   "walls": [
--     {
--       "id": "wall-1",
--       "x1": 0,
--       "y1": 0,
--       "x2": 400,
--       "y2": 0,
--       "thickness": 10
--     }
--   ],
--   "fixtures": [
--     {
--       "id": "fixture-1",
--       "type": "bar",
--       "x": 50,
--       "y": 50,
--       "width": 200,
--       "height": 50,
--       "rotation": 0
--     }
--   ],
--   "zones": [
--     {
--       "id": "zone-1",
--       "name": "VIP Section",
--       "x": 300,
--       "y": 200,
--       "width": 200,
--       "height": 150,
--       "color": "#ffebcd"
--     }
--   ]
-- }