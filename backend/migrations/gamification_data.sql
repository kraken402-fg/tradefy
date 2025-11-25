-- Tradefy Gamification System Data
-- Initial data for commission ranks, quests, and achievements

-- Commission Ranks Data (already inserted in create_tables.sql, but here's the standalone version)
INSERT INTO commission_ranks (rank_name, min_sales, max_sales, commission_rate, quest_bonus_rate, display_name, description) VALUES
('profane', 0, 24, 450, 500, 'Profane', 'Beginner rank for new vendors - Start your journey with a 4.5% commission rate'),
('debutant', 25, 74, 425, 600, 'Débutant', 'Getting started with sales - Your commission drops to 4.25% as you grow'),
('marchand', 75, 227, 400, 700, 'Marchand', 'Established merchant - Reach 4.0% commission with better quest rewards'),
('negociant', 228, 554, 375, 800, 'Négociant', 'Experienced trader - Now at 3.75% commission with enhanced bonuses'),
('courtier', 555, 1004, 350, 900, 'Courtier', 'Professional broker - Achieve 3.5% commission rate'),
('magnat', 1005, 2849, 325, 1000, 'Magnat', 'Business magnate - Elite 3.25% commission with maximum quest rewards'),
('senior', 2850, NULL, 300, 0, 'Senior', 'Elite vendor status - Top tier at 3.0% commission, the platform''s best rate')
ON CONFLICT (rank_name) DO UPDATE SET
    min_sales = EXCLUDED.min_sales,
    max_sales = EXCLUDED.max_sales,
    commission_rate = EXCLUDED.commission_rate,
    quest_bonus_rate = EXCLUDED.quest_bonus_rate,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- Achievement Types
CREATE TABLE IF NOT EXISTS achievement_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    points INTEGER DEFAULT 0,
    category VARCHAR(100) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Achievements
CREATE TABLE IF NOT EXISTS vendor_achievements (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL,
    achievement_type VARCHAR(100) NOT NULL,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress_data JSONB DEFAULT '{}',
    
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_type) REFERENCES achievement_types(code) ON DELETE CASCADE,
    UNIQUE(vendor_id, achievement_type)
);

-- Insert Achievement Types
INSERT INTO achievement_types (code, name, description, icon_url, points, category) VALUES
-- Sales Milestones
('first_sale', 'First Sale', 'Complete your very first sale on Tradefy', '/icons/first-sale.png', 100, 'sales'),
('10_sales', '10 Sales', 'Reach 10 total sales', '/icons/10-sales.png', 250, 'sales'),
('50_sales', '50 Sales', 'Reach 50 total sales', '/icons/50-sales.png', 500, 'sales'),
('100_sales', 'Century Club', 'Achieve 100 sales', '/icons/100-sales.png', 1000, 'sales'),
('500_sales', 'Elite Seller', 'Reach 500 total sales', '/icons/500-sales.png', 2500, 'sales'),
('1000_sales', 'Master Vendor', 'Achieve 1000 sales milestone', '/icons/1000-sales.png', 5000, 'sales'),

-- Revenue Milestones
('first_revenue', 'First Earnings', 'Earn your first $10 in revenue', '/icons/first-revenue.png', 100, 'revenue'),
('100_revenue', '$100 Club', 'Earn $100 in total revenue', '/icons/100-revenue.png', 250, 'revenue'),
('1000_revenue', '$1K Achiever', 'Reach $1,000 in total revenue', '/icons/1000-revenue.png', 1000, 'revenue'),
('5000_revenue', '$5K Professional', 'Earn $5,000 in total revenue', '/icons/5000-revenue.png', 2500, 'revenue'),
('10000_revenue', '$10K Expert', 'Achieve $10,000 in total revenue', '/icons/10000-revenue.png', 5000, 'revenue'),

-- Rank Achievements
('rank_debutant', 'No Longer Rookie', 'Advance from Profane to Débutant rank', '/icons/rank-debutant.png', 300, 'rank'),
('rank_marchand', 'Rising Star', 'Reach Marchand rank', '/icons/rank-marchand.png', 600, 'rank'),
('rank_negociant', 'Established Trader', 'Achieve Négociant rank', '/icons/rank-negociant.png', 1200, 'rank'),
('rank_courtier', 'Professional Broker', 'Reach Courtier rank', '/icons/rank-courtier.png', 2400, 'rank'),
('rank_magnat', 'Business Magnate', 'Achieve Magnat rank', '/icons/rank-magnat.png', 4800, 'rank'),
('rank_senior', 'Elite Vendor', 'Reach the highest Senior rank', '/icons/rank-senior.png', 10000, 'rank'),

