-- ============================================
-- PickNPay Database Migration Script
-- Complete Attendance System Setup
-- 
-- This script:
-- 1. Creates the attendances table (if it doesn't exist)
-- 2. Adds hourly_pay_rate column to users table (if it doesn't exist)
-- 3. Removes any unique constraints on attendances table
-- 4. Creates necessary indexes
-- 
-- Safe to run multiple times (idempotent)
-- ============================================

-- Connect to the database
\c picknpay_inventory;

-- ============================================
-- 1. ADD HOURLY_PAY_RATE TO USERS TABLE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Step 1: Adding hourly_pay_rate to users table...';
    RAISE NOTICE '============================================';
    
    -- Add hourly_pay_rate column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'hourly_pay_rate'
    ) THEN
        ALTER TABLE users ADD COLUMN hourly_pay_rate DECIMAL(10,2);
        RAISE NOTICE '✅ Added hourly_pay_rate column to users table';
    ELSE
        RAISE NOTICE 'ℹ️  hourly_pay_rate column already exists in users table';
    END IF;
END $$;

-- ============================================
-- 2. CREATE ATTENDANCES TABLE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Step 2: Creating attendances table...';
    RAISE NOTICE '============================================';
    
    -- Create attendances table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'attendances'
    ) THEN
        CREATE TABLE attendances (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            attendance_date DATE NOT NULL,
            time_in TIME NOT NULL,
            time_out TIME, -- NULL if still clocked in
            total_hours DECIMAL(5,2), -- Calculated: time_out - time_in (in hours)
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            -- Note: No unique constraint - allows multiple entries per user per day
        );
        RAISE NOTICE '✅ Created attendances table';
    ELSE
        RAISE NOTICE 'ℹ️  attendances table already exists';
    END IF;
END $$;

-- ============================================
-- 3. REMOVE ALL UNIQUE CONSTRAINTS FROM ATTENDANCES
-- ============================================

DO $$
DECLARE
    constraint_rec RECORD;
    constraint_name TEXT;
    unique_count INTEGER;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Step 3: Removing unique constraints from attendances table...';
    RAISE NOTICE '============================================';
    
    -- Find and drop all unique constraints on attendances table
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
    
    -- Verify no unique constraints remain
    SELECT COUNT(*) INTO unique_count
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'attendances'
      AND con.contype = 'u';
    
    IF unique_count = 0 THEN
        RAISE NOTICE '✅ All unique constraints removed successfully!';
        RAISE NOTICE 'Multiple attendance entries per user per day are now allowed.';
    ELSE
        RAISE WARNING '⚠️  Warning: % unique constraint(s) still exist', unique_count;
    END IF;
END $$;

-- ============================================
-- 4. CREATE INDEXES
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Step 4: Creating indexes...';
    RAISE NOTICE '============================================';
    
    -- Create index on user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'attendances' 
        AND indexname = 'idx_attendances_user_id'
    ) THEN
        CREATE INDEX idx_attendances_user_id ON attendances(user_id);
        RAISE NOTICE '✅ Created index idx_attendances_user_id';
    ELSE
        RAISE NOTICE 'ℹ️  Index idx_attendances_user_id already exists';
    END IF;
    
    -- Create index on attendance_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'attendances' 
        AND indexname = 'idx_attendances_date'
    ) THEN
        CREATE INDEX idx_attendances_date ON attendances(attendance_date);
        RAISE NOTICE '✅ Created index idx_attendances_date';
    ELSE
        RAISE NOTICE 'ℹ️  Index idx_attendances_date already exists';
    END IF;
    
    -- Create composite index on (user_id, attendance_date) if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'attendances' 
        AND indexname = 'idx_attendances_user_date'
    ) THEN
        CREATE INDEX idx_attendances_user_date ON attendances(user_id, attendance_date);
        RAISE NOTICE '✅ Created index idx_attendances_user_date';
    ELSE
        RAISE NOTICE 'ℹ️  Index idx_attendances_user_date already exists';
    END IF;
END $$;

-- ============================================
-- 5. VERIFICATION
-- ============================================

DO $$
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
    unique_count INTEGER;
    index_count INTEGER;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Step 5: Verification';
    RAISE NOTICE '============================================';
    
    -- Check if attendances table exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'attendances'
    ) INTO table_exists;
    
    -- Check if hourly_pay_rate column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'hourly_pay_rate'
    ) INTO column_exists;
    
    -- Count unique constraints on attendances
    SELECT COUNT(*) INTO unique_count
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'attendances'
      AND con.contype = 'u';
    
    -- Count indexes on attendances
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'attendances';
    
    RAISE NOTICE 'Attendances table exists: %', table_exists;
    RAISE NOTICE 'hourly_pay_rate column exists: %', column_exists;
    RAISE NOTICE 'Unique constraints on attendances: %', unique_count;
    RAISE NOTICE 'Indexes on attendances: %', index_count;
    
    IF table_exists AND column_exists AND unique_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All checks passed!';
    ELSE
        RAISE WARNING '⚠️  Some checks failed. Please review the output above.';
    END IF;
    RAISE NOTICE '============================================';
END $$;

-- Display table structure
SELECT 
    'Attendances table structure:' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'attendances'
ORDER BY ordinal_position;

-- Display constraints
SELECT 
    'Attendances table constraints:' as status,
    conname as constraint_name,
    CASE contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'c' THEN 'CHECK'
        ELSE contype::TEXT
    END as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'attendances'::regclass
ORDER BY contype, conname;

-- ============================================
-- 6. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration Script Execution Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'The attendance system has been set up:';
    RAISE NOTICE '  ✅ Attendances table created/verified';
    RAISE NOTICE '  ✅ hourly_pay_rate column added to users';
    RAISE NOTICE '  ✅ Unique constraints removed';
    RAISE NOTICE '  ✅ Indexes created';
    RAISE NOTICE '';
    RAISE NOTICE 'Users can now have multiple time-in/time-out';
    RAISE NOTICE 'entries per day, and hourly pay rates can be';
    RAISE NOTICE 'set for employee pay calculation.';
    RAISE NOTICE '============================================';
END $$;

