-- Tradefy Database Schema
-- PostgreSQL Migration Script

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'vendor', 'admin')),
    vendor_id INTEGER NULL,
    sales_count INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    profile_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    category VARCHAR(100) DEFAULT 'general',
    tags JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active BOOLEAN DEFAULT true,
    is_digital BOOLEAN DEFAULT false,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    vendor_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    external_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'completed', 'cancelled', 'refunded')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    commission_rate INTEGER DEFAULT 0 CHECK (commission_rate >= 0),
    platform_fee DECIMAL(10,2) DEFAULT 0.00 CHECK (platform_fee >= 0),
    vendor_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (vendor_amount >= 0),
    customer_email VARCHAR(255),
    customer_data JSONB DEFAULT '{}',
    product_data JSONB DEFAULT '{}',
    payment_method VARCHAR(50) DEFAULT 'moneroo',
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payout_status VARCHAR(50) DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (vendor_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Integrations table (for vendor external integrations)
CREATE TABLE IF NOT EXISTS integrations (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255),
    api_secret VARCHAR(255),
    webhook_url TEXT,
    config_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(vendor_id, service_name)
);

-- Commission ranks table (static data for gamification)
CREATE TABLE IF NOT EXISTS commission_ranks (
    rank_name VARCHAR(50) PRIMARY KEY,
    min_sales INTEGER NOT NULL,
    max_sales INTEGER,
    commission_rate INTEGER NOT NULL,
    quest_bonus_rate INTEGER NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Insert commission ranks data
INSERT INTO commission_ranks (rank_name, min_sales, max_sales, commission_rate, quest_bonus_rate, display_name, description) VALUES
('profane', 0, 24, 450, 500, 'Profane', 'Beginner rank for new vendors'),
('debutant', 25, 74, 425, 600, 'Débutant', 'Getting started with sales'),
('marchand', 75, 227, 400, 700, 'Marchand', 'Established merchant'),
('negociant', 228, 554, 375, 800, 'Négociant', 'Experienced trader'),
('courtier', 555, 1004, 350, 900, 'Courtier', 'Professional broker'),
('magnat', 1005, 2849, 325, 1000, 'Magnat', 'Business magnate'),
('senior', 2850, NULL, 300, 0, 'Senior', 'Elite vendor status')
ON CONFLICT (rank_name) DO UPDATE SET
    min_sales = EXCLUDED.min_sales,
    max_sales = EXCLUDED.max_sales,
    commission_rate = EXCLUDED.commission_rate,
    quest_bonus_rate = EXCLUDED.quest_bonus_rate,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- Vendor stats view
CREATE OR REPLACE VIEW vendor_stats AS
SELECT 
    u.id as vendor_id,
    u.email,
    u.sales_count,
    u.total_revenue,
    COUNT(p.id) as product_count,
    COUNT(o.id) as order_count,
    AVG(o.rating) as average_rating,
    COUNT(o.rating) as review_count
FROM users u
LEFT JOIN products p ON u.id = p.vendor_id AND p.is_active = true
LEFT JOIN orders o ON u.id = o.vendor_id
WHERE u.role = 'vendor' AND u.is_active = true
GROUP BY u.id, u.email, u.sales_count, u.total_revenue;

-- Product sales view
CREATE OR REPLACE VIEW product_sales AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.vendor_id,
    COUNT(o.id) as total_orders,
    SUM(o.quantity) as total_quantity_sold,
    SUM(o.total_amount) as total_revenue,
    AVG(o.rating) as average_rating
FROM products p
LEFT JOIN orders o ON p.id = o.product_id AND o.status = 'completed'
WHERE p.is_active = true
GROUP BY p.id, p.name, p.vendor_id;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_vendor_id ON users(vendor_id);
CREATE INDEX IF NOT EXISTS idx_users_sales_count ON users(sales_count);

CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_external_id ON orders(external_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_integrations_vendor_id ON integrations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_integrations_service_name ON integrations(service_name);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate vendor commission
CREATE OR REPLACE FUNCTION calculate_vendor_commission(
    p_sales_count INTEGER,
    p_sale_amount DECIMAL
) RETURNS TABLE(
    rank_name VARCHAR,
    commission_rate INTEGER,
    commission_amount DECIMAL,
    vendor_amount DECIMAL
) AS $$
DECLARE
    v_rank commission_ranks%ROWTYPE;
BEGIN
    -- Find the appropriate rank based on sales count
    SELECT * INTO v_rank
    FROM commission_ranks 
    WHERE min_sales <= p_sales_count 
    AND (max_sales IS NULL OR p_sales_count <= max_sales)
    ORDER BY min_sales DESC
    LIMIT 1;

    IF NOT FOUND THEN
        -- Default to profane rank if no rank found
        SELECT * INTO v_rank FROM commission_ranks WHERE rank_name = 'profane';
    END IF;

    commission_amount := (p_sale_amount * v_rank.commission_rate) / 10000;
    vendor_amount := p_sale_amount - commission_amount;

    RETURN QUERY SELECT 
        v_rank.rank_name,
        v_rank.commission_rate,
        commission_amount,
        vendor_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to get vendor performance stats
CREATE OR REPLACE FUNCTION get_vendor_performance_stats(p_vendor_id INTEGER)
RETURNS TABLE(
    total_orders BIGINT,
    completed_orders BIGINT,
    total_revenue DECIMAL,
    average_rating DECIMAL,
    current_rank VARCHAR,
    next_rank VARCHAR,
    sales_to_next_rank INTEGER
) AS $$
DECLARE
    v_sales_count INTEGER;
    v_current_rank VARCHAR;
    v_next_rank commission_ranks%ROWTYPE;
BEGIN
    -- Get vendor's sales count
    SELECT sales_count INTO v_sales_count
    FROM users WHERE id = p_vendor_id;

    -- Get current rank
    SELECT rank_name INTO v_current_rank
    FROM commission_ranks 
    WHERE min_sales <= v_sales_count 
    AND (max_sales IS NULL OR v_sales_count <= max_sales)
    ORDER BY min_sales DESC
    LIMIT 1;

    -- Get next rank
    SELECT * INTO v_next_rank
    FROM commission_ranks 
    WHERE min_sales > v_sales_count
    ORDER BY min_sales ASC
    LIMIT 1;

    -- Get order statistics
    SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        AVG(rating) as average_rating
    INTO total_orders, completed_orders, total_revenue, average_rating
    FROM orders 
    WHERE vendor_id = p_vendor_id;

    sales_to_next_rank := CASE 
        WHEN v_next_rank.rank_name IS NOT NULL THEN 
            GREATEST(0, v_next_rank.min_sales - v_sales_count)
        ELSE 0
    END;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;