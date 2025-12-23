-- ============================================
-- Migration: Add selected_vat_rate column to sales table
-- ============================================
-- This migration adds a selected_vat_rate column to the sales table
-- to store the VAT rate selected on the sales page (applies to all items in the sale)
-- ============================================

-- Add selected_vat_rate column to sales table if it doesn't exist
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS selected_vat_rate DECIMAL(5,2);

-- Add comment to document the column
COMMENT ON COLUMN sales.selected_vat_rate IS 'VAT rate selected on the sales page (applies to all items in the sale)';

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the column was added:
-- SELECT column_name, data_type, numeric_precision, numeric_scale 
-- FROM information_schema.columns 
-- WHERE table_name = 'sales' 
-- AND column_name = 'selected_vat_rate';

