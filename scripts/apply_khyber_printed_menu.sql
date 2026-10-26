-- PRODUCTION script for Khyber City Grill only. Do not run on other shops.
-- Replaces the catalogue so it matches the printed TV board exactly.
-- Categories = board headings. Items = board lines (Regular + Meal where the board has two prices).
-- No Pizza. No Doner. No Shawarma.
-- Chapli Kebab is its own category.
-- Deletes previous items and categories (except Quick Sale). Does NOT wipe sales or users.
-- Past sale lines keep their names; item_id is cleared.
--
-- On the shop till:
--   psql -U postgres -d YOUR_KHYBER_DB -f scripts/apply_khyber_printed_menu.sql

BEGIN;

-- Keep sales. Unlink catalogue FKs that would block DELETE.
UPDATE kitchen_order_items SET item_id = NULL WHERE item_id IS NOT NULL;
DELETE FROM items;
DELETE FROM categories WHERE lower(btrim(name)) <> 'quick sale';

UPDATE categories
SET is_active = true, display_on_pos = true, vat_rate = 23.00, updated_at = NOW()
WHERE lower(btrim(name)) = 'quick sale';

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
SELECT 'Quick Sale', 'Manually keyed sale', true, true, 23.00, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE lower(btrim(name)) = 'quick sale');

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
VALUES
  ('Mains', 'Rice dishes and mains', true, true, 9.00, NOW(), NOW()),
  ('Chapli Kebab', 'Meal: drink + chips', true, true, 9.00, NOW(), NOW()),
  ('Khyber Platters', 'Family platters — includes Afghani kawa', true, true, 9.00, NOW(), NOW()),
  ('Wraps', 'Meal: drink + chips', true, true, 9.00, NOW(), NOW()),
  ('The Grill', 'Charcoal grill — Regular and Meal. Extra rice €2', true, true, 9.00, NOW(), NOW()),
  ('Chips', 'Hot chips', true, true, 9.00, NOW(), NOW()),
  ('Peri Peri Chicken', 'Hot peri peri chicken, boxes and platters', true, true, 9.00, NOW(), NOW()),
  ('Burgers', 'Meal: drink + chips', true, true, 9.00, NOW(), NOW()),
  ('Sides & Salad', 'Hot sides 9%; cold salads/hummus 0%', true, true, 9.00, NOW(), NOW()),
  ('Drinks', 'Cans, water and juice 23%; hot tea 9%', true, true, 23.00, NOW(), NOW());

CREATE TEMP TABLE printed_menu (
  category_name text NOT NULL,
  item_name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  vat_rate numeric(5,2) NOT NULL
);

INSERT INTO printed_menu (category_name, item_name, description, price, vat_rate) VALUES
-- Mains
('Mains', 'Lamb Qabuli Pulao', NULL, 12.99, 9.00),
('Mains', 'Chicken Qabuli Pulao', NULL, 9.99, 9.00),
('Mains', 'Chicken Biryani', NULL, 9.99, 9.00),
('Mains', 'Chicken Karahi', '+ 1 naan', 12.99, 9.00),
('Mains', 'Lamb Karahi', '+ 1 naan', 14.99, 9.00),
('Mains', 'Afghani Mantoo', NULL, 9.99, 9.00),

-- Chapli Kebab (own category)
('Chapli Kebab', 'Chapli Kebab', 'Regular', 9.99, 9.00),
('Chapli Kebab', 'Chapli Kebab Meal', 'Meal: drink + chips', 12.99, 9.00),
('Chapli Kebab', 'Spicy Chapli Kebab', 'Regular', 9.99, 9.00),
('Chapli Kebab', 'Spicy Chapli Kebab Meal', 'Meal: drink + chips', 12.99, 9.00),

-- Khyber Platters
('Khyber Platters', 'Khyber Platter 1', 'Serves 2 — includes Afghani kawa', 45.00, 9.00),
('Khyber Platters', 'Khyber Platter 2', 'Serves 4 — includes Afghani kawa', 75.00, 9.00),
('Khyber Platters', 'Khyber Platter 3', 'Serves 6 — includes Afghani kawa', 100.00, 9.00),

-- Wraps
('Wraps', 'Chapli Kebab Wrap', 'Regular', 5.99, 9.00),
('Wraps', 'Chapli Kebab Wrap Meal', 'Meal: drink + chips', 8.99, 9.00),
('Wraps', 'Peri Peri Wrap', 'Regular', 5.99, 9.00),
('Wraps', 'Peri Peri Wrap Meal', 'Meal: drink + chips', 8.99, 9.00),
('Wraps', 'Falafel Wrap', 'Regular', 5.99, 9.00),
('Wraps', 'Falafel Wrap Meal', 'Meal: drink + chips', 8.99, 9.00),

