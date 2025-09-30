-- PickNPay Inventory Management Database Setup
-- Run this script to create the database and user

-- Create database
CREATE DATABASE picknpay_inventory;

-- Create user (optional - you can use existing postgres user)
-- CREATE USER picknpay_user WITH PASSWORD 'picknpay_password';
-- GRANT ALL PRIVILEGES ON DATABASE picknpay_inventory TO picknpay_user;

-- Connect to the database
\c picknpay_inventory;

-- The tables will be created automatically by Hibernate/JPA when the Spring Boot application starts
-- with the following configuration in application.properties:
-- spring.jpa.hibernate.ddl-auto=update

-- Sample data (optional - for testing)
-- You can uncomment and run these after the application has created the tables

/*
-- Insert sample items
INSERT INTO items (name, description, price, stock_quantity, barcode, created_at, updated_at) VALUES
('Coca Cola 330ml', 'Refreshing soft drink', 2.50, 100, '1234567890123', NOW(), NOW()),
('Bread Loaf', 'Fresh white bread', 3.00, 50, '2345678901234', NOW(), NOW()),
('Milk 1L', 'Fresh whole milk', 2.80, 75, '3456789012345', NOW(), NOW()),
('Chocolate Bar', 'Milk chocolate bar', 1.50, 200, '4567890123456', NOW(), NOW()),
('Apple', 'Fresh red apples', 0.80, 150, '5678901234567', NOW(), NOW());

-- Insert sample sales
INSERT INTO sales (total_amount, sale_date, payment_method) VALUES
(5.30, NOW() - INTERVAL '1 day', 'CASH'),
(4.80, NOW() - INTERVAL '2 hours', 'CARD'),
(7.60, NOW() - INTERVAL '1 hour', 'CASH');

-- Insert sample sale items
INSERT INTO sale_items (sale_id, item_id, quantity, unit_price, total_price) VALUES
(1, 1, 2, 2.50, 5.00),
(1, 5, 1, 0.80, 0.80),
(2, 2, 1, 3.00, 3.00),
(2, 3, 1, 2.80, 2.80),
(3, 1, 1, 2.50, 2.50),
(3, 2, 1, 3.00, 3.00),
(3, 4, 2, 1.50, 3.00);
*/
