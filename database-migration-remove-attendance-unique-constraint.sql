-- ============================================
-- PickNPay Database Migration Script
-- Remove Unique Constraint from Attendances Table
-- 
-- This script removes the unique constraint on
-- (user_id, attendance_date) to allow multiple
-- time-in/time-out entries per day.
-- 
-- Safe to run multiple times (idempotent)
-- ============================================

-- Connect to the database
\c picknpay_inventory;

-- ============================================
-- 1. DROP UNIQUE CONSTRAINT
-- ============================================

-- Drop the unique constraint if it exists
DO $$
BEGIN
    -- Check if constraint exists and drop it
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'attendances_user_id_attendance_date_key'
        AND conrelid = 'attendances'::regclass
    ) THEN
        ALTER TABLE attendances DROP CONSTRAINT attendances_user_id_attendance_date_key;
        RAISE NOTICE 'Unique constraint dropped successfully';
    ELSE
        RAISE NOTICE 'Unique constraint does not exist (may have been already removed)';
    END IF;
END $$;

-- Alternative: Drop by constraint name pattern
-- This handles cases where the constraint name might be different
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the unique constraint on (user_id, attendance_date)
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'attendances'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 2
    AND (
        SELECT array_agg(attname ORDER BY attnum)
        FROM pg_attribute
        WHERE attrelid = conrelid
        AND attnum = ANY(conkey)
    ) = ARRAY['user_id', 'attendance_date'];
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE attendances DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No matching unique constraint found';
    END IF;
END $$;

-- ============================================
-- 2. VERIFICATION
-- ============================================

DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    -- Count unique constraints on attendances table
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint
    WHERE conrelid = 'attendances'::regclass
    AND contype = 'u'
    AND (
        SELECT array_agg(attname ORDER BY attnum)
        FROM pg_attribute
        WHERE attrelid = conrelid
        AND attnum = ANY(conkey)
    ) = ARRAY['user_id', 'attendance_date'];
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration Verification';
    RAISE NOTICE '============================================';
    
    IF constraint_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: Unique constraint removed!';
        RAISE NOTICE 'Multiple attendance entries per user per day are now allowed.';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Unique constraint still exists';
        RAISE NOTICE 'Please check the constraint manually.';
    END IF;
    RAISE NOTICE '============================================';
END $$;

-- Display table constraints
SELECT 
    'Remaining constraints on attendances table:' as status,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'attendances'::regclass
ORDER BY conname;

-- ============================================
-- 3. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration Script Execution Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'The unique constraint has been removed from';
    RAISE NOTICE 'the attendances table. Users can now have';
    RAISE NOTICE 'multiple time-in/time-out entries per day.';
    RAISE NOTICE '============================================';
END $$;