-- The Grill
('The Grill', 'Lamb Shish Kebab', 'Regular', 9.99, 9.00),
('The Grill', 'Lamb Shish Kebab Meal', 'Meal', 12.99, 9.00),
('The Grill', 'Chicken Shish Kebab', 'Regular', 9.99, 9.00),
('The Grill', 'Chicken Shish Kebab Meal', 'Meal', 12.99, 9.00),
('The Grill', 'Mixed Shish Kebab', 'Regular', 9.99, 9.00),
('The Grill', 'Mixed Shish Kebab Meal', 'Meal', 12.99, 9.00),
('The Grill', 'Lamb Kofta Kebab', 'Regular', 9.99, 9.00),
('The Grill', 'Lamb Kofta Kebab Meal', 'Meal', 12.99, 9.00),
('The Grill', 'Chicken Kofta Kebab', 'Regular', 9.99, 9.00),
('The Grill', 'Chicken Kofta Kebab Meal', 'Meal', 12.99, 9.00),
('The Grill', 'Grilled Lamb Chops', 'Regular', 12.99, 9.00),
('The Grill', 'Grilled Lamb Chops Meal', 'Meal', 15.99, 9.00),
('The Grill', 'Grilled Steak', 'Regular', 12.99, 9.00),
('The Grill', 'Grilled Steak Meal', 'Meal', 15.99, 9.00),
('The Grill', 'Fresh Sea Bass', 'Regular', 11.99, 9.00),
('The Grill', 'Fresh Sea Bass Meal', 'Meal', 14.99, 9.00),
('The Grill', 'Grill Special 1', 'Regular', 14.99, 9.00),
('The Grill', 'Grill Special 1 Meal', 'Meal', 17.99, 9.00),
('The Grill', 'Grill Special 2', 'Regular', 29.99, 9.00),
('The Grill', 'Grill Special 2 Meal', 'Meal', 34.99, 9.00),
('The Grill', 'Extra Rice', 'Swap naan for rice, or add rice', 2.00, 9.00),

-- Chips (board heading)
('Chips', 'Chips', 'Plain', 1.99, 9.00),
('Chips', 'Garlic Chips', NULL, 2.99, 9.00),
('Chips', 'Garlic Cheese Chips', NULL, 3.99, 9.00),
('Chips', 'Curry Chips', NULL, 3.99, 9.00),
('Chips', 'Curry Cheese Chips', NULL, 3.99, 9.00),
('Chips', 'Taco Chips', NULL, 4.99, 9.00),
('Chips', 'Taco Cheese Chips', NULL, 4.99, 9.00),

-- Peri peri
('Peri Peri Chicken', 'Full Chicken', NULL, 13.99, 9.00),
('Peri Peri Chicken', 'Half Chicken', NULL, 7.99, 9.00),
('Peri Peri Chicken', 'Chicken Leg', NULL, 3.99, 9.00),
('Peri Peri Chicken', 'Chicken Breast', NULL, 4.99, 9.00),
('Peri Peri Chicken', 'Chicken Wings', NULL, 5.99, 9.00),
('Peri Peri Chicken', 'Chicken Strips', NULL, 5.99, 9.00),
('Peri Peri Chicken', 'Spicy Chicken Wings', NULL, 5.99, 9.00),
('Peri Peri Chicken', 'Peri Peri Leg Box', 'With drink + chips', 6.99, 9.00),
('Peri Peri Chicken', 'Peri Peri Breast Box', 'With drink + chips', 8.99, 9.00),
('Peri Peri Chicken', 'Peri Peri Goujons Box', 'With drink + chips', 5.99, 9.00),
('Peri Peri Chicken', 'Mini Platter', 'Serves 1', 14.99, 9.00),
('Peri Peri Chicken', 'Mixed Platter', 'Serves 2', 29.99, 9.00),
('Peri Peri Chicken', 'Mega Platter', 'Serves 4', 39.99, 9.00),

-- Burgers
('Burgers', 'Quarter Pounder Burger', 'Regular', 4.99, 9.00),
('Burgers', 'Quarter Pounder Burger Meal', 'Meal: drink + chips', 7.99, 9.00),
('Burgers', 'Half Pounder Burger', 'Regular', 6.99, 9.00),
('Burgers', 'Half Pounder Burger Meal', 'Meal: drink + chips', 9.99, 9.00),
('Burgers', 'Chicken Burger', 'Regular', 4.99, 9.00),
('Burgers', 'Chicken Burger Meal', 'Meal: drink + chips', 7.99, 9.00),
('Burgers', 'Chicken Fillet Burger', 'Regular', 4.99, 9.00),
('Burgers', 'Chicken Fillet Burger Meal', 'Meal: drink + chips', 7.99, 9.00),

