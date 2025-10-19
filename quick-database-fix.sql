-- Quick Database Fix for VAT Functionality
-- Run these commands one by one in your PostgreSQL database

-- 1. Add VAT rate column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00;

-- 2. Add VAT columns to sale_items table
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS price_excluding_vat DECIMAL(10,2);

-- 3. Fix null values in sale_items
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

-- 4. Recalculate VAT for existing sale items
UPDATE sale_items 
SET 
    price_excluding_vat = ROUND(total_price / (1 + vat_rate/100), 2),
    vat_amount = ROUND(total_price - (total_price / (1 + vat_rate/100)), 2)
WHERE 
    vat_rate IS NOT NULL 
    AND total_price IS NOT NULL;

-- 5. Verify the changes
SELECT 'Database updated successfully!' as status;
