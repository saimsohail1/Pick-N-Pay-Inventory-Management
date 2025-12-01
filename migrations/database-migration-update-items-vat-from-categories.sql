-- ============================================
-- PickNPay Database Migration Script
-- Update Items VAT Rates to Match Categories
-- 
-- This script updates all existing items to
-- match their category's VAT rate.
-- 
-- Safe to run multiple times (idempotent)
-- ============================================

-- Connect to the database
\c picknpay_inventory;

-- ============================================
-- 1. VERIFY DATA BEFORE UPDATE
-- ============================================

DO $$
DECLARE
    items_with_categories INTEGER;
    items_without_categories INTEGER;
    categories_count INTEGER;
BEGIN
    -- Count items with categories
    SELECT COUNT(*) INTO items_with_categories
    FROM items
    WHERE category_id IS NOT NULL;
    
    -- Count items without categories
    SELECT COUNT(*) INTO items_without_categories
    FROM items
    WHERE category_id IS NULL;
    
    -- Count categories
    SELECT COUNT(*) INTO categories_count
    FROM categories;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Pre-Migration Data Summary';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Items with categories: %', items_with_categories;
    RAISE NOTICE 'Items without categories: %', items_without_categories;
    RAISE NOTICE 'Total categories: %', categories_count;
    RAISE NOTICE '============================================';
END $$;

-- Show sample of items that will be updated
SELECT 
    'Items to be updated (sample):' as status,
    i.id,
    i.name as item_name,
    i.vat_rate as current_vat,
    c.name as category_name,
    c.vat_rate as category_vat
FROM items i
INNER JOIN categories c ON i.category_id = c.id
ORDER BY i.id
LIMIT 10;

-- ============================================
-- 2. UPDATE ITEMS VAT RATES FROM CATEGORIES
-- ============================================

DO $$
DECLARE
    updated_count INTEGER;
    rec RECORD;
BEGIN
    -- Update items that have a category
    UPDATE items i
    SET vat_rate = c.vat_rate
    FROM categories c
    WHERE i.category_id = c.id
    AND i.vat_rate != c.vat_rate; -- Only update if different
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Update Results';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Items updated: %', updated_count;
    RAISE NOTICE '============================================';
    
    -- Show sample of updated items
    RAISE NOTICE 'Sample of updated items:';
    FOR rec IN 
        SELECT 
            i.id,
            i.name as item_name,
            i.vat_rate as new_vat,
            c.name as category_name,
            c.vat_rate as category_vat
        FROM items i
        INNER JOIN categories c ON i.category_id = c.id
        WHERE i.vat_rate = c.vat_rate
        ORDER BY i.id
        LIMIT 5
    LOOP
        RAISE NOTICE '  - Item: % (ID: %) - VAT: %% (Category: % - VAT: %%)', 
            rec.item_name, rec.id, rec.new_vat, rec.category_name, rec.category_vat;
    END LOOP;
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 3. VERIFICATION
-- ============================================

-- Verify all items with categories now match their category VAT
DO $$
DECLARE
    matching_count INTEGER;
    mismatched_count INTEGER;
    total_items INTEGER;
BEGIN
    -- Count items that match their category VAT
    SELECT COUNT(*) INTO matching_count
    FROM items i
    INNER JOIN categories c ON i.category_id = c.id
    WHERE i.vat_rate = c.vat_rate;
    
    -- Count items that don't match (should be 0 after update)
    SELECT COUNT(*) INTO mismatched_count
    FROM items i
    INNER JOIN categories c ON i.category_id = c.id
    WHERE i.vat_rate != c.vat_rate;
    
    -- Total items with categories
    SELECT COUNT(*) INTO total_items
    FROM items
    WHERE category_id IS NOT NULL;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Verification Results';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Total items with categories: %', total_items;
    RAISE NOTICE 'Items matching category VAT: %', matching_count;
    RAISE NOTICE 'Items NOT matching category VAT: %', mismatched_count;
    
    IF mismatched_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All items match their category VAT!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Some items still do not match their category VAT';
    END IF;
    RAISE NOTICE '============================================';
END $$;

-- Display items by category with their VAT rates
SELECT 
    'Items by Category with VAT rates:' as status,
    c.name as category_name,
    c.vat_rate as category_vat,
    COUNT(i.id) as item_count,
    STRING_AGG(i.name, ', ' ORDER BY i.name) as item_names
FROM categories c
LEFT JOIN items i ON c.id = i.category_id
GROUP BY c.id, c.name, c.vat_rate
ORDER BY c.name;

-- Show any items that still don't match (should be empty)
SELECT 
    'Items NOT matching category VAT (should be empty):' as status,
    i.id,
    i.name as item_name,
    i.vat_rate as item_vat,
    c.name as category_name,
    c.vat_rate as category_vat
FROM items i
INNER JOIN categories c ON i.category_id = c.id
WHERE i.vat_rate != c.vat_rate
ORDER BY i.id;

-- ============================================
-- 4. SUMMARY BY CATEGORY
-- ============================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Summary by Category';
    RAISE NOTICE '============================================';
    
    FOR rec IN 
        SELECT 
            c.name as category_name,
            c.vat_rate as category_vat,
            COUNT(i.id) as item_count
        FROM categories c
        LEFT JOIN items i ON c.id = i.category_id
        GROUP BY c.id, c.name, c.vat_rate
        ORDER BY c.name
    LOOP
        RAISE NOTICE 'Category: % (VAT: %%) - Items: %', 
            rec.category_name, rec.category_vat, rec.item_count;
    END LOOP;
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 5. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration Script Execution Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'All items with categories have been updated';
    RAISE NOTICE 'to match their category VAT rates.';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Note: Items without categories were not';
    RAISE NOTICE 'modified. Their VAT rates remain unchanged.';
    RAISE NOTICE '============================================';
END $$;