-- Sides & salad
('Sides & Salad', 'Naan Bread', NULL, 0.99, 9.00),
('Sides & Salad', 'Garlic Naan Bread', NULL, 2.99, 9.00),
('Sides & Salad', 'Cheese Naan Bread', NULL, 2.99, 9.00),
('Sides & Salad', 'Afghani Bolani', NULL, 2.99, 9.00),
('Sides & Salad', 'Rice Small', NULL, 2.99, 9.00),
('Sides & Salad', 'Rice Large', NULL, 5.99, 9.00),
('Sides & Salad', 'Samosa 3 pcs', '3 pieces', 3.99, 9.00),
('Sides & Salad', 'Hummus with Bread', NULL, 3.99, 0.00),
('Sides & Salad', 'Lentil Sauce', NULL, 2.99, 9.00),
('Sides & Salad', 'Greek Salad', NULL, 4.99, 0.00),
('Sides & Salad', 'Tabbouleh', NULL, 4.99, 0.00),
('Sides & Salad', 'Peri Peri Chicken Salad', NULL, 6.99, 9.00),
('Sides & Salad', 'Onion Rings', '8 pcs', 3.99, 9.00),
('Sides & Salad', 'Onion Rings Meal', '8 pcs meal', 7.99, 9.00),
('Sides & Salad', 'Chicken Nuggets', '8 pcs', 3.99, 9.00),
('Sides & Salad', 'Chicken Nuggets Meal', '8 pcs meal', 7.99, 9.00),
('Sides & Salad', 'Chicken Goujons', '8 pcs', 4.99, 9.00),
('Sides & Salad', 'Chicken Goujons Meal', '8 pcs meal', 7.99, 9.00),

-- Drinks
('Drinks', 'Coke', NULL, 1.50, 23.00),
('Drinks', 'Coke Zero', NULL, 1.50, 23.00),
('Drinks', 'Diet Coke', NULL, 1.50, 23.00),
('Drinks', 'Fanta', NULL, 1.50, 23.00),
('Drinks', 'Club Orange', NULL, 1.50, 23.00),
('Drinks', '7Up', NULL, 1.50, 23.00),
('Drinks', 'Water', NULL, 1.00, 23.00),
('Drinks', 'Capri-Sun', NULL, 1.00, 23.00),
('Drinks', 'Ayran', NULL, 1.50, 23.00),
('Drinks', 'Karak Chai', 'Tea', 1.99, 9.00),
('Drinks', 'Afghani Kawa', 'Tea', 1.00, 9.00);

INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
SELECT
  m.item_name,
  m.description,
  m.price,
  9999,
  'KG-' || lpad(row_number() OVER (ORDER BY m.category_name, m.item_name)::text, 4, '0'),
  m.vat_rate,
  NULL,
  NULL,
  c.id,
  NOW(),
  NOW()
FROM printed_menu m
JOIN categories c ON c.name = m.category_name;

SELECT setval('categories_id_seq', (SELECT COALESCE(max(id), 1) FROM categories));
SELECT setval('items_id_seq', (SELECT COALESCE(max(id), 1) FROM items));

COMMIT;

SELECT id, name FROM categories ORDER BY
  CASE name
    WHEN 'Mains' THEN 1
    WHEN 'Chapli Kebab' THEN 2
    WHEN 'Khyber Platters' THEN 3
    WHEN 'Wraps' THEN 4
    WHEN 'The Grill' THEN 5
    WHEN 'Chips' THEN 6
    WHEN 'Peri Peri Chicken' THEN 7
    WHEN 'Burgers' THEN 8
    WHEN 'Sides & Salad' THEN 9
    WHEN 'Drinks' THEN 10
    WHEN 'Quick Sale' THEN 11
    ELSE 99
  END;

SELECT c.name AS category, count(*) AS items
FROM items i
JOIN categories c ON c.id = i.category_id
GROUP BY 1
ORDER BY 1;

SELECT c.name AS category, i.name, i.price, i.vat_rate
FROM items i
JOIN categories c ON c.id = i.category_id
ORDER BY
  CASE c.name
    WHEN 'Mains' THEN 1
    WHEN 'Chapli Kebab' THEN 2
    WHEN 'Khyber Platters' THEN 3
    WHEN 'Wraps' THEN 4
    WHEN 'The Grill' THEN 5
    WHEN 'Chips' THEN 6
    WHEN 'Peri Peri Chicken' THEN 7
    WHEN 'Burgers' THEN 8
    WHEN 'Sides & Salad' THEN 9
    WHEN 'Drinks' THEN 10
    ELSE 99
  END,
  i.name;
