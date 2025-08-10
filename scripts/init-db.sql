-- Restaurant Inventory Management Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Restaurants table
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('owner', 'manager', 'staff')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory items table
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('produce', 'meat', 'dairy', 'dry_goods', 'beverages')) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity >= 0),
    unit VARCHAR(20) CHECK (unit IN ('kg', 'lbs', 'pieces', 'liters', 'gallons')) NOT NULL,
    cost_per_unit DECIMAL(10,2) NOT NULL CHECK (cost_per_unit >= 0),
    supplier VARCHAR(255) NOT NULL,
    expiration_date DATE NOT NULL,
    minimum_stock DECIMAL(10,2) NOT NULL CHECK (minimum_stock >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory transactions table (for tracking changes)
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('add', 'remove', 'adjust', 'expire')) NOT NULL,
    quantity_change DECIMAL(10,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Waste reports table
CREATE TABLE waste_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    quantity_wasted DECIMAL(10,2) NOT NULL,
    waste_reason VARCHAR(100) NOT NULL,
    cost_impact DECIMAL(10,2) NOT NULL,
    reported_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Demand predictions table
CREATE TABLE demand_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    predicted_demand DECIMAL(10,2) NOT NULL,
    prediction_date DATE NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_inventory_items_restaurant_id ON inventory_items(restaurant_id);
CREATE INDEX idx_inventory_items_expiration_date ON inventory_items(expiration_date);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_transactions_item_id ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_waste_reports_restaurant_id ON waste_reports(restaurant_id);
CREATE INDEX idx_demand_predictions_restaurant_id ON demand_predictions(restaurant_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for development
INSERT INTO restaurants (name, address, phone, email) VALUES
('Demo Restaurant', '123 Main St, City, State 12345', '+1-555-0123', 'demo@restaurant.com');

INSERT INTO users (restaurant_id, email, first_name, last_name, role) VALUES
((SELECT id FROM restaurants WHERE name = 'Demo Restaurant'), 'manager@demo.com', 'John', 'Doe', 'manager');

INSERT INTO inventory_items (restaurant_id, name, category, quantity, unit, cost_per_unit, supplier, expiration_date, minimum_stock) VALUES
((SELECT id FROM restaurants WHERE name = 'Demo Restaurant'), 'Tomatoes', 'produce', 50.0, 'kg', 2.50, 'Fresh Produce Co', CURRENT_DATE + INTERVAL '5 days', 10.0),
((SELECT id FROM restaurants WHERE name = 'Demo Restaurant'), 'Ground Beef', 'meat', 25.0, 'kg', 8.00, 'Quality Meats Ltd', CURRENT_DATE + INTERVAL '3 days', 5.0),
((SELECT id FROM restaurants WHERE name = 'Demo Restaurant'), 'Milk', 'dairy', 20.0, 'liters', 1.20, 'Dairy Fresh', CURRENT_DATE + INTERVAL '7 days', 5.0);