-- Product Achievements
('first_product', 'Product Pioneer', 'List your first product for sale', '/icons/first-product.png', 100, 'products'),
('5_products', 'Product Portfolio', 'Have 5 active products listed', '/icons/5-products.png', 250, 'products'),
('10_products', 'Product Powerhouse', 'Maintain 10 active products', '/icons/10-products.png', 500, 'products'),
('25_products', 'Product Empire', 'Manage 25 active products', '/icons/25-products.png', 1000, 'products'),

-- Rating Achievements
('first_review', 'First Impression', 'Receive your first customer review', '/icons/first-review.png', 100, 'ratings'),
('5_star_rating', 'Perfection', 'Receive a 5-star rating', '/icons/5-star.png', 200, 'ratings'),
('rating_4', 'Highly Rated', 'Maintain a 4.0+ average rating with 10+ reviews', '/icons/rating-4.png', 500, 'ratings'),
('rating_4.5', 'Exceptional Service', 'Maintain a 4.5+ average rating with 25+ reviews', '/icons/rating-4.5.png', 1000, 'ratings'),

-- Quest Achievements
('quest_complete', 'Quest Master', 'Complete your first rank quest', '/icons/quest-complete.png', 300, 'quests'),
('5_quests', 'Quest Veteran', 'Complete 5 rank quests', '/icons/5-quests.png', 750, 'quests'),
('10_quests', 'Quest Champion', 'Complete 10 rank quests', '/icons/10-quests.png', 1500, 'quests'),

-- Special Achievements
('quick_starter', 'Quick Starter', 'Make 5 sales in your first week', '/icons/quick-starter.png', 500, 'special'),
('consistent_seller', 'Consistent Seller', 'Make sales for 30 consecutive days', '/icons/consistent-seller.png', 1000, 'special'),
('holiday_special', 'Holiday Star', 'Make sales during a holiday season', '/icons/holiday-special.png', 750, 'special'),
('returning_customers', 'Customer Favorite', 'Have 10+ returning customers', '/icons/returning-customers.png', 1200, 'special')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_url = EXCLUDED.icon_url,
    points = EXCLUDED.points,
    category = EXCLUDED.category;

-- Vendor Stats Summary Table (for gamification calculations)
CREATE TABLE IF NOT EXISTS vendor_stats_summary (
    vendor_id INTEGER PRIMARY KEY,
    total_sales INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    current_rank VARCHAR(50) DEFAULT 'profane',
    achievement_points INTEGER DEFAULT 0,
    quests_completed INTEGER DEFAULT 0,
    current_streak_days INTEGER DEFAULT 0,
    best_streak_days INTEGER DEFAULT 0,
    last_sale_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (current_rank) REFERENCES commission_ranks(rank_name)
);

-- Function to update vendor stats and check for achievements
CREATE OR REPLACE FUNCTION update_vendor_gamification_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_vendor_id INTEGER;
    v_sales_count INTEGER;
    v_total_revenue DECIMAL;
    v_current_rank VARCHAR;
    v_previous_rank VARCHAR;
    v_achievement_points INTEGER;
