-- PickNPay Inventory Management System - Initial Setup Script
-- This script creates the database, tables, and adds the first admin user

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

-- Create UserRole enum type
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');

-- Create PaymentMethod enum type
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD');

-- Create users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create sales table
CREATE TABLE sales (
    id BIGSERIAL PRIMARY KEY,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method payment_method NOT NULL,
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
-- 4. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. INITIAL DATA
-- ============================================

-- Insert default admin user
-- Password: admin123 (bcrypt hashed)
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
    '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDi', 
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

-- Insert default categories
INSERT INTO categories (name, description, display_on_pos) VALUES
('Beverages', 'Soft drinks, juices, and other beverages', true),
('Food', 'Food items and snacks', true),
('Dairy', 'Milk, cheese, and dairy products', true),
('Bakery', 'Bread, pastries, and baked goods', true),
('Frozen', 'Frozen food items', true),
('Cleaning', 'Cleaning supplies and household items', false),
('Health', 'Health and beauty products', false);

-- Insert sample items for testing
INSERT INTO items (name, description, price, stock_quantity, barcode, category_id) VALUES
('Coca Cola 330ml', 'Refreshing soft drink', 2.50, 100, '1234567890123', 1),
('Bread Loaf', 'Fresh white bread', 3.00, 50, '2345678901234', 4),
('Milk 1L', 'Fresh whole milk', 2.80, 75, '3456789012345', 3),
('Chocolate Bar', 'Milk chocolate bar', 1.50, 200, '4567890123456', 2),
('Apple', 'Fresh red apples', 0.80, 150, '5678901234567', 2),
('Orange Juice 1L', 'Fresh orange juice', 3.20, 60, '6789012345678', 1),
('Butter 250g', 'Dairy butter', 2.10, 80, '7890123456789', 3),
('Croissant', 'Fresh baked croissant', 1.80, 120, '8901234567890', 4);

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

-- Verify sample data
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
    RAISE NOTICE '  Password: admin123';
    RAISE NOTICE '  Email: admin@picknpay.com';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Default Categories and Items Added';
    RAISE NOTICE 'Company Settings Configured';
    RAISE NOTICE '============================================';
END $$;
