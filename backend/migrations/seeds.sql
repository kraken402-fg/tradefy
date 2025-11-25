-- Tradefy v3 - Sample Data
-- Use this for development and testing environments

-- Insert sample vendors
INSERT INTO users (email, password_hash, role, sales_count, total_revenue, profile_data) VALUES
(
    'techstore@tradefy.com',
    '$2y$12$LQv3c1yqBzwd0gSgKe.1OeRfK7WZRf8R8bVkYJjNkKq9pVrYhH6dS', -- Vendor123!
    'vendor',
    45,
    12500.00,
    '{
        "store_name": "Tech Galaxy",
        "description": "Your one-stop shop for the latest technology gadgets and electronics",
        "contact_email": "techstore@tradefy.com",
        "social_links": {
            "website": "https://techgalaxy.example.com",
            "twitter": "@techgalaxy"
        },
        "business_address": {
            "country": "USA",
            "city": "San Francisco"
        }
    }'
),
(
    'fashionhub@tradefy.com',
    '$2y$12$LQv3c1yqBzwd0gSgKe.1OeRfK7WZRf8R8bVkYJjNkKq9pVrYhH6dS', -- Vendor123!
    'vendor',
    128,
    32000.00,
    '{
        "store_name": "Fashion Hub",
        "description": "Trendy fashion and accessories for the modern individual",
        "contact_email": "fashionhub@tradefy.com", 
        "social_links": {
            "instagram": "@fashionhubofficial",
            "website": "https://fashionhub.example.com"
        },
        "business_address": {
            "country": "UK", 
            "city": "London"
        }
    }'
),
(
    'bookworld@tradefy.com',
    '$2y$12$LQv3c1yqBzwd0gSgKe.1OeRfK7WZRf8R8bVkYJjNkKq9pVrYhH6dS', -- Vendor123!
    'vendor',
    12,
    450.00,
    '{
        "store_name": "Book World",
        "description": "Curated collection of books across all genres",
        "contact_email": "bookworld@tradefy.com",
        "social_links": {
            "facebook": "bookworld",
            "website": "https://bookworld.example.com"
        },
        "business_address": {
            "country": "Canada",
            "city": "Toronto"
        }
    }'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample customers
INSERT INTO users (email, password_hash, role, profile_data) VALUES
(
    'customer1@tradefy.com',
    '$2y$12$LQv3c1yqBzwd0gSgKe.1OeRfK7WZRf8R8bVkYJjNkKq9pVrYhH6dS', -- Customer123!
    'user',
    '{
        "first_name": "John",
        "last_name": "Doe",
        "phone": "+1234567890",
        "shipping_address": {
            "street": "123 Main St",
            "city": "New York",
            "country": "USA",
            "zip_code": "10001"
        }
    }'
),
(
    'customer2@tradefy.com', 
    '$2y$12$LQv3c1yqBzwd0gSgKe.1OeRfK7WZRf8R8bVkYJjNkKq9pVrYhH6dS', -- Customer123!
    'user',
    '{
        "first_name": "Jane",
        "last_name": "Smith", 
        "phone": "+1987654321",
        "shipping_address": {
            "street": "456 Oak Ave",
            "city": "Los Angeles", 
            "country": "USA",
            "zip_code": "90210"
        }
    }'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample products for Tech Galaxy
INSERT INTO products (vendor_id, name, description, price, currency, category, tags, images, stock_quantity, is_digital) VALUES
(
    (SELECT id FROM users WHERE email = 'techstore@tradefy.com'),
    'Wireless Bluetooth Headphones',
    'High-quality wireless headphones with noise cancellation and 30-hour battery life',
    129.99,
    'USD',
    'electronics',
    '["audio", "wireless", "bluetooth", "headphones"]',
    '["https://example.com/images/headphones1.jpg", "https://example.com/images/headphones2.jpg"]',
    50,
    false
),
(
    (SELECT id FROM users WHERE email = 'techstore@tradefy.com'),
    'Smartphone Stand',
    'Adjustable aluminum smartphone stand compatible with all devices',
    24.99, 
    'USD',
    'accessories',
    '["phone", "stand", "accessory", "aluminum"]',
    '["https://example.com/images/stand1.jpg"]',
    100,
    false
),
(
    (SELECT id FROM users WHERE email = 'techstore@tradefy.com'),
    'Premium USB-C Cable',
    'Durable 6ft USB-C to USB-C cable with fast charging support',
    19.99,
    'USD', 
    'accessories',
    '["cable", "usb-c", "charging", "premium"]',
    '["https://example.com/images/cable1.jpg"]',
    200,
    false
),
(
    (SELECT id FROM users WHERE email = 'techstore@tradefy.com'),
    'Digital Photography Course',
    'Complete online course covering photography basics to advanced techniques',
    89.99,
    'USD',
    'education',
    '["course", "photography", "digital", "education"]',
    '["https://example.com/images/course1.jpg"]',
    0,
    true
);

