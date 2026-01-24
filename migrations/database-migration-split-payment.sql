-- Migration to add split payment functionality
-- This migration adds support for split payments (cash + card) in a single sale
-- Split payments create ONE sale with payment_method = 'SPLIT' and associated sale_payments records

-- ============================================
-- 1. UPDATE SALES TABLE TO ALLOW 'SPLIT' PAYMENT METHOD
-- ============================================

-- Drop existing payment_method constraint if it exists
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;

-- Add new constraint that includes 'SPLIT'
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check 
    CHECK (payment_method IN ('CASH', 'CARD', 'SPLIT'));

-- ============================================
-- 2. CREATE SALE_PAYMENTS TABLE (IF NOT EXISTS)
-- ============================================

-- Create sale_payments table for split payment support
-- This table stores individual payment records for split sales
CREATE TABLE IF NOT EXISTS sale_payments (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method VARCHAR(10) NOT NULL CHECK (payment_method IN ('CASH', 'CARD')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. CREATE INDEXES FOR SALE_PAYMENTS
-- ============================================

-- Create index on sale_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id);

-- Create index on payment_method for reporting
CREATE INDEX IF NOT EXISTS idx_sale_payments_payment_method ON sale_payments(payment_method);

-- ============================================
-- 4. CREATE TRIGGER FOR UPDATED_AT TIMESTAMP
-- ============================================

-- Ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for sale_payments updated_at (if it doesn't exist)
DROP TRIGGER IF EXISTS update_sale_payments_updated_at ON sale_payments;
CREATE TRIGGER update_sale_payments_updated_at 
    BEFORE UPDATE ON sale_payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. VERIFICATION
-- ============================================

-- Verify sale_payments table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_payments') THEN
        RAISE NOTICE '✓ sale_payments table created successfully';
    ELSE
        RAISE WARNING '✗ sale_payments table was not created';
    END IF;
END $$;

-- Verify payment_method constraint includes SPLIT
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'sales_payment_method_check'
        AND check_clause LIKE '%SPLIT%'
    ) THEN
        RAISE NOTICE '✓ sales.payment_method constraint updated to include SPLIT';
    ELSE
        RAISE WARNING '✗ sales.payment_method constraint may not include SPLIT';
    END IF;
END $$;

-- ============================================
-- 6. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Split Payment Migration Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '  - sales.payment_method now allows SPLIT';
    RAISE NOTICE '  - sale_payments table created';
    RAISE NOTICE '  - Indexes created for sale_payments';
    RAISE NOTICE '  - Trigger created for sale_payments.updated_at';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'How split payments work:';
    RAISE NOTICE '  - A single sale is created with payment_method = ''SPLIT''';
    RAISE NOTICE '  - Individual cash and card amounts are stored in sale_payments';
    RAISE NOTICE '  - Daily reports sum cash and card amounts from sale_payments';
    RAISE NOTICE '============================================';
END $$;

