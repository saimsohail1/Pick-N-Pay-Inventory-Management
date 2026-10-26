-- Khyber City Grill: first-time catalogue + users. WIPES sales.
-- Do not run this on a live till.
-- Printed TV board (deletes old catalogue, keeps sales):
--   scripts/apply_khyber_printed_menu.sql
-- Keep Quick Sale. Keep admin + imran. Reset admin to admin123.
-- Add user saim / saim12 as ADMIN.
-- VAT from 1 July 2026 (Revenue): hot restaurant/takeaway food 9%, cold takeaway 0%,
-- canned/bottled soft drinks and water 23%, hot tea 9%.
--
-- Dump ~/Downloads/KhyberGrill is pg_dump v1.16 (Postgres 17). This script is meant
-- to run on that till. Local Postgres.app 16 cannot restore that dump.
-- Run: psql -U postgres -d YOUR_KHYBER_DB -f scripts/setup_khyber_grill_menu.sql

BEGIN;

-- Sales and clocking
TRUNCATE TABLE sale_payments, sale_items, sales, attendances, batches RESTART IDENTITY;
DO $$ BEGIN
  IF to_regclass('public.order_ticket_counters') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE order_ticket_counters';
  END IF;
  IF to_regclass('public.kitchen_order_items') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE kitchen_order_items, kitchen_orders RESTART IDENTITY';
  END IF;
END $$;

-- Catalogue except Quick Sale
DELETE FROM items;
DELETE FROM categories WHERE lower(btrim(name)) <> 'quick sale';

UPDATE categories SET is_active = true, display_on_pos = true, vat_rate = 23.00, updated_at = NOW()
WHERE lower(btrim(name)) = 'quick sale';

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
SELECT 'Quick Sale', 'Manually keyed sale', true, true, 23.00, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE lower(btrim(name)) = 'quick sale');

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
VALUES ('Qabuli Pulao & Mains', 'Rice dishes and mains — hot catering / takeaway', true, true, 9.00, NOW(), NOW());

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
VALUES ('Shawarma Kebabs', 'Doner and shawarma — Regular and Meal', true, true, 9.00, NOW(), NOW());

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
VALUES ('Wraps', 'Wraps — Regular and Meal', true, true, 9.00, NOW(), NOW());

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
VALUES ('The Grill', 'Charcoal grill — Regular and Meal', true, true, 9.00, NOW(), NOW());

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
VALUES ('Pizza', '10, 12 and 16 inch — hot takeaway', true, true, 9.00, NOW(), NOW());

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
VALUES ('Burgers', 'Burgers — Regular and Meal', true, true, 9.00, NOW(), NOW());

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
VALUES ('Fresh-Cut Chips', 'Hot chips', true, true, 9.00, NOW(), NOW());

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
VALUES ('Peri Peri Chicken', 'Hot peri peri chicken, boxes and platters', true, true, 9.00, NOW(), NOW());

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
VALUES ('Sides & Salad', 'Hot sides 9%; cold salads/hummus 0% (Irish cold takeaway)', true, true, 9.00, NOW(), NOW());

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
VALUES ('Drinks', 'Cans, water and juice 23%; hot tea 9% on the item', true, true, 23.00, NOW(), NOW());

INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Lamb Qabuli Pulao', 'Slow-cooked lamb over fragrant rice with carrots, raisins', 12.99, 9999, 'KG-0001', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Qabuli Pulao & Mains' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Qabuli Pulao', 'Grilled chicken over fragrant rice with carrots, raisins', 9.99, 9999, 'KG-0002', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Qabuli Pulao & Mains' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Biryani', 'Spiced rice slow-cooked with marinated chicken', 9.99, 9999, 'KG-0003', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Qabuli Pulao & Mains' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Karahi', 'Chicken wok-cooked with tomatoes, ginger and green chilli', 12.99, 9999, 'KG-0004', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Qabuli Pulao & Mains' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Lamb Karahi', 'Lamb wok-cooked with tomatoes, ginger and green chilli', 14.99, 9999, 'KG-0005', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Qabuli Pulao & Mains' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Afghani Mantoo', 'Steamed dumplings filled with seasoned minced lamb', 9.99, 9999, 'KG-0006', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Qabuli Pulao & Mains' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Extra Rice', 'Add rice to any dish, or swap naan for rice', 2.00, 9999, 'KG-0007', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Qabuli Pulao & Mains' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Lamb Doner Kebab', 'Lamb slow-roasted on an upright spit', 7.99, 9999, 'KG-0008', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Shawarma Kebabs' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Lamb Doner Kebab Meal', 'Lamb slow-roasted on an upright spit', 9.99, 9999, 'KG-0009', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Shawarma Kebabs' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Doner Kebab', 'Marinated chicken roasted on an upright spit', 7.99, 9999, 'KG-0010', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Shawarma Kebabs' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Doner Kebab Meal', 'Marinated chicken roasted on an upright spit', 9.99, 9999, 'KG-0011', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Shawarma Kebabs' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Mixed Doner Kebab', 'Lamb and chicken shawarma in naan with salad', 7.99, 9999, 'KG-0012', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Shawarma Kebabs' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Mixed Doner Kebab Meal', 'Lamb and chicken shawarma in naan with salad', 9.99, 9999, 'KG-0013', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Shawarma Kebabs' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Shawarma Kebab', 'Chicken shawarma with salad and garlic', 7.99, 9999, 'KG-0014', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Shawarma Kebabs' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Shawarma Kebab Meal', 'Chicken shawarma with salad and garlic', 9.99, 9999, 'KG-0015', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Shawarma Kebabs' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chapli Kebab', 'Crispy Afghan minced lamb patties', 9.99, 9999, 'KG-0016', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Shawarma Kebabs' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chapli Kebab Meal', 'Crispy Afghan minced lamb patties', 12.99, 9999, 'KG-0017', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Shawarma Kebabs' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Lamb Doner Wrap', NULL, 5.99, 9999, 'KG-0018', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Wraps' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Lamb Doner Wrap Meal', NULL, 8.99, 9999, 'KG-0019', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Wraps' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Mixed Doner Wrap', NULL, 5.99, 9999, 'KG-0020', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Wraps' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Mixed Doner Wrap Meal', NULL, 8.99, 9999, 'KG-0021', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Wraps' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Shawarma Wrap', NULL, 5.99, 9999, 'KG-0022', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Wraps' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Shawarma Wrap Meal', NULL, 8.99, 9999, 'KG-0023', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Wraps' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Tikka Wrap', NULL, 5.99, 9999, 'KG-0024', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Wraps' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Tikka Wrap Meal', NULL, 8.99, 9999, 'KG-0025', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Wraps' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Peri Peri Wrap', NULL, 5.99, 9999, 'KG-0026', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Wraps' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Peri Peri Wrap Meal', NULL, 8.99, 9999, 'KG-0027', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Wraps' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chapli Kebab Wrap', NULL, 5.99, 9999, 'KG-0028', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Wraps' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chapli Kebab Wrap Meal', NULL, 8.99, 9999, 'KG-0029', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Wraps' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Lamb Shish Kebab', 'Lamb cubes marinated and grilled over charcoal', 9.99, 9999, 'KG-0030', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Lamb Shish Kebab Meal', 'Lamb cubes marinated and grilled over charcoal', 12.99, 9999, 'KG-0031', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Shish Kebab', 'Chicken breast marinated and grilled over charcoal', 9.99, 9999, 'KG-0032', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Shish Kebab Meal', 'Chicken breast marinated and grilled over charcoal', 12.99, 9999, 'KG-0033', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Mixed Shish Kebab', 'Lamb and chicken skewers grilled together', 9.99, 9999, 'KG-0034', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Mixed Shish Kebab Meal', 'Lamb and chicken skewers grilled together', 12.99, 9999, 'KG-0035', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Lamb Kofta Kebab', 'Minced lamb with herbs, grilled on a skewer', 9.99, 9999, 'KG-0036', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Lamb Kofta Kebab Meal', 'Minced lamb with herbs, grilled on a skewer', 12.99, 9999, 'KG-0037', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Kofta Kebab', 'Minced chicken with herbs, grilled on a skewer', 9.99, 9999, 'KG-0038', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Kofta Kebab Meal', 'Minced chicken with herbs, grilled on a skewer', 12.99, 9999, 'KG-0039', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Grilled Lamb Chops', 'Marinated lamb chops, naan, salad, garlic', 12.99, 9999, 'KG-0040', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Grilled Lamb Chops Meal', 'Marinated lamb chops, naan, salad, garlic', 15.99, 9999, 'KG-0041', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Grilled Steak', 'Chargrilled steak with naan, salad, garlic', 12.99, 9999, 'KG-0042', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Grilled Steak Meal', 'Chargrilled steak with naan, salad, garlic', 15.99, 9999, 'KG-0043', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Fresh Sea Bass', 'Whole fresh sea bass grilled with naan', 11.99, 9999, 'KG-0044', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Fresh Sea Bass Meal', 'Whole fresh sea bass grilled with naan', 14.99, 9999, 'KG-0045', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Grill Special 1', 'Chicken shish, half kofta, half lamb shish', 14.99, 9999, 'KG-0046', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Grill Special 1 Meal', 'Chicken shish, half kofta, half lamb shish', 17.99, 9999, 'KG-0047', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Grill Special 2', 'Two chicken shish, two kofta, two lamb shish', 29.99, 9999, 'KG-0048', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Grill Special 2 Meal', 'Two chicken shish, two kofta, two lamb shish', 34.99, 9999, 'KG-0049', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'The Grill' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Margherita 10"', NULL, 9.99, 9999, 'KG-0050', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Margherita 12"', NULL, 11.99, 9999, 'KG-0051', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Margherita 16"', NULL, 14.99, 9999, 'KG-0052', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Pepperoni Deluxe 10"', NULL, 9.99, 9999, 'KG-0053', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Pepperoni Deluxe 12"', NULL, 11.99, 9999, 'KG-0054', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Pepperoni Deluxe 16"', NULL, 14.99, 9999, 'KG-0055', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Meat Feast 10"', NULL, 9.99, 9999, 'KG-0056', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Meat Feast 12"', NULL, 11.99, 9999, 'KG-0057', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Meat Feast 16"', NULL, 14.99, 9999, 'KG-0058', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Four Seasons 10"', NULL, 9.99, 9999, 'KG-0059', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Four Seasons 12"', NULL, 11.99, 9999, 'KG-0060', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Four Seasons 16"', NULL, 14.99, 9999, 'KG-0061', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Hawaiian 10"', NULL, 9.99, 9999, 'KG-0062', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Hawaiian 12"', NULL, 11.99, 9999, 'KG-0063', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Hawaiian 16"', NULL, 14.99, 9999, 'KG-0064', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Hot & Spicy 10"', NULL, 9.99, 9999, 'KG-0065', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Hot & Spicy 12"', NULL, 11.99, 9999, 'KG-0066', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Hot & Spicy 16"', NULL, 14.99, 9999, 'KG-0067', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Vegetarian 10"', NULL, 9.99, 9999, 'KG-0068', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Vegetarian 12"', NULL, 11.99, 9999, 'KG-0069', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Vegetarian 16"', NULL, 14.99, 9999, 'KG-0070', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Extra Pizza Topping', 'Any extra topping', 1.49, 9999, 'KG-0071', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Quarter Pounder Burger', NULL, 4.99, 9999, 'KG-0072', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Burgers' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Quarter Pounder Burger Meal', NULL, 7.99, 9999, 'KG-0073', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Burgers' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Half Pounder Burger', NULL, 6.99, 9999, 'KG-0074', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Burgers' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Half Pounder Burger Meal', NULL, 9.99, 9999, 'KG-0075', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Burgers' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Burger', NULL, 4.99, 9999, 'KG-0076', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Burgers' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Burger Meal', NULL, 7.99, 9999, 'KG-0077', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Burgers' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Fillet Burger', NULL, 5.99, 9999, 'KG-0078', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Burgers' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Fillet Burger Meal', NULL, 8.99, 9999, 'KG-0079', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Burgers' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Doner Burger', NULL, 5.99, 9999, 'KG-0080', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Burgers' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Doner Burger Meal', NULL, 8.99, 9999, 'KG-0081', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Burgers' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chips', 'Plain', 1.99, 9999, 'KG-0082', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Fresh-Cut Chips' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Garlic Chips', NULL, 2.99, 9999, 'KG-0083', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Fresh-Cut Chips' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Garlic Cheese Chips', NULL, 3.99, 9999, 'KG-0084', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Fresh-Cut Chips' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Curry Chips', NULL, 3.99, 9999, 'KG-0085', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Fresh-Cut Chips' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Curry Cheese Chips', NULL, 3.99, 9999, 'KG-0086', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Fresh-Cut Chips' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Taco Chips', NULL, 4.99, 9999, 'KG-0087', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Fresh-Cut Chips' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Taco Cheese Chips', NULL, 4.99, 9999, 'KG-0088', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Fresh-Cut Chips' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Full Chicken', NULL, 13.99, 9999, 'KG-0089', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Half Chicken', NULL, 6.99, 9999, 'KG-0090', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Leg', NULL, 3.99, 9999, 'KG-0091', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Breast', NULL, 3.99, 9999, 'KG-0092', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Wings', NULL, 5.99, 9999, 'KG-0093', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Strips', NULL, 5.99, 9999, 'KG-0094', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Spicy Chicken Wings', NULL, 5.99, 9999, 'KG-0095', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Peri Peri Leg Box', NULL, 5.99, 9999, 'KG-0096', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Peri Peri Breast Box', NULL, 8.99, 9999, 'KG-0097', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Peri Peri Goujons Box', NULL, 5.99, 9999, 'KG-0098', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Mini Platter', 'Serves 1', 14.99, 9999, 'KG-0099', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Mixed Platter', 'Serves 2', 29.99, 9999, 'KG-0100', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Mega Platter', 'Serves 4', 39.99, 9999, 'KG-0101', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Peri Peri Chicken' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Naan Bread', NULL, 0.99, 9999, 'KG-0102', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Garlic Naan Bread', NULL, 2.99, 9999, 'KG-0103', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Cheese Naan Bread', NULL, 2.99, 9999, 'KG-0104', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Afghani Bolani', NULL, 2.99, 9999, 'KG-0105', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Rice Small', NULL, 1.99, 9999, 'KG-0106', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Rice Large', NULL, 3.99, 9999, 'KG-0107', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Samosa 3 pcs', NULL, 3.99, 9999, 'KG-0108', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Hummus', NULL, 3.99, 9999, 'KG-0109', 0.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Lentil Sauce Small', NULL, 3.99, 9999, 'KG-0110', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Lentil Sauce Large', NULL, 6.99, 9999, 'KG-0111', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Greek Salad', NULL, 4.99, 9999, 'KG-0112', 0.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Tabbouleh', NULL, 4.99, 9999, 'KG-0113', 0.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Peri Peri Chicken Salad', 'Hot chicken salad', 6.99, 9999, 'KG-0114', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Garlic Bread', NULL, 2.99, 9999, 'KG-0115', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Garlic Bread with Cheese', NULL, 3.99, 9999, 'KG-0116', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Onion Rings', '8 pcs', 2.99, 9999, 'KG-0117', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Onion Rings Meal', '8 pcs meal', 6.99, 9999, 'KG-0118', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Nuggets', '6 pcs', 2.99, 9999, 'KG-0119', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Nuggets Meal', '6 pcs meal', 6.99, 9999, 'KG-0120', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Goujons', '6 pcs', 3.99, 9999, 'KG-0121', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Chicken Goujons Meal', '6 pcs meal', 7.99, 9999, 'KG-0122', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Extra Rice', 'Add rice, or swap naan for rice', 2.00, 9999, 'KG-0123', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Sides & Salad' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Extra Pizza Topping', 'Any extra topping', 1.49, 9999, 'KG-0124', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Pizza' LIMIT 1), NOW(), NOW());

INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Coke', 'Can', 1.50, 9999, 'KG-0125', 23.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Diet Coke', 'Can', 1.50, 9999, 'KG-0126', 23.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Coke Zero', 'Can', 1.50, 9999, 'KG-0127', 23.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Fanta', 'Can', 1.50, 9999, 'KG-0128', 23.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('7Up', 'Can', 1.50, 9999, 'KG-0129', 23.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Club Orange', 'Can', 1.50, 9999, 'KG-0130', 23.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Water', 'Bottle', 1.00, 9999, 'KG-0131', 23.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Capri-Sun', NULL, 1.00, 9999, 'KG-0132', 23.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Red Bull', 'Energy drink', 2.00, 9999, 'KG-0133', 23.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Alokozay', 'Energy drink', 2.00, 9999, 'KG-0134', 23.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Ginseng', 'Can', 2.00, 9999, 'KG-0135', 23.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Rubicon', 'Juice', 2.00, 9999, 'KG-0136', 23.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Karak Chai', 'Hot tea', 1.99, 9999, 'KG-0137', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());
INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
VALUES ('Afghani Kawa', 'Hot tea', 1.99, 9999, 'KG-0138', 9.00,
        NULL, NULL, (SELECT id FROM categories WHERE name = 'Drinks' LIMIT 1), NOW(), NOW());

