-- ============================================
-- DATABASE UPDATE QUERIES
-- ============================================
-- These queries update existing database tables to match the latest schema changes
-- Run these queries on your existing database to apply the updates

-- ============================================
-- 1. UPDATE ITEMS TABLE
-- ============================================

-- Add new columns to items table (if they don't exist)
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS batch_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS general_expiry_date DATE;

-- Add comments for clarity
COMMENT ON COLUMN items.batch_id IS 'Batch identifier for batch-tracked items';
COMMENT ON COLUMN items.general_expiry_date IS 'General expiry date for non-batch items';

-- ============================================
-- 2. UPDATE SALES TABLE (Discount Fields)
-- ============================================

-- Add discount-related columns to sales table (if they don't exist)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2);

-- Add comments for clarity
COMMENT ON COLUMN sales.subtotal_amount IS 'Original amount before discount';
COMMENT ON COLUMN sales.discount_amount IS 'Amount of discount applied';
COMMENT ON COLUMN sales.discount_type IS 'Type of discount (percentage or fixed)';
COMMENT ON COLUMN sales.discount_value IS 'Value of discount (percentage or amount)';

-- ============================================
-- 3. UPDATE SALE_ITEMS TABLE (VAT Fields)
-- ============================================

-- Make VAT fields NOT NULL with defaults (if they are currently nullable)
ALTER TABLE sale_items 
ALTER COLUMN vat_rate SET NOT NULL,
ALTER COLUMN vat_rate SET DEFAULT 23.00,
ALTER COLUMN vat_amount SET NOT NULL,
ALTER COLUMN vat_amount SET DEFAULT 0,
ALTER COLUMN price_excluding_vat SET NOT NULL,
ALTER COLUMN price_excluding_vat SET DEFAULT 0;

-- ============================================
-- 4. UPDATE FOREIGN KEY CONSTRAINTS
-- ============================================

-- Update sales.user_id to be NOT NULL and RESTRICT on delete
ALTER TABLE sales 
ALTER COLUMN user_id SET NOT NULL;

-- Drop existing foreign key constraint if it exists
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;

-- Add new foreign key constraint with RESTRICT
ALTER TABLE sales 
ADD CONSTRAINT sales_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Update items.category_id to SET NULL on delete
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_id_fkey;
ALTER TABLE items 
ADD CONSTRAINT items_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Update sale_items.item_id to SET NULL on delete
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_item_id_fkey;
ALTER TABLE sale_items 
ADD CONSTRAINT sale_items_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

-- ============================================
-- 5. UPDATE BATCHES TABLE (if needed)
-- ============================================

-- Make batch fields nullable (if they are currently NOT NULL)
ALTER TABLE batches 
ALTER COLUMN expiry_date DROP NOT NULL,
ALTER COLUMN manufacture_date DROP NOT NULL,
ALTER COLUMN received_date DROP NOT NULL,
ALTER COLUMN supplier_id DROP NOT NULL;

-- Make sale_items batch fields nullable
ALTER TABLE sale_items 
ALTER COLUMN item_barcode DROP NOT NULL,
ALTER COLUMN batch_id DROP NOT NULL;

-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================

-- Check if all new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'items' 
AND column_name IN ('batch_id', 'general_expiry_date');

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name IN ('subtotal_amount', 'discount_amount', 'discount_type', 'discount_value');

-- Check foreign key constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('sales', 'items', 'sale_items');

-- ============================================
-- 7. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Database Update Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Updated Tables:';
    RAISE NOTICE '- items: Added batch_id, general_expiry_date';
    RAISE NOTICE '- sales: Added discount fields';
    RAISE NOTICE '- sale_items: Updated VAT constraints';
    RAISE NOTICE '- Foreign keys: Updated constraints';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Restart your Spring Boot application';
    RAISE NOTICE '2. Test the new expiry date functionality';
    RAISE NOTICE '3. Test discount functionality in sales';
    RAISE NOTICE '============================================';
END $$;
