-- Migration: Add notes column to sales table
-- Date: 2025-01-XX
-- Description: Adds a notes field to the sales table to allow users to add notes to sales transactions

-- Add notes column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS notes VARCHAR(1000);

-- Add comment to the column
COMMENT ON COLUMN sales.notes IS 'Optional notes for the sale transaction';