BEGIN
    -- Determine vendor ID based on the table being updated
    IF TG_TABLE_NAME = 'users' THEN
        v_vendor_id := NEW.id;
        v_sales_count := NEW.sales_count;
        v_total_revenue := NEW.total_revenue;
    ELSIF TG_TABLE_NAME = 'orders' THEN
        v_vendor_id := NEW.vendor_id;
        SELECT sales_count, total_revenue INTO v_sales_count, v_total_revenue
        FROM users WHERE id = v_vendor_id;
    END IF;

    -- Get current rank
    SELECT rank_name INTO v_current_rank
    FROM commission_ranks 
    WHERE min_sales <= v_sales_count 
    AND (max_sales IS NULL OR v_sales_count <= max_sales)
    ORDER BY min_sales DESC
    LIMIT 1;

    -- Get previous rank from stats summary
    SELECT current_rank INTO v_previous_rank
    FROM vendor_stats_summary 
    WHERE vendor_id = v_vendor_id;

    -- Update or insert vendor stats
    INSERT INTO vendor_stats_summary (vendor_id, total_sales, total_revenue, current_rank, updated_at)
    VALUES (v_vendor_id, v_sales_count, v_total_revenue, v_current_rank, NOW())
    ON CONFLICT (vendor_id) DO UPDATE SET
        total_sales = EXCLUDED.total_sales,
        total_revenue = EXCLUDED.total_revenue,
        current_rank = EXCLUDED.current_rank,
        updated_at = EXCLUDED.updated_at;

    -- Check for rank upgrade achievement
    IF v_previous_rank IS NOT NULL AND v_current_rank != v_previous_rank THEN
        INSERT INTO vendor_achievements (vendor_id, achievement_type)
        VALUES (v_vendor_id, 'rank_' || v_current_rank)
        ON CONFLICT (vendor_id, achievement_type) DO NOTHING;
    END IF;

    -- Check for sales milestone achievements
    IF v_sales_count >= 1 THEN
        INSERT INTO vendor_achievements (vendor_id, achievement_type)
        VALUES (v_vendor_id, 'first_sale')
        ON CONFLICT (vendor_id, achievement_type) DO NOTHING;
    END IF;

    IF v_sales_count >= 10 THEN
        INSERT INTO vendor_achievements (vendor_id, achievement_type)
        VALUES (v_vendor_id, '10_sales')
        ON CONFLICT (vendor_id, achievement_type) DO NOTHING;
    END IF;

    IF v_sales_count >= 50 THEN
        INSERT INTO vendor_achievements (vendor_id, achievement_type)
        VALUES (v_vendor_id, '50_sales')
        ON CONFLICT (vendor_id, achievement_type) DO NOTHING;
    END IF;

    IF v_sales_count >= 100 THEN
        INSERT INTO vendor_achievements (vendor_id, achievement_type)
        VALUES (v_vendor_id, '100_sales')
        ON CONFLICT (vendor_id, achievement_type) DO NOTHING;
    END IF;

    -- Check for revenue milestone achievements
    IF v_total_revenue >= 10 THEN
        INSERT INTO vendor_achievements (vendor_id, achievement_type)
        VALUES (v_vendor_id, 'first_revenue')
        ON CONFLICT (vendor_id, achievement_type) DO NOTHING;
    END IF;

    IF v_total_revenue >= 100 THEN
        INSERT INTO vendor_achievements (vendor_id, achievement_type)
        VALUES (v_vendor_id, '100_revenue')
        ON CONFLICT (vendor_id, achievement_type) DO NOTHING;
    END IF;

    -- Update achievement points
    SELECT COALESCE(SUM(at.points), 0) INTO v_achievement_points
    FROM vendor_achievements va
    JOIN achievement_types at ON va.achievement_type = at.code
    WHERE va.vendor_id = v_vendor_id;

    UPDATE vendor_stats_summary 
    SET achievement_points = v_achievement_points
    WHERE vendor_id = v_vendor_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for gamification updates
CREATE TRIGGER gamification_update_users 
    AFTER UPDATE OF sales_count, total_revenue ON users
    FOR EACH ROW 
    WHEN (NEW.role = 'vendor')
    EXECUTE FUNCTION update_vendor_gamification_stats();

CREATE TRIGGER gamification_update_orders 
    AFTER INSERT ON orders
    FOR EACH ROW 
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_vendor_gamification_stats();

-- View for vendor gamification dashboard
CREATE OR REPLACE VIEW vendor_gamification_dashboard AS
SELECT 
    u.id as vendor_id,
    u.email,
    u.sales_count,
    u.total_revenue,
    vs.current_rank,
    vs.achievement_points,
    vs.quests_completed,
    cr.commission_rate,
    cr.quest_bonus_rate,
    (SELECT COUNT(*) FROM vendor_achievements va WHERE va.vendor_id = u.id) as total_achievements,
    (SELECT COUNT(*) FROM products p WHERE p.vendor_id = u.id AND p.is_active = true) as active_products,
    (SELECT AVG(rating) FROM orders WHERE vendor_id = u.id AND rating IS NOT NULL) as average_rating,
    
    -- Next rank info
    nr.rank_name as next_rank,
    nr.min_sales as next_rank_min_sales,
    GREATEST(0, nr.min_sales - u.sales_count) as sales_to_next_rank,
    ROUND((u.sales_count::DECIMAL / nr.min_sales) * 100, 2) as rank_progress_percentage,
    
    -- Current quest info
    CASE 
        WHEN cr.max_sales IS NOT NULL THEN 
            JSON_BUILD_OBJECT(
                'quest_start', cr.max_sales,
                'quest_length', FLOOR(cr.max_sales / 5),
                'quest_end', cr.max_sales + FLOOR(cr.max_sales / 5),
                'current_progress', GREATEST(0, LEAST(100, ((u.sales_count - cr.max_sales)::DECIMAL / FLOOR(cr.max_sales / 5)) * 100)),
                'is_completed', u.sales_count >= (cr.max_sales + FLOOR(cr.max_sales / 5))
            )
        ELSE NULL
    END as current_quest
    
