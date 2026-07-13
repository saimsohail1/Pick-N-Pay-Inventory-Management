-- Add configurable quotation footer text to company_settings (B2B print policies).
-- Safe to run multiple times.

ALTER TABLE company_settings
    ADD COLUMN IF NOT EXISTS quotation_footer_text TEXT;
