-- ============================================
-- PickNPay Database Migration Script
-- Add VAT Rate Column to Categories Table
-- 
-- This script safely adds the vat_rate column
-- to the existing categories table without
-- losing any data.
-- 
-- Safe to run multiple times (idempotent)
-- ============================================

-- Connect to the database
\c picknpay_inventory;

-- ============================================
-- 1. ADD VAT_RATE COLUMN TO CATEGORIES TABLE
-- ============================================

-- Check if column already exists, if not, add it
DO $$
BEGIN
    -- Check if vat_rate column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'categories' 
        AND column_name = 'vat_rate'
    ) THEN
        -- Add the column with default value
        ALTER TABLE categories 
        ADD COLUMN vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00;
        
        RAISE NOTICE '✅ Added vat_rate column to categories table';
    ELSE
        RAISE NOTICE 'ℹ️  vat_rate column already exists in categories table';
    END IF;
END $$;

-- ============================================
-- 2. UPDATE EXISTING CATEGORIES (if needed)
-- ============================================

-- Update any existing categories that might have NULL vat_rate
-- (This should not happen due to NOT NULL constraint, but just in case)
UPDATE categories 
SET vat_rate = 23.00 
WHERE vat_rate IS NULL;

-- ============================================
-- 3. VERIFICATION
-- ============================================

-- Verify the column was added successfully
DO $$
DECLARE
    column_exists BOOLEAN;
    category_count INTEGER;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'categories' 
        AND column_name = 'vat_rate'
    ) INTO column_exists;
    
    -- Count categories
    SELECT COUNT(*) INTO category_count FROM categories;
    
    IF column_exists THEN
        RAISE NOTICE '============================================';
        RAISE NOTICE '✅ Migration Completed Successfully!';
        RAISE NOTICE '============================================';
        RAISE NOTICE 'vat_rate column: EXISTS';
        RAISE NOTICE 'Total categories: %', category_count;
        RAISE NOTICE '============================================';
        
        -- Show sample of categories with their VAT rates
        RAISE NOTICE 'Sample categories with VAT rates:';
        FOR rec IN 
            SELECT name, vat_rate 
            FROM categories 
            ORDER BY id 
            LIMIT 5
        LOOP
            RAISE NOTICE '  - %: %%%', rec.name, rec.vat_rate;
        END LOOP;
        RAISE NOTICE '============================================';
    ELSE
        RAISE NOTICE '❌ ERROR: vat_rate column was not added!';
    END IF;
END $$;

-- Display all categories with their VAT rates
SELECT 
    'Categories with VAT rates:' as status,
    id,
    name,
    vat_rate,
    is_active
FROM categories
ORDER BY id;

-- ============================================
-- 4. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration Script Execution Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Verify all categories have vat_rate set';
    RAISE NOTICE '2. Update category VAT rates in the application';
    RAISE NOTICE '3. New items will use category VAT by default';
    RAISE NOTICE '============================================';
END $$;

