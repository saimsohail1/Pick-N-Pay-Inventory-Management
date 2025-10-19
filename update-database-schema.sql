-- Database Schema Update for VAT Functionality
-- This script updates the existing database to support VAT functionality

-- Connect to the database
\c picknpay_inventory;

-- ============================================
-- 1. UPDATE ITEMS TABLE
-- ============================================

-- Add VAT rate column to items table if it doesn't exist
ALTER TABLE items ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00;

-- ============================================
-- 2. UPDATE SALE_ITEMS TABLE
-- ============================================

-- Add VAT-related columns to sale_items table if they don't exist
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS price_excluding_vat DECIMAL(10,2);

-- ============================================
-- 3. FIX EXISTING DATA ISSUES
-- ============================================

-- Fix null values in sale_items table
-- First, update existing sale_items with default values where needed
UPDATE sale_items 
SET 
    item_name = COALESCE(item_name, 'Unknown Item'),
    item_barcode = COALESCE(item_barcode, 'N/A'),
    vat_rate = COALESCE(vat_rate, 23.00),
    vat_amount = COALESCE(vat_amount, 0.00),
    price_excluding_vat = COALESCE(price_excluding_vat, unit_price)
WHERE 
    item_name IS NULL 
    OR item_barcode IS NULL 
    OR vat_rate IS NULL 
    OR vat_amount IS NULL 
    OR price_excluding_vat IS NULL;

-- ============================================
-- 4. RECALCULATE VAT FOR EXISTING SALE ITEMS
-- ============================================

-- Recalculate VAT amounts for existing sale items
-- Formula: price_excluding_vat = total_price / (1 + vat_rate/100)
--         vat_amount = total_price - price_excluding_vat

UPDATE sale_items 
SET 
    price_excluding_vat = ROUND(total_price / (1 + vat_rate/100), 2),
    vat_amount = ROUND(total_price - (total_price / (1 + vat_rate/100)), 2)
WHERE 
    vat_rate IS NOT NULL 
    AND total_price IS NOT NULL;

-- ============================================
-- 5. ADD CONSTRAINTS (Optional - for data integrity)
-- ============================================

-- Add check constraints to ensure data integrity
ALTER TABLE items ADD CONSTRAINT IF NOT EXISTS check_vat_rate_positive 
    CHECK (vat_rate >= 0 AND vat_rate <= 100);

ALTER TABLE sale_items ADD CONSTRAINT IF NOT EXISTS check_sale_vat_rate_positive 
    CHECK (vat_rate >= 0 AND vat_rate <= 100);

ALTER TABLE sale_items ADD CONSTRAINT IF NOT EXISTS check_sale_vat_amount_non_negative 
    CHECK (vat_amount >= 0);

ALTER TABLE sale_items ADD CONSTRAINT IF NOT EXISTS check_sale_price_excluding_vat_non_negative 
    CHECK (price_excluding_vat >= 0);

-- ============================================
-- 6. VERIFY THE UPDATES
-- ============================================

-- Check the updated schema
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name IN ('items', 'sale_items') 
    AND column_name LIKE '%vat%'
ORDER BY table_name, ordinal_position;

-- Check for any remaining null values
SELECT 
    'items' as table_name,
    COUNT(*) as total_rows,
    COUNT(vat_rate) as non_null_vat_rate
FROM items
UNION ALL
SELECT 
    'sale_items' as table_name,
    COUNT(*) as total_rows,
    COUNT(vat_rate) as non_null_vat_rate
FROM sale_items;

-- Show sample data with VAT calculations
SELECT 
    si.id,
    si.item_name,
    si.unit_price,
    si.total_price,
    si.vat_rate,
    si.price_excluding_vat,
    si.vat_amount,
    ROUND((si.vat_amount / si.total_price) * 100, 2) as vat_percentage
FROM sale_items si
LIMIT 10;

-- ============================================
-- 7. SUCCESS MESSAGE
-- ============================================

SELECT 'Database schema updated successfully for VAT functionality!' as status;
