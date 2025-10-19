-- ============================================
-- Fix Payment Method Enum Issue for Checkout
-- ============================================

-- Connect to your database first
-- \c picknpay_inventory;

-- ============================================
-- 1. FIX SALES TABLE PAYMENT_METHOD COLUMN
-- ============================================

-- Add new VARCHAR column
ALTER TABLE sales ADD COLUMN payment_method_new VARCHAR(10);

-- Copy data from enum to VARCHAR
UPDATE sales SET payment_method_new = payment_method::text;

-- Drop the old enum column
ALTER TABLE sales DROP COLUMN payment_method;

-- Rename the new column
ALTER TABLE sales RENAME COLUMN payment_method_new TO payment_method;

-- Add NOT NULL constraint
ALTER TABLE sales ALTER COLUMN payment_method SET NOT NULL;

-- ============================================
-- 2. FIX USERS TABLE ROLE COLUMN (if needed)
-- ============================================

-- Add new VARCHAR column
ALTER TABLE users ADD COLUMN role_new VARCHAR(10);

-- Copy data from enum to VARCHAR
UPDATE users SET role_new = role::text;

-- Drop the old enum column
ALTER TABLE users DROP COLUMN role;

-- Rename the new column
ALTER TABLE users RENAME COLUMN role_new TO role;

-- Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- ============================================
-- 3. DROP ENUM TYPES (OPTIONAL)
-- ============================================

-- Drop the enum types since they're no longer needed
DROP TYPE IF EXISTS payment_method;
DROP TYPE IF EXISTS user_role;

-- ============================================
-- 4. VERIFICATION
-- ============================================

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sales' AND column_name = 'payment_method';

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';

-- Test data (optional)
SELECT id, payment_method, total_amount FROM sales LIMIT 5;
SELECT id, username, role FROM users LIMIT 5;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Payment Method Enum Fix Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ sales.payment_method converted to VARCHAR';
    RAISE NOTICE '✅ users.role converted to VARCHAR';
    RAISE NOTICE '✅ Enum types removed';
    RAISE NOTICE '✅ Checkout should now work properly';
    RAISE NOTICE '============================================';
END $$;
