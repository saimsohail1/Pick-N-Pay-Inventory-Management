-- ============================================
-- PickNPay Database Migration Script
-- Add Hourly Pay Rate to Users Table
-- 
-- This script adds the hourly_pay_rate column
-- to the users table for employee pay calculation.
-- 
-- Safe to run multiple times (idempotent)
-- ============================================

-- Connect to the database
\c picknpay_inventory;

-- ============================================
-- 1. ADD HOURLY_PAY_RATE COLUMN
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_pay_rate DECIMAL(10,2);

-- ============================================
-- 2. VERIFICATION
-- ============================================

DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND column_name = 'hourly_pay_rate'
    ) INTO column_exists;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration Verification';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'hourly_pay_rate column exists: %', column_exists;
    
    IF column_exists THEN
        RAISE NOTICE '✅ SUCCESS: hourly_pay_rate column added!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Column may not have been added';
    END IF;
    RAISE NOTICE '============================================';
END $$;

-- Display column information
SELECT 
    'Users table structure (hourly_pay_rate):' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'hourly_pay_rate';

-- ============================================
-- 3. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration Script Execution Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'The hourly_pay_rate column has been added';
    RAISE NOTICE 'to the users table. You can now set hourly';
    RAISE NOTICE 'pay rates for employees and calculate total';
    RAISE NOTICE 'pay in the employee report.';
    RAISE NOTICE '============================================';
END $$;

