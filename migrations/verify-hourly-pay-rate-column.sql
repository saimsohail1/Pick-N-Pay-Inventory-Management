-- ============================================
-- Verification Script for hourly_pay_rate Column
-- Run this to check if the column exists
-- ============================================

\c picknpay_inventory;

-- Check if column exists
SELECT 
    'Column Check:' as status,
    column_name,
    data_type,
    is_nullable,
    column_default,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name = 'hourly_pay_rate';

-- If column doesn't exist, show all columns in users table
SELECT 
    'All columns in users table:' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Show sample data
SELECT 
    'Sample user data:' as status,
    id,
    username,
    full_name,
    hourly_pay_rate
FROM users
LIMIT 5;