SELECT setval('categories_id_seq', (SELECT COALESCE(max(id), 1) FROM categories));
SELECT setval('items_id_seq', (SELECT COALESCE(max(id), 1) FROM items));

-- Users: keep admin and imran (any casing). Remove everyone else.
DELETE FROM attendances WHERE user_id IN (
  SELECT id FROM users WHERE lower(username) NOT IN ('admin', 'imran')
);
DELETE FROM users WHERE lower(username) NOT IN ('admin', 'imran');

-- Reset admin password to admin123 (same hash as database-setup.sql)
UPDATE users SET password =
  '$2a$10$Zsk8XbjYk3FiVDKjrCKu.O9KrtQ1985FD2Qw4FsdMWt4GjCSIB5j6',
  role = 'ADMIN', is_active = true, updated_at = NOW()
WHERE lower(username) = 'admin';

INSERT INTO users (username, email, password, full_name, role, is_active, created_at, updated_at)
SELECT 'saim', 'saim@khybergrill.ie',
       '$2a$10$1LxzLb2IZ8/gEBSnxhmLw.heEVHk9Mod2ZVWlDkYjbml0mSn7NhU.',
       'Saim', 'ADMIN', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(username) = 'saim');

UPDATE users SET password =
  '$2a$10$1LxzLb2IZ8/gEBSnxhmLw.heEVHk9Mod2ZVWlDkYjbml0mSn7NhU.',
  full_name = 'Saim', role = 'ADMIN', is_active = true, updated_at = NOW()
WHERE lower(username) = 'saim';

COMMIT;

SELECT id, username, full_name, role, is_active FROM users ORDER BY id;
SELECT id, name, vat_rate FROM categories ORDER BY name;
SELECT c.name AS category, count(*) AS items FROM items i JOIN categories c ON c.id = i.category_id GROUP BY 1 ORDER BY 1;

