-- Tradefy v3 - PostgreSQL Database Schema
-- Created: 2024-01-01
-- Version: 3.0.0

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable case-insensitive text comparison
CREATE EXTENSION IF NOT EXISTS "citext";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email CITEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'vendor', 'admin')),
    vendor_id INTEGER,
    sales_count INTEGER DEFAULT 0 CHECK (sales_count >= 0),
    total_revenue DECIMAL(12,2) DEFAULT 0.00 CHECK (total_revenue >= 0),
    profile_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_sales_count ON users(sales_count);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0.01 AND price <= 10000.00),
    currency VARCHAR(3) DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'XOF', 'XAF')),
    category VARCHAR(100) DEFAULT 'general',
    tags JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active BOOLEAN DEFAULT true,
    is_digital BOOLEAN DEFAULT false,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints for digital products
    CONSTRAINT digital_product_requires_file 
        CHECK (NOT is_digital OR (is_digital AND file_url IS NOT NULL))
);

-- Indexes for products table
CREATE INDEX idx_products_vendor_id ON products(vendor_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_digital ON products(is_digital);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_stock_quantity ON products(stock_quantity);

-- Full-text search index for products
CREATE INDEX idx_products_search ON products USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    vendor_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    external_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'paid', 'processing', 'completed', 'cancelled', 'refunded')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0.01),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0.01),
    currency VARCHAR(3) DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'XOF', 'XAF')),
    commission_rate INTEGER DEFAULT 0 CHECK (commission_rate >= 0 AND commission_rate <= 1000),
    platform_fee DECIMAL(10,2) DEFAULT 0.00 CHECK (platform_fee >= 0),
    vendor_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (vendor_amount >= 0),
    customer_email CITEXT NOT NULL,
    customer_data JSONB DEFAULT '{}',
    product_data JSONB DEFAULT '{}',
    payment_method VARCHAR(50) DEFAULT 'moneroo',
    payment_status VARCHAR(50) DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payout_status VARCHAR(50) DEFAULT 'pending' 
        CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    
    -- Data consistency constraints
    CONSTRAINT valid_amounts CHECK (total_amount = unit_price * quantity),
    CONSTRAINT valid_commission_split CHECK (
        (vendor_amount + platform_fee) <= total_amount OR 
        (vendor_amount = 0 AND platform_fee = 0)
    )
);

-- Indexes for orders table
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_external_id ON orders(external_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_payout_status ON orders(payout_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);

-- Integrations table
CREATE TABLE integrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'analytics', 'crm', 'payment', 'shipping', 'custom')),
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique constraint per user and type
    CONSTRAINT unique_integration_per_user_type UNIQUE (user_id, type)
);

-- Indexes for integrations table
CREATE INDEX idx_integrations_user_id ON integrations(user_id);
CREATE INDEX idx_integrations_type ON integrations(type);
CREATE INDEX idx_integrations_is_active ON integrations(is_active);

