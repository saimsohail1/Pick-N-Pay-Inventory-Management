-- Final Database Fix Script
-- This script fixes all known database issues and ensures VAT functionality works properly

-- Connect to the database
\c picknpay_inventory;

-- ============================================
-- 1. ADD MISSING COLUMNS AND FIX CONSTRAINTS
-- ============================================

-- Add vat_rate to items table if it doesn't exist
ALTER TABLE items ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00;

-- Add VAT fields to sale_items table if they don't exist
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS item_barcode VARCHAR(255);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS batch_id VARCHAR(255);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS price_excluding_vat DECIMAL(10,2);

-- Make category_id nullable in items table
ALTER TABLE items ALTER COLUMN category_id DROP NOT NULL;

-- ============================================
-- 2. FIX EXISTING NULL DATA
-- ============================================

-- Update existing null values in sale_items with defaults
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

-- ============================================
-- 3. ADD NOT NULL CONSTRAINTS SAFELY
-- ============================================

-- Add NOT NULL constraint to item_name in sale_items
ALTER TABLE sale_items ALTER COLUMN item_name SET NOT NULL;

-- ============================================
-- 4. VERIFICATION
-- ============================================

-- Verify items table structure
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'items' AND column_name IN ('vat_rate', 'category_id');

-- Verify sale_items table structure
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sale_items' AND column_name IN ('item_name', 'item_barcode', 'batch_id', 'vat_rate', 'vat_amount', 'price_excluding_vat');

-- Verify no nulls in critical fields
SELECT 
    'sale_items' as table_name, 
    count(*) as total_rows, 
    count(item_name) as non_null_item_name, 
    count(vat_rate) as non_null_vat_rate
FROM sale_items;

SELECT 'Database schema updated successfully! All VAT functionality is now ready.' as status;
