-- Reset inventory_database: remove all Pick N Pay data, keep only retail CSV catalog.
-- Run: psql -U postgres -d inventory_database -f scripts/reset_to_retail_csv_data.sql
-- Then: psql -U postgres -d inventory_database -f data/import-retail-items-vape-shop.sql

BEGIN;

-- Remove all transactional and catalog data
TRUNCATE TABLE
    sale_payments,
    sale_items,
    sales,
    batches,
    items,
    categories,
    attendances
RESTART IDENTITY CASCADE;

-- Clear Pick N Pay branding from company settings (keep admin user)
UPDATE company_settings
SET company_name = 'Inventory System',
    address = NULL,
    email = NULL,
    updated_at = NOW()
WHERE id = 1;

COMMIT;