-- Webhook logs table (for monitoring webhook events)
CREATE TABLE webhook_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    external_id VARCHAR(100),
    payload JSONB NOT NULL,
    headers JSONB,
    processed BOOLEAN DEFAULT false,
    error_message TEXT,
    response_status INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for webhook logs table
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_external_id ON webhook_logs(external_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_processed ON webhook_logs(processed);

-- Audit logs table (for important system events)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for audit logs table
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Refresh tokens table (for JWT token management)
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for refresh tokens table
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at 
    BEFORE UPDATE ON integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log user actions
CREATE OR REPLACE FUNCTION log_user_action()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
        VALUES (NEW.id, 'USER_CREATED', 'user', NEW.id, row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
        VALUES (NEW.id, 'USER_UPDATED', 'user', NEW.id, row_to_json(OLD), row_to_json(NEW));
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user actions logging
CREATE TRIGGER log_user_changes
    AFTER INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION log_user_action();

-- Function to handle order status changes
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log order status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
        VALUES (
            NEW.customer_id, 
            'ORDER_STATUS_CHANGED', 
            'order', 
            NEW.id, 
            json_build_object('status', OLD.status),
            json_build_object('status', NEW.status)
        );
    END IF;
    
    -- Update vendor sales count when order is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE users 
        SET sales_count = sales_count + 1,
            total_revenue = total_revenue + NEW.total_amount
        WHERE id = NEW.vendor_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for order status changes
CREATE TRIGGER handle_order_updates
    AFTER UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION handle_order_status_change();

-- Function to check product stock before order creation
CREATE OR REPLACE FUNCTION check_product_stock()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    SELECT stock_quantity INTO current_stock 
    FROM products 
    WHERE id = NEW.product_id;
    
    IF current_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product ID %: requested %, available %', 
            NEW.product_id, NEW.quantity, current_stock;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to check stock before order creation
CREATE TRIGGER check_stock_before_order
    BEFORE INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION check_product_stock();

-- Function to update product stock after order payment
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrement stock when payment is successful
    IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
        UPDATE products 
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.product_id;
    END IF;
    
    -- Restore stock when order is cancelled or refunded
    IF (NEW.status IN ('cancelled', 'refunded') AND OLD.status NOT IN ('cancelled', 'refunded'))
       OR (NEW.payment_status = 'refunded' AND OLD.payment_status != 'refunded') THEN
        UPDATE products 
        SET stock_quantity = stock_quantity + NEW.quantity
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update stock on order changes
CREATE TRIGGER update_stock_on_order_change
    AFTER UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Views for common queries

-- View for vendor statistics
CREATE VIEW vendor_stats AS
SELECT 
    u.id as vendor_id,
    u.email,
    u.sales_count,
    u.total_revenue,
    COUNT(p.id) as product_count,
    COUNT(o.id) as total_orders,
    AVG(o.rating) as average_rating,
    COUNT(o.rating) as review_count
FROM users u
LEFT JOIN products p ON u.id = p.vendor_id AND p.is_active = true
LEFT JOIN orders o ON u.id = o.vendor_id
WHERE u.role = 'vendor' AND u.is_active = true
GROUP BY u.id, u.email, u.sales_count, u.total_revenue;

-- View for product sales statistics
CREATE VIEW product_sales_stats AS
SELECT 
    p.id as product_id,
    p.name,
    p.vendor_id,
    COUNT(o.id) as total_orders,
    SUM(o.quantity) as total_quantity_sold,
    SUM(o.total_amount) as total_revenue,
    AVG(o.rating) as average_rating
FROM products p
LEFT JOIN orders o ON p.id = o.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.vendor_id;

-- View for monthly sales report
CREATE VIEW monthly_sales AS
SELECT 
    vendor_id,
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue,
    SUM(vendor_amount) as vendor_earnings,
    SUM(platform_fee) as platform_earnings
FROM orders
WHERE status = 'completed'
GROUP BY vendor_id, DATE_TRUNC('month', created_at);

-- Insert default admin user (password: Admin123!)
INSERT INTO users (email, password_hash, role, profile_data) VALUES
(
    'admin@tradefy.com',
    '$2y$12$LQv3c1yqBzwd0gSgKe.1OeRfK7WZRf8R8bVkYJjNkKq9pVrYhH6dS', -- Admin123!
    'admin',
    '{"first_name": "System", "last_name": "Administrator"}'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample categories
INSERT INTO products (vendor_id, name, description, price, category, tags, stock_quantity) VALUES
(1, 'Sample Digital Product', 'This is a sample digital product for demonstration.', 29.99, 'digital', '["sample", "digital"]', 0),
(1, 'Sample Physical Product', 'This is a sample physical product for demonstration.', 49.99, 'electronics', '["sample", "physical"]', 100)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_orders_completed_date ON orders(created_at) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY idx_products_active_vendor ON products(vendor_id, is_active);
CREATE INDEX CONCURRENTLY idx_users_vendor_active ON users(id, role) WHERE role = 'vendor' AND is_active = true;

-- Grant permissions (adjust according to your database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tradefy_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tradefy_user;

-- Comments on tables and columns
COMMENT ON TABLE users IS 'Stores user accounts including customers, vendors, and administrators';
COMMENT ON TABLE products IS 'Stores product information listed by vendors';
COMMENT ON TABLE orders IS 'Stores customer orders and transaction details';
COMMENT ON TABLE integrations IS 'Stores third-party service integrations for users';
COMMENT ON TABLE webhook_logs IS 'Logs webhook events for monitoring and debugging';
COMMENT ON TABLE audit_logs IS 'Audit trail for important system events and changes';
COMMENT ON TABLE refresh_tokens IS 'Manages JWT refresh tokens for user sessions';

COMMENT ON COLUMN users.sales_count IS 'Number of completed sales for vendor ranking system';
COMMENT ON COLUMN users.total_revenue IS 'Total revenue generated for commission calculations';
COMMENT ON COLUMN products.price IS 'Product price with validation for min/max values';
COMMENT ON COLUMN orders.commission_rate IS 'Commission rate in basis points (bps) applied to this order';
COMMENT ON COLUMN orders.platform_fee IS 'Platform commission amount deducted from total';
COMMENT ON COLUMN orders.vendor_amount IS 'Amount paid to vendor after commission deduction';