-- Insert sample products for Fashion Hub
INSERT INTO products (vendor_id, name, description, price, currency, category, tags, images, stock_quantity, is_digital) VALUES
(
    (SELECT id FROM users WHERE email = 'fashionhub@tradefy.com'),
    'Classic White T-Shirt',
    '100% cotton premium t-shirt with perfect fit and comfortable feel',
    29.99,
    'USD',
    'clothing',
    '["clothing", "tshirt", "cotton", "basic"]',
    '["https://example.com/images/tshirt1.jpg", "https://example.com/images/tshirt2.jpg"]',
    150,
    false
),
(
    (SELECT id FROM users WHERE email = 'fashionhub@tradefy.com'), 
    'Designer Leather Wallet',
    'Genuine leather wallet with multiple card slots and coin pocket',
    79.99,
    'USD',
    'accessories',
    '["wallet", "leather", "designer", "accessory"]',
    '["https://example.com/images/wallet1.jpg"]',
    75,
    false
),
(
    (SELECT id FROM users WHERE email = 'fashionhub@tradefy.com'),
    'Summer Dress',
    'Lightweight and comfortable summer dress perfect for warm weather',
    49.99,
    'USD',
    'clothing', 
    '["dress", "summer", "fashion", "women"]',
    '["https://example.com/images/dress1.jpg", "https://example.com/images/dress2.jpg"]',
    60,
    false
);

-- Insert sample products for Book World  
INSERT INTO products (vendor_id, name, description, price, currency, category, tags, images, stock_quantity, is_digital, file_url) VALUES
(
    (SELECT id FROM users WHERE email = 'bookworld@tradefy.com'),
    'The Great Gatsby',
    'Classic novel by F. Scott Fitzgerald in digital format',
    9.99,
    'USD',
    'books',
    '["fiction", "classic", "literature", "digital"]',
    '["https://example.com/images/gatsby.jpg"]',
    0,
    true,
    'https://example.com/books/gatsby.pdf'
),
(
    (SELECT id FROM users WHERE email = 'bookworld@tradefy.com'),
    'Python Programming Guide',
    'Comprehensive guide to Python programming for beginners to advanced',
    24.99,
    'USD', 
    'education',
    '["programming", "python", "education", "digital"]',
    '["https://example.com/images/python.jpg"]',
    0,
    true,
    'https://example.com/books/python.pdf'
),
(
    (SELECT id FROM users WHERE email = 'bookworld@tradefy.com'),
    'Cookbook: Healthy Recipes',
    'Collection of 100+ healthy and delicious recipes with nutritional info',
    19.99,
    'USD',
    'cooking', 
    '["cookbook", "recipes", "health", "food"]',
    '["https://example.com/images/cookbook.jpg"]',
    25,
    false,
    null
);

-- Insert sample orders
INSERT INTO orders (customer_id, vendor_id, product_id, external_id, status, quantity, unit_price, total_amount, currency, commission_rate, platform_fee, vendor_amount, customer_email, payment_status, payout_status) VALUES
(
    (SELECT id FROM users WHERE email = 'customer1@tradefy.com'),
    (SELECT id FROM users WHERE email = 'techstore@tradefy.com'),
    (SELECT id FROM products WHERE name = 'Wireless Bluetooth Headphones'),
    'ord_' || substr(md5(random()::text), 1, 10),
    'completed',
    1,
    129.99,
    129.99,
    'USD',
    425,
    5.52,
    124.47,
    'customer1@tradefy.com',
    'paid',
    'paid'
),
(
    (SELECT id FROM users WHERE email = 'customer2@tradefy.com'),
    (SELECT id FROM users WHERE email = 'fashionhub@tradefy.com'), 
    (SELECT id FROM products WHERE name = 'Classic White T-Shirt'),
    'ord_' || substr(md5(random()::text), 1, 10),
    'completed',
    2,
    29.99,
    59.98,
    'USD',
    400,
    2.40,
    57.58,
    'customer2@tradefy.com',
    'paid',
    'paid'
),
(
    (SELECT id FROM users WHERE email = 'customer1@tradefy.com'),
    (SELECT id FROM users WHERE email = 'bookworld@tradefy.com'),
    (SELECT id FROM products WHERE name = 'Python Programming Guide'),
    'ord_' || substr(md5(random()::text), 1, 10),
    'completed', 
    1,
    24.99,
    24.99,
    'USD',
    450,
    1.12,
    23.87,
    'customer1@tradefy.com',
    'paid',
    'paid'
);

-- Insert sample reviews
UPDATE orders SET rating = 5, review = 'Excellent headphones! Great sound quality and comfortable fit.' 
WHERE external_id IN (SELECT external_id FROM orders LIMIT 1);

UPDATE orders SET rating = 4, review = 'Good quality t-shirts, would order again.'
WHERE external_id IN (SELECT external_id FROM orders LIMIT 1 OFFSET 1);

-- Insert sample integrations
INSERT INTO integrations (user_id, type, name, config, is_active) VALUES
(
    (SELECT id FROM users WHERE email = 'techstore@tradefy.com'),
    'email',
    'Business Email',
    '{
        "smtp_host": "smtp.techgalaxy.com",
        "smtp_port": 587,
        "username": "notifications@techgalaxy.com", 
        "encryption": "tls"
    }',
    true
),
(
    (SELECT id FROM users WHERE email = 'fashionhub@tradefy.com'),
    'analytics',
    'Google Analytics',
    '{
        "tracking_id": "UA-123456789-1",
        "type": "google_analytics"
    }',
    true
);

-- Insert sample webhook logs (for testing)
INSERT INTO webhook_logs (event_type, external_id, payload, processed, response_status) VALUES
(
    'payment.succeeded',
    'ord_' || substr(md5(random()::text), 1, 10),
    '{
        "event_type": "payment.succeeded",
        "data": {
            "external_id": "ord_abc123",
            "amount": 129.99,
            "currency": "USD"
        }
    }',
    true,
    200
),
(
    'payout.succeeded', 
    'payout_ord_' || substr(md5(random()::text), 1, 10),
    '{
        "event_type": "payout.succeeded",
        "data": {
            "external_id": "payout_ord_abc123",
            "amount": 124.47,
            "currency": "USD"
        }
    }',
    true,
    200
);