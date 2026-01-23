-- Migration to allow user deletion by making user_id nullable in sales table
-- This preserves sales history when users are deleted

ALTER TABLE sales ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

