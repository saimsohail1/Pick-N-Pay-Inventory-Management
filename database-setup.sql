-- ============================================
-- PickNPay Inventory Management System
-- Complete Database Setup Script
-- 
-- This script creates the complete database schema
-- for the PickNPay Inventory Management System
-- 
-- ✅ ALL MIGRATIONS INCLUDED - No need to run migrations separately
-- This setup script includes all features from migration files:
-- - hourly_pay_rate column in users table
-- - vat_rate column in categories table
-- - vat_rate column in items table
-- - notes column in sales table
-- - selected_vat_rate column in sales table
-- - website column in company_settings table
-- - eircode column in company_settings table
-- - vat_number column in company_settings table
-- - attendances table with all indexes (no unique constraints)
-- 
-- Includes all features:
-- - User management with hourly pay rates
-- - Company settings (with website, eircode, vat_number)
-- - Categories with VAT rates
-- - Items with VAT rates (inherited from categories)
-- - Batch tracking
-- - Sales with payment methods, notes, and selected VAT rates
-- - Attendance tracking (multiple entries per user per day allowed)
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
DROP TABLE IF EXISTS attendances CASCADE;
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
    hourly_pay_rate DECIMAL(10,2), -- Optional hourly pay rate for employee pay calculation
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create company_settings table
CREATE TABLE company_settings (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL DEFAULT 'ADAMS GREEN',
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    tax_number VARCHAR(50),
    eircode VARCHAR(10),
    vat_number VARCHAR(50),
    website VARCHAR(255),
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
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00, -- VAT rate per category
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create items table (Master Data)
-- category_id can be NULL for items without category
CREATE TABLE items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    barcode VARCHAR(255) UNIQUE, -- Can be NULL for items without barcode
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00, -- VAT rate (inherited from category or set manually)
    batch_id VARCHAR(255), -- Can be NULL for items without batch tracking
    general_expiry_date DATE, -- Can be NULL for non-perishable items (general expiry)
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
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
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Sales MUST have a user
    notes VARCHAR(1000), -- Optional notes for the sale transaction
    selected_vat_rate DECIMAL(5,2), -- VAT rate selected on the sales page (applies to all items in the sale)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create sale_items table
CREATE TABLE sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    item_id BIGINT REFERENCES items(id) ON DELETE SET NULL, -- Can be NULL for quick sales
    item_name VARCHAR(255) NOT NULL,
    item_barcode VARCHAR(255), -- Can be NULL
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
    batch_id VARCHAR(255), -- Can be NULL
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00, -- VAT rate is always calculated
    vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- VAT amount is always calculated
    price_excluding_vat DECIMAL(10,2) NOT NULL DEFAULT 0, -- Price excluding VAT is always calculated
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create attendances table
-- Note: No unique constraint - allows multiple attendance records per user per day
CREATE TABLE attendances (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    time_in TIME NOT NULL,
    time_out TIME, -- NULL if still clocked in
    total_hours DECIMAL(5,2), -- Calculated: time_out - time_in (in hours)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    -- Note: No unique constraint - allows one record per user per day
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

-- Attendances indexes
CREATE INDEX idx_attendances_user_id ON attendances(user_id);
CREATE INDEX idx_attendances_date ON attendances(attendance_date);
CREATE INDEX idx_attendances_user_date ON attendances(user_id, attendance_date);

-- ============================================
-- 5. INSERT INITIAL DATA
-- ============================================

-- Insert admin user with BCrypt encoded password for "admin123"
INSERT INTO users (username, email, password, full_name, role, is_active) VALUES
('admin', 'admin@picknpay.com', '$2a$10$Zsk8XbjYk3FiVDKjrCKu.O9KrtQ1985FD2Qw4FsdMWt4GjCSIB5j6', 'System Administrator', 'ADMIN', true);

-- Insert company settings
INSERT INTO company_settings (company_name, address, phone, email, tax_number) VALUES
('ADAMS GREEN', 
'123 Main Street, Dublin, Ireland', 
'+353-1-234-5678', 
'info@picknpay.com', 
'IE123456789');

-- Insert Quick Sale category only
INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate) VALUES
('Quick Sale', 'Quick sale items without specific category', true, true, 23.00);

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
CREATE TRIGGER update_sale_items_updated_at BEFORE UPDATE ON sale_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendances_updated_at BEFORE UPDATE ON attendances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Verify Quick Sale category
SELECT 'Quick Sale category:' as status;
SELECT id, name, is_active, vat_rate FROM categories WHERE name = 'Quick Sale';

-- Verify company settings
SELECT 'Company settings:' as status;
SELECT company_name, address FROM company_settings;

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
    RAISE NOTICE '- Hourly pay rate for employees';
    RAISE NOTICE '- Company settings configuration';
    RAISE NOTICE '- Category management with VAT rates';
    RAISE NOTICE '- Item management with VAT support';
    RAISE NOTICE '- Batch tracking with expiry dates';
    RAISE NOTICE '- Sales tracking with payment methods';
    RAISE NOTICE '- Sale notes support for transactions';
    RAISE NOTICE '- Sale items with VAT calculations';
    RAISE NOTICE '- Discount support for sales';
    RAISE NOTICE '- Employee attendance tracking';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Start the Spring Boot application';
    RAISE NOTICE '2. Login with admin credentials';
    RAISE NOTICE '3. Configure company settings';
    RAISE NOTICE '4. Add categories and items as needed';
    RAISE NOTICE '5. Quick Sale category is ready for immediate use';
    RAISE NOTICE '============================================';
END $$;
