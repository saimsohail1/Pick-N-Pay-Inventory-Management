-- ============================================
-- PickNPay Database Migration Script
-- Add Attendance Table
-- 
-- This script adds the attendances table to an
-- existing database without data loss.
-- 
-- Safe to run multiple times (idempotent)
-- ============================================

-- Connect to the database
\c picknpay_inventory;

-- ============================================
-- 1. CREATE ATTENDANCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS attendances (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    time_in TIME NOT NULL,
    time_out TIME, -- NULL if still clocked in
    total_hours DECIMAL(5,2), -- Calculated: time_out - time_in (in hours)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, attendance_date) -- One record per user per day
);

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_attendances_user_id ON attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendances_user_date ON attendances(user_id, attendance_date);

-- ============================================
-- 3. CREATE TRIGGER FOR AUTOMATIC TIMESTAMPS
-- ============================================

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for attendances table
DROP TRIGGER IF EXISTS update_attendances_updated_at ON attendances;
CREATE TRIGGER update_attendances_updated_at 
    BEFORE UPDATE ON attendances 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. VERIFICATION
-- ============================================

DO $$
DECLARE
    table_exists BOOLEAN;
    index_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'attendances'
    ) INTO table_exists;
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename = 'attendances';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration Verification';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Attendances table exists: %', table_exists;
    RAISE NOTICE 'Indexes created: %', index_count;
    
    IF table_exists AND index_count >= 3 THEN
        RAISE NOTICE '✅ SUCCESS: Attendance table and indexes created!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Please verify table and indexes manually';
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

-- ============================================
-- 5. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration Script Execution Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'The attendances table has been added to';
    RAISE NOTICE 'your database. You can now use the';
    RAISE NOTICE 'attendance tracking feature.';
    RAISE NOTICE '============================================';
END $$;

