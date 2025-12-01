# Database Migrations

This directory contains migration scripts for updating existing databases.

## When to Use Migrations

Use these migration scripts when you need to update an **existing** database that was set up with an older version of `database-setup.sql`.

## For Fresh Database Setup

If you're setting up a new database, use the main `database-setup.sql` file in the root directory. It includes all features and doesn't require migrations.

## Migration Files

### 1. `database-migration-add-hourly-pay-rate-to-users.sql`
- **Purpose**: Adds `hourly_pay_rate` column to the `users` table
- **When to use**: If your database doesn't have the hourly pay rate column
- **Safe to run**: Yes (idempotent - can run multiple times)

### 2. `database-migration-add-vat-rate-to-categories.sql`
- **Purpose**: Adds `vat_rate` column to the `categories` table
- **When to use**: If your categories table doesn't have VAT rate column
- **Safe to run**: Yes (idempotent)

### 3. `database-migration-attendance-setup.sql`
- **Purpose**: Creates the `attendances` table and adds hourly pay rate to users
- **When to use**: If you need to add attendance tracking to an existing database
- **Safe to run**: Yes (idempotent)

### 4. `database-migration-update-items-vat-from-categories.sql`
- **Purpose**: Updates existing items' VAT rates to match their category's VAT rate
- **When to use**: After adding VAT rates to categories, to sync item VAT rates
- **Safe to run**: Yes (idempotent - only updates if different)

### 5. `verify-hourly-pay-rate-column.sql`
- **Purpose**: Verification script to check if `hourly_pay_rate` column exists
- **When to use**: To verify the column was added successfully
- **Safe to run**: Yes (read-only verification)

## How to Run Migrations

1. Connect to your PostgreSQL database:
   ```bash
   psql -U postgres -d picknpay_inventory
   ```

2. Run the migration script:
   ```bash
   psql -U postgres -d picknpay_inventory -f migrations/database-migration-<name>.sql
   ```

   Or from within psql:
   ```sql
   \i migrations/database-migration-<name>.sql
   ```

## Migration Order

If you need to run multiple migrations, run them in this order:
1. `database-migration-add-hourly-pay-rate-to-users.sql`
2. `database-migration-add-vat-rate-to-categories.sql`
3. `database-migration-attendance-setup.sql`
4. `database-migration-update-items-vat-from-categories.sql`

## Notes

- All migration scripts are **idempotent** - they can be run multiple times safely
- Migrations check if changes already exist before applying them
- Always backup your database before running migrations in production
- The main `database-setup.sql` includes all these features, so new setups don't need migrations

