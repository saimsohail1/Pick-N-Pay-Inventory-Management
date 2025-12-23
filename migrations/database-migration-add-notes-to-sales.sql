-- ============================================
-- Migration: Add notes column to sales table
-- ============================================
-- This migration adds a notes column to the sales table
-- to support sale transaction notes functionality
-- ============================================

-- Add notes column to sales table if it doesn't exist
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS notes VARCHAR(1000);

-- Add comment to document the column
COMMENT ON COLUMN sales.notes IS 'Optional notes for the sale transaction (max 1000 characters)';

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the column was added:
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'sales' AND column_name = 'notes';
