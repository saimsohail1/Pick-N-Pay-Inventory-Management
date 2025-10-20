-- Complete Database Schema Fix for VAT Functionality
-- This script fixes all missing columns and data issues

-- Connect to the database
\c picknpay_inventory;

-- ============================================
-- 1. ADD MISSING COLUMNS TO SALE_ITEMS TABLE
-- ============================================

-- Add item_name column (this is the main missing column causing the error)
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);

-- Add other missing columns if they don't exist
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS item_barcode VARCHAR(255);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS batch_id VARCHAR(255);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS price_excluding_vat DECIMAL(10,2);

-- ============================================
-- 2. ADD VAT_RATE COLUMN TO ITEMS TABLE
-- ============================================

ALTER TABLE items ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00;

-- ============================================
-- 3. FIX EXISTING DATA ISSUES
-- ============================================

-- Update existing sale_items with default values for null columns
UPDATE sale_items 
SET 
    item_name = COALESCE(item_name, 'Unknown Item'),
    item_barcode = COALESCE(item_barcode, 'N/A'),
    batch_id = COALESCE(batch_id, 'N/A'),
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

-- ============================================
-- 4. RECALCULATE VAT FOR EXISTING SALE ITEMS
-- ============================================

-- Recalculate VAT amounts for existing sale items
UPDATE sale_items 
SET 
    price_excluding_vat = ROUND(total_price / (1 + vat_rate/100), 2),
    vat_amount = ROUND(total_price - (total_price / (1 + vat_rate/100)), 2)
WHERE 
    vat_rate IS NOT NULL 
    AND total_price IS NOT NULL;

-- ============================================
-- 5. ADD NOT NULL CONSTRAINTS (Optional)
-- ============================================

-- Make item_name NOT NULL after fixing data
ALTER TABLE sale_items ALTER COLUMN item_name SET NOT NULL;

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
    AND (column_name LIKE '%vat%' OR column_name IN ('item_name', 'item_barcode', 'batch_id'))
ORDER BY table_name, ordinal_position;

-- Check for any remaining null values
SELECT 
    'sale_items' as table_name,
    COUNT(*) as total_rows,
    COUNT(item_name) as non_null_item_name,
    COUNT(vat_rate) as non_null_vat_rate
FROM sale_items;

-- Show sample data
SELECT 
    si.id,
    si.item_name,
    si.item_barcode,
    si.unit_price,
    si.total_price,
    si.vat_rate,
    si.price_excluding_vat,
    si.vat_amount
FROM sale_items si
LIMIT 5;

-- ============================================
-- 7. SUCCESS MESSAGE
-- ============================================

SELECT 'Database schema updated successfully! All VAT functionality is now ready.' as status;
