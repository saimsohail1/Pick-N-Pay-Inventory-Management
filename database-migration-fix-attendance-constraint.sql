-- ============================================
-- PickNPay Database Migration Script
-- Fix Attendance Table Unique Constraint Issue
-- 
-- This script removes ALL unique constraints on
-- (user_id, attendance_date) from the attendances table
-- to allow multiple time-in/time-out entries per day.
-- 
-- Safe to run multiple times (idempotent)
-- ============================================

-- Connect to the database
\c picknpay_inventory;

-- ============================================
-- 1. FIND AND DROP ALL UNIQUE CONSTRAINTS
-- ============================================

DO $$
DECLARE
    constraint_rec RECORD;
    constraint_name TEXT;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Searching for unique constraints on attendances table...';
    RAISE NOTICE '============================================';
    
    -- Find all unique constraints on attendances table
    FOR constraint_rec IN
        SELECT 
            con.conname as constraint_name,
            pg_get_constraintdef(con.oid) as constraint_def
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'attendances'
          AND con.contype = 'u'  -- Unique constraint
    LOOP
        constraint_name := constraint_rec.constraint_name;
        RAISE NOTICE 'Found unique constraint: %', constraint_name;
        RAISE NOTICE 'Definition: %', constraint_rec.constraint_def;
        
        -- Drop the constraint
        BEGIN
            EXECUTE format('ALTER TABLE attendances DROP CONSTRAINT IF EXISTS %I', constraint_name);
            RAISE NOTICE '✅ Dropped constraint: %', constraint_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING '⚠️  Could not drop constraint %: %', constraint_name, SQLERRM;
        END;
    END LOOP;
    
    -- Check if there are any unique constraints left
    SELECT COUNT(*) INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'attendances'
      AND con.contype = 'u';
    
    IF constraint_name::INTEGER = 0 THEN
        RAISE NOTICE '✅ All unique constraints removed successfully!';
    ELSE
        RAISE WARNING '⚠️  Warning: % unique constraint(s) still exist', constraint_name;
    END IF;
    
END $$;

-- ============================================
-- 2. VERIFICATION - List all constraints
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Current constraints on attendances table:';
    RAISE NOTICE '============================================';
END $$;

SELECT 
    conname as constraint_name,
    contype as constraint_type,
    CASE contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'c' THEN 'CHECK'
        ELSE contype::TEXT
    END as constraint_type_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'attendances'::regclass
ORDER BY contype, conname;

-- ============================================
-- 3. VERIFICATION - Check for unique constraints
-- ============================================

DO $$
DECLARE
    unique_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unique_count
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'attendances'
      AND con.contype = 'u';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration Verification';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Unique constraints remaining: %', unique_count;
    
    IF unique_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: No unique constraints found!';
        RAISE NOTICE 'Multiple attendance entries per user per day are now allowed.';
    ELSE
        RAISE WARNING '⚠️  WARNING: % unique constraint(s) still exist', unique_count;
        RAISE WARNING 'Please review the constraints listed above.';
    END IF;
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 4. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration Script Execution Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'The unique constraint(s) have been removed';
    RAISE NOTICE 'from the attendances table. Users can now';
    RAISE NOTICE 'have multiple time-in/time-out entries per day.';
    RAISE NOTICE '';
    RAISE NOTICE 'If you still encounter duplicate key errors,';
    RAISE NOTICE 'please check the constraints listed above.';
    RAISE NOTICE '============================================';
END $$;

