-- ============================================
-- Migration: Add eircode and vat_number columns to company_settings table
-- ============================================
-- This migration adds eircode and vat_number columns to the company_settings table
-- to support Irish postal codes and VAT registration numbers
-- ============================================

-- Add eircode column to company_settings table if it doesn't exist
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS eircode VARCHAR(10);

-- Add vat_number column to company_settings table if it doesn't exist
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50);

-- Add comments to document the columns
COMMENT ON COLUMN company_settings.eircode IS 'Irish postal code (Eircode) for the company address';
COMMENT ON COLUMN company_settings.vat_number IS 'VAT registration number for the company';

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the columns were added:
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'company_settings' 
-- AND column_name IN ('eircode', 'vat_number');