FROM users u
JOIN vendor_stats_summary vs ON u.id = vs.vendor_id
JOIN commission_ranks cr ON vs.current_rank = cr.rank_name
LEFT JOIN commission_ranks nr ON nr.min_sales = (
    SELECT MIN(min_sales) 
    FROM commission_ranks 
    WHERE min_sales > u.sales_count
)
WHERE u.role = 'vendor' AND u.is_active = true;

-- Function to get vendor achievement progress
CREATE OR REPLACE FUNCTION get_vendor_achievement_progress(p_vendor_id INTEGER)
RETURNS TABLE(
    achievement_code VARCHAR,
    achievement_name VARCHAR,
    achievement_description TEXT,
    points INTEGER,
    category VARCHAR,
    is_achieved BOOLEAN,
    achieved_at TIMESTAMP,
    progress_current INTEGER,
    progress_target INTEGER,
    progress_percentage INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        at.code as achievement_code,
        at.name as achievement_name,
        at.description as achievement_description,
        at.points as points,
        at.category as category,
        (va.vendor_id IS NOT NULL) as is_achieved,
        va.achieved_at as achieved_at,
        
        -- Progress calculations for different achievement types
        CASE 
            WHEN at.code LIKE '%sales' THEN
                (SELECT sales_count FROM users WHERE id = p_vendor_id)
            WHEN at.code LIKE '%revenue' THEN
                (SELECT total_revenue FROM users WHERE id = p_vendor_id)
            WHEN at.code LIKE '%products' THEN
                (SELECT COUNT(*) FROM products WHERE vendor_id = p_vendor_id AND is_active = true)
            ELSE 0
        END as progress_current,
        
        -- Target calculations
        CASE 
            WHEN at.code = '10_sales' THEN 10
            WHEN at.code = '50_sales' THEN 50
            WHEN at.code = '100_sales' THEN 100
            WHEN at.code = '100_revenue' THEN 100
            WHEN at.code = '1000_revenue' THEN 1000
            WHEN at.code = '5_products' THEN 5
            WHEN at.code = '10_products' THEN 10
            ELSE 1
        END as progress_target,
        
        -- Progress percentage
        CASE 
            WHEN at.code LIKE '%sales' THEN
                LEAST(100, ROUND((SELECT sales_count FROM users WHERE id = p_vendor_id)::DECIMAL / 
                CASE 
                    WHEN at.code = '10_sales' THEN 10
                    WHEN at.code = '50_sales' THEN 50
                    WHEN at.code = '100_sales' THEN 100
                    ELSE 1
                END * 100))
            WHEN at.code LIKE '%revenue' THEN
                LEAST(100, ROUND((SELECT total_revenue FROM users WHERE id = p_vendor_id) / 
                CASE 
                    WHEN at.code = '100_revenue' THEN 100
                    WHEN at.code = '1000_revenue' THEN 1000
                    ELSE 1
                END * 100))
            WHEN at.code LIKE '%products' THEN
                LEAST(100, ROUND((SELECT COUNT(*) FROM products WHERE vendor_id = p_vendor_id AND is_active = true)::DECIMAL / 
                CASE 
                    WHEN at.code = '5_products' THEN 5
                    WHEN at.code = '10_products' THEN 10
                    ELSE 1
                END * 100))
            ELSE 
                CASE WHEN va.vendor_id IS NOT NULL THEN 100 ELSE 0 END
        END as progress_percentage
        
    FROM achievement_types at
    LEFT JOIN vendor_achievements va ON at.code = va.achievement_type AND va.vendor_id = p_vendor_id
    WHERE at.is_active = true
    ORDER BY at.category, at.points DESC;
END;
$$ LANGUAGE plpgsql;

-- Indexes for gamification performance
CREATE INDEX IF NOT EXISTS idx_vendor_achievements_vendor_id ON vendor_achievements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_achievements_type ON vendor_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievement_types_category ON achievement_types(category);
CREATE INDEX IF NOT EXISTS idx_vendor_stats_summary_rank ON vendor_stats_summary(current_rank);