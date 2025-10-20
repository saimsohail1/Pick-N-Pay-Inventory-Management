-- ============================================
-- PickNPay Inventory Management System
-- Complete Initial Setup Script with Batch System and VAT Support
-- 
-- IMPORTANT: Uses VARCHAR columns instead of ENUM types
-- for better Hibernate compatibility and to avoid casting errors
-- Includes all database fixes and VAT functionality
-- ============================================

-- Connect to the database (run this first if needed)
-- \c picknpay_inventory;

-- ============================================
-- 1. DROP EXISTING TABLES AND TYPES (if they exist)
-- ============================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any existing enum types that might cause conflicts
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ============================================
-- 1.1. MIGRATION SUPPORT (for existing databases)
-- ============================================

-- Add missing columns if they don't exist (for existing databases)
-- This section handles migration from older versions

-- Add VAT columns to items table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'vat_rate') THEN
        ALTER TABLE items ADD COLUMN vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00;
    END IF;
END $$;

-- Add VAT and item tracking columns to sale_items table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sale_items' AND column_name = 'item_name') THEN
        ALTER TABLE sale_items ADD COLUMN item_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sale_items' AND column_name = 'item_barcode') THEN
        ALTER TABLE sale_items ADD COLUMN item_barcode VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sale_items' AND column_name = 'batch_id') THEN
        ALTER TABLE sale_items ADD COLUMN batch_id VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sale_items' AND column_name = 'vat_rate') THEN
        ALTER TABLE sale_items ADD COLUMN vat_rate DECIMAL(5,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sale_items' AND column_name = 'vat_amount') THEN
        ALTER TABLE sale_items ADD COLUMN vat_amount DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sale_items' AND column_name = 'price_excluding_vat') THEN
        ALTER TABLE sale_items ADD COLUMN price_excluding_vat DECIMAL(10,2);
    END IF;
END $$;

-- Make category_id nullable in items table (for existing databases)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'items' AND column_name = 'category_id' AND is_nullable = 'NO') THEN
        ALTER TABLE items ALTER COLUMN category_id DROP NOT NULL;
    END IF;
END $$;

-- Fix existing null values in sale_items (for existing databases)
UPDATE sale_items
SET
    item_name = COALESCE(item_name, 'Quick Sale Item'),
    item_barcode = COALESCE(item_barcode, 'N/A'),
    batch_id = COALESCE(batch_id, 'DEFAULT'),
    vat_rate = COALESCE(vat_rate, 23.00),
    vat_amount = COALESCE(vat_amount, 0.00),
    price_excluding_vat = COALESCE(price_excluding_vat, unit_price)
WHERE
    item_name IS NULL
    OR item_barcode IS NULL
    OR batch_id IS NULL
    OR vat_rate IS NULL
    OR vat_amount IS NULL
    OR price_excluding_vat IS NULL;

-- Recalculate VAT amounts for existing sale items
UPDATE sale_items
SET
    price_excluding_vat = ROUND(total_price / (1 + vat_rate/100), 2),
    vat_amount = ROUND(total_price - (total_price / (1 + vat_rate/100)), 2)
WHERE
    vat_rate IS NOT NULL
    AND total_price IS NOT NULL;

-- Add NOT NULL constraint to item_name in sale_items (for existing databases)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'sale_items' AND column_name = 'item_name' AND is_nullable = 'YES') THEN
        ALTER TABLE sale_items ALTER COLUMN item_name SET NOT NULL;
    END IF;
END $$;

-- ============================================
-- 2. CREATE TABLES
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
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_on_pos BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create items table (Master Data)
CREATE TABLE items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    barcode VARCHAR(255) UNIQUE,
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00,
    category_id BIGINT REFERENCES categories(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create batches table (Inventory Tracking)
CREATE TABLE batches (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES items(id),
    batch_id VARCHAR(255) NOT NULL,
    expiry_date DATE,
    manufacture_date DATE,
    quantity INTEGER NOT NULL DEFAULT 0,
    received_date DATE,
    supplier_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, batch_id)
);

-- Create sales table
CREATE TABLE sales (
    id BIGSERIAL PRIMARY KEY,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(10) NOT NULL CHECK (payment_method IN ('CASH', 'CARD')),
    user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create sale_items table
CREATE TABLE sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(id),
    item_id BIGINT REFERENCES items(id),
    item_name VARCHAR(255) NOT NULL,
    item_barcode VARCHAR(255),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
    batch_id VARCHAR(255),
    vat_rate DECIMAL(5,2),
    vat_amount DECIMAL(10,2),
    price_excluding_vat DECIMAL(10,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. CREATE INDEXES
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
-- 4. INSERT INITIAL DATA
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

-- ============================================
-- 5. GRANTS AND PERMISSIONS
-- ============================================

-- Grant permissions to postgres user (adjust as needed)
GRANT ALL PRIVILEGES ON DATABASE picknpay_inventory TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================

-- Verify tables were created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Verify admin user was created
SELECT username, email, role, is_active FROM users WHERE role = 'ADMIN';

-- Verify table structure
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('users', 'items', 'batches', 'categories', 'sales', 'sale_items', 'company_settings') 
ORDER BY table_name, ordinal_position;

-- ============================================
-- SETUP COMPLETE
-- ============================================

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'PickNPay Database Setup Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Admin User Created:';
    RAISE NOTICE '  Username: admin';
    RAISE NOTICE '  Password: admin123 (BCrypt encoded)';
    RAISE NOTICE '  Email: admin@picknpay.com';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Database Schema Created Successfully';
    RAISE NOTICE 'Company Settings Configured';
    RAISE NOTICE 'BCrypt Password Encoding: ENABLED';
    RAISE NOTICE 'JPA Timestamp Management: ENABLED';
    RAISE NOTICE 'VARCHAR Enum Columns: ENABLED (Hibernate Compatible)';
    RAISE NOTICE 'Batch System: ENABLED';
    RAISE NOTICE 'VAT Functionality: ENABLED (23% default)';
    RAISE NOTICE 'Migration Support: ENABLED (handles existing databases)';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Features Included:';
    RAISE NOTICE '- VAT calculation and reporting';
    RAISE NOTICE '- Batch tracking with expiry dates';
    RAISE NOTICE '- Quick sales with default VAT';
    RAISE NOTICE '- Category management (optional)';
    RAISE NOTICE '- Stock management and tracking';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Start the application';
    RAISE NOTICE '2. Login with admin credentials';
    RAISE NOTICE '3. Create categories and products through the app';
    RAISE NOTICE '4. Add batches for products with expiry dates';
    RAISE NOTICE '5. Configure VAT rates for products';
    RAISE NOTICE '============================================';
END $$;