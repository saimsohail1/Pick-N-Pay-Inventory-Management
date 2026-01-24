-- Migration to ensure safe item deletion
-- This migration ensures that when items are deleted, sale_items.item_id is set to NULL
-- This preserves sales history while allowing item deletion

-- Drop existing foreign key constraint if it exists
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_item_id_fkey;

-- Recreate foreign key with ON DELETE SET NULL
ALTER TABLE sale_items ADD CONSTRAINT sale_items_item_id_fkey 
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

-- Note: The item_name and item_barcode columns in sale_items already store the values
-- at the time of sale, so even if the item is deleted, the sale history remains intact

