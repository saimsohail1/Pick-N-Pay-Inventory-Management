-- ============================================
-- Migration: Add website column to company_settings table
-- ============================================
-- This migration adds a website column to the company_settings table
-- Note: phone column already exists in the database
-- ============================================

-- Add website column to company_settings table if it doesn't exist
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Add comment to document the column
COMMENT ON COLUMN company_settings.website IS 'Company website URL';

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the column was added:
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'company_settings' 
-- AND column_name = 'website';

