-- ============================================
-- QUICK DATABASE UPDATE
-- ============================================
-- Essential updates only - run this if you need a quick fix

-- 1. Add new columns to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS batch_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS general_expiry_date DATE;

-- 2. Add discount columns to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2);

-- 3. Make sales.user_id NOT NULL
ALTER TABLE sales ALTER COLUMN user_id SET NOT NULL;

-- 4. Update VAT fields in sale_items to NOT NULL with defaults
ALTER TABLE sale_items 
ALTER COLUMN vat_rate SET NOT NULL,
ALTER COLUMN vat_rate SET DEFAULT 23.00,
ALTER COLUMN vat_amount SET NOT NULL,
ALTER COLUMN vat_amount SET DEFAULT 0,
ALTER COLUMN price_excluding_vat SET NOT NULL,
ALTER COLUMN price_excluding_vat SET DEFAULT 0;

-- 5. Update foreign key constraints
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_id_fkey;
ALTER TABLE items ADD CONSTRAINT items_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_item_id_fkey;
ALTER TABLE sale_items ADD CONSTRAINT sale_items_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

-- Success message
SELECT 'Database update completed successfully!' AS status;
