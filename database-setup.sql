-- ============================================
-- PickNPay Inventory Management System
-- Complete Database Setup Script
-- 
-- This script creates the complete database schema
-- for the PickNPay Inventory Management System
-- ============================================

-- ============================================
-- 1. CREATE DATABASE (if not exists)
-- ============================================

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE picknpay_inventory'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'picknpay_inventory')\gexec

-- Connect to the database
\c picknpay_inventory;

-- ============================================
-- 2. DROP EXISTING TABLES (if they exist)
-- ============================================

-- Drop tables in reverse dependency order to avoid foreign key constraints
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 3. CREATE TABLES
-- ============================================

-- Create users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('ADMIN', 'USER')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create company_settings table
CREATE TABLE company_settings (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL DEFAULT 'PickNPay',
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    tax_number VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_on_pos BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create items table (Master Data)
-- FIXED: category_id can be NULL for items without category
CREATE TABLE items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    barcode VARCHAR(255) UNIQUE, -- Can be NULL for items without barcode
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL, -- FIXED: SET NULL instead of CASCADE
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create batches table (Inventory Tracking)
CREATE TABLE batches (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    batch_id VARCHAR(255) NOT NULL,
    expiry_date DATE, -- Can be NULL for non-perishable items
    manufacture_date DATE, -- Can be NULL
    quantity INTEGER NOT NULL DEFAULT 0,
    received_date DATE, -- Can be NULL
    supplier_id VARCHAR(255), -- Can be NULL
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, batch_id)
);

-- Create sales table
CREATE TABLE sales (
    id BIGSERIAL PRIMARY KEY,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    subtotal_amount DECIMAL(10,2), -- Can be NULL for old sales
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_type VARCHAR(20), -- Can be NULL
    discount_value DECIMAL(10,2), -- Can be NULL
    sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(10) NOT NULL CHECK (payment_method IN ('CASH', 'CARD')),
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL, -- FIXED: SET NULL instead of CASCADE
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create sale_items table
CREATE TABLE sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    item_id BIGINT REFERENCES items(id) ON DELETE SET NULL, -- FIXED: Can be NULL for quick sales
    item_name VARCHAR(255) NOT NULL,
    item_barcode VARCHAR(255), -- Can be NULL
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
    batch_id VARCHAR(255), -- Can be NULL
    vat_rate DECIMAL(5,2), -- Can be NULL
    vat_amount DECIMAL(10,2), -- Can be NULL
    price_excluding_vat DECIMAL(10,2), -- Can be NULL
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Items indexes
CREATE INDEX idx_items_name ON items(name);
CREATE INDEX idx_items_barcode ON items(barcode);
CREATE INDEX idx_items_category_id ON items(category_id);

-- Batches indexes
CREATE INDEX idx_batches_product_id ON batches(product_id);
CREATE INDEX idx_batches_expiry_date ON batches(expiry_date);
CREATE INDEX idx_batches_batch_id ON batches(batch_id);

-- Sales indexes
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);

-- Sale items indexes
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_item_id ON sale_items(item_id);

-- ============================================
-- 5. INSERT INITIAL DATA
-- ============================================

-- Insert admin user with BCrypt encoded password for "admin123"
INSERT INTO users (username, email, password, full_name, role, is_active) VALUES
('admin', 'admin@picknpay.com', '$2a$10$Zsk8XbjYk3FiVDKjrCKu.O9KrtQ1985FD2Qw4FsdMWt4GjCSIB5j6', 'System Administrator', 'ADMIN', true);

-- Insert company settings
INSERT INTO company_settings (company_name, address, phone, email, tax_number) VALUES
('PickNPay', 
'123 Main Street, Dublin, Ireland', 
'+353-1-234-5678', 
'info@picknpay.com', 
'IE123456789');

-- Insert sample categories
INSERT INTO categories (name, description, is_active, display_on_pos) VALUES
('Beverages', 'Soft drinks, juices, and other beverages', true, true),
('Food', 'Food items and snacks', true, true),
('Dairy', 'Milk, cheese, and dairy products', true, true),
('Bakery', 'Bread, pastries, and baked goods', true, true);

-- Insert sample items
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate, category_id) VALUES
('Coca Cola 330ml', 'Refreshing soft drink', 2.50, 100, '1234567890123', 23.00, 1),
('Bread Loaf', 'Fresh white bread', 3.00, 50, '2345678901234', 0.00, 4),
('Milk 1L', 'Fresh whole milk', 2.80, 75, '3456789012345', 0.00, 3),
('Chocolate Bar', 'Milk chocolate bar', 1.50, 200, '4567890123456', 23.00, 2),
('Apple', 'Fresh red apples', 0.80, 150, '5678901234567', 0.00, 2);

-- ============================================
-- 6. CREATE TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

-- Grant all privileges to postgres user
GRANT ALL PRIVILEGES ON DATABASE picknpay_inventory TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ============================================
-- 8. VERIFICATION QUERIES
-- ============================================

-- Verify tables were created
SELECT 'Tables created:' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Verify admin user was created
SELECT 'Admin user created:' as status;
SELECT username, email, role, is_active FROM users WHERE role = 'ADMIN';

-- Verify sample data
SELECT 'Sample categories:' as status;
SELECT id, name, is_active FROM categories;

SELECT 'Sample items:' as status;
SELECT id, name, price, vat_rate, stock_quantity FROM items LIMIT 5;

-- ============================================
-- 9. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'PickNPay Database Setup Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Database: picknpay_inventory';
    RAISE NOTICE 'Admin User:';
    RAISE NOTICE '  Username: admin';
    RAISE NOTICE '  Password: admin123';
    RAISE NOTICE '  Email: admin@picknpay.com';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Features Included:';
    RAISE NOTICE '- User management (ADMIN/USER roles)';
    RAISE NOTICE '- Company settings configuration';
    RAISE NOTICE '- Category management';
    RAISE NOTICE '- Item management with VAT support';
    RAISE NOTICE '- Batch tracking with expiry dates';
    RAISE NOTICE '- Sales tracking with payment methods';
    RAISE NOTICE '- Sale items with VAT calculations';
    RAISE NOTICE '- Discount support for sales';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Start the Spring Boot application';
    RAISE NOTICE '2. Login with admin credentials';
    RAISE NOTICE '3. Configure company settings';
    RAISE NOTICE '4. Add more categories and items';
    RAISE NOTICE '5. Create batches for inventory tracking';
    RAISE NOTICE '============================================';
END $$;
