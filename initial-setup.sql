-- PickNPay Inventory Management System - Initial Setup Script
-- This script creates the database, tables, and adds the first admin user
-- 
-- IMPORTANT: Uses VARCHAR columns instead of PostgreSQL enum types
-- This ensures compatibility with Hibernate/JPA and prevents enum casting errors

-- ============================================
-- 1. DATABASE CREATION
-- ============================================

-- Create database (run this as postgres superuser)
CREATE DATABASE picknpay_inventory;

-- Connect to the database
\c picknpay_inventory;

-- ============================================
-- 2. TABLE CREATION
-- ============================================

-- Note: Using VARCHAR instead of enum types for better Hibernate compatibility
-- PostgreSQL enum types can cause casting issues with Hibernate/JPA

-- Create users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('ADMIN', 'USER')),
    is_active BOOLEAN NOT NULL DEFAULT true,
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

-- Create items table
CREATE TABLE items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    barcode VARCHAR(255) UNIQUE,
    category_id BIGINT NOT NULL REFERENCES categories(id),
    expiry_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    item_id BIGINT REFERENCES items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0)
);

-- Create company_settings table
CREATE TABLE company_settings (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL DEFAULT 'PickNPay',
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    tax_number VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'EUR',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_items_barcode ON items(barcode);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_item ON sale_items(item_id);

-- ============================================
-- 4. JPA HANDLES UPDATED_AT AUTOMATICALLY
-- ============================================

-- Note: JPA entities use @PreUpdate and @PrePersist annotations
-- to automatically handle created_at and updated_at timestamps.
-- No database triggers are needed as this is handled at the application level.

-- ============================================
-- 5. INITIAL DATA
-- ============================================

-- Insert default admin user
-- Password: admin123 (bcrypt hashed with BCryptPasswordEncoder)
INSERT INTO users (
    username, 
    email, 
    password, 
    full_name, 
    role, 
    is_active
) VALUES (
    'admin', 
    'admin@picknpay.com', 
    '$2a$10$Zsk8XbjYk3FiVDKjrCKu.O9KrtQ1985FD2Qw4FsdMWt4GjCSIB5j6', 
    'System Administrator', 
    'ADMIN', 
    true
);

-- Insert default company settings
INSERT INTO company_settings (
    company_name, 
    address, 
    phone, 
    email, 
    tax_number
) VALUES (
    'PickNPay Store', 
    '123 Main Street, Dublin, Ireland', 
    '+353-1-234-5678', 
    'info@picknpay.com', 
    'IE123456789'
);

-- Categories and items will be created through the application
-- No default data inserted - users can create their own categories and products

-- ============================================
-- 6. GRANTS AND PERMISSIONS
-- ============================================

-- Grant permissions to postgres user (adjust as needed)
GRANT ALL PRIVILEGES ON DATABASE picknpay_inventory TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Verify tables were created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Verify admin user was created
SELECT username, email, role, is_active FROM users WHERE role = 'ADMIN';

-- Verify table structure (no sample data inserted)
SELECT COUNT(*) as category_count FROM categories;
SELECT COUNT(*) as item_count FROM items;
SELECT COUNT(*) as company_settings_count FROM company_settings;

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
    RAISE NOTICE 'Expiry Date Support: ENABLED';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Start the application';
    RAISE NOTICE '2. Login with admin credentials';
    RAISE NOTICE '3. Create categories and products through the app';
    RAISE NOTICE '============================================';
END $$;
