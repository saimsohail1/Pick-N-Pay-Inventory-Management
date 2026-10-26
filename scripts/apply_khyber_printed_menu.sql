-- PRODUCTION script for Khyber City Grill only. Do not run on other shops.
-- Upserts printed-board prices and new board items. Does NOT delete catalogue.
-- Does not add Pizza, Doner, or Shawarma (old till only, not the new board).
-- Quick Sale stays. Does not wipe sales or users.
--
-- Extra drinks/sides the old apply deleted:
--   scripts/restore_khyber_removed_catalogue.sql
--
-- On the shop till, after git pull on Khyber_Grill:
--   psql -U postgres -d YOUR_KHYBER_DB -f scripts/apply_khyber_printed_menu.sql
--
-- Replace YOUR_KHYBER_DB with the live Khyber database name.

BEGIN;

CREATE TEMP TABLE printed_menu (
  category_name text NOT NULL,
  item_name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  vat_rate numeric(5,2) NOT NULL
);

INSERT INTO printed_menu (category_name, item_name, description, price, vat_rate) VALUES
-- Mains
('Mains', 'Lamb Qabuli Pulao', 'Slow-cooked lamb over fragrant rice with carrots, raisins', 12.99, 9.00),
('Mains', 'Chicken Qabuli Pulao', 'Grilled chicken over fragrant rice with carrots, raisins', 9.99, 9.00),
('Mains', 'Chicken Biryani', 'Spiced rice slow-cooked with marinated chicken', 9.99, 9.00),
('Mains', 'Chicken Karahi', 'Includes 1 naan', 12.99, 9.00),
('Mains', 'Lamb Karahi', 'Includes 1 naan', 14.99, 9.00),
('Mains', 'Afghani Mantoo', 'Steamed dumplings filled with seasoned minced lamb', 9.99, 9.00),
('Mains', 'Extra Rice', 'Swap naan for rice, or add rice', 2.00, 9.00),

-- Chapli Kebab
('Chapli Kebab', 'Chapli Kebab', 'Crispy Afghan minced lamb patties', 9.99, 9.00),
('Chapli Kebab', 'Chapli Kebab Meal', 'Meal: drink + chips', 12.99, 9.00),
('Chapli Kebab', 'Spicy Chapli Kebab', 'Spicy Afghan minced lamb patties', 9.99, 9.00),
('Chapli Kebab', 'Spicy Chapli Kebab Meal', 'Meal: drink + chips', 12.99, 9.00),

-- Khyber Platters
('Khyber Platters', 'Khyber Platter 1', 'Serves 2 — includes Afghani kawa', 45.00, 9.00),
('Khyber Platters', 'Khyber Platter 2', 'Serves 4 — includes Afghani kawa', 75.00, 9.00),
('Khyber Platters', 'Khyber Platter 3', 'Serves 6 — includes Afghani kawa', 100.00, 9.00),

-- Wraps
('Wraps', 'Chapli Kebab Wrap', 'Meal option is drink + chips', 5.99, 9.00),
('Wraps', 'Chapli Kebab Wrap Meal', 'Meal: drink + chips', 8.99, 9.00),
('Wraps', 'Peri Peri Wrap', 'Meal option is drink + chips', 5.99, 9.00),
('Wraps', 'Peri Peri Wrap Meal', 'Meal: drink + chips', 8.99, 9.00),
('Wraps', 'Falafel Wrap', 'Meal option is drink + chips', 5.99, 9.00),
('Wraps', 'Falafel Wrap Meal', 'Meal: drink + chips', 8.99, 9.00),

-- The Grill
('The Grill', 'Lamb Shish Kebab', 'Regular', 9.99, 9.00),
('The Grill', 'Lamb Shish Kebab Meal', 'Meal: drink + chips', 12.99, 9.00),
('The Grill', 'Chicken Shish Kebab', 'Regular', 9.99, 9.00),
('The Grill', 'Chicken Shish Kebab Meal', 'Meal: drink + chips', 12.99, 9.00),
('The Grill', 'Mixed Shish Kebab', 'Regular', 9.99, 9.00),
('The Grill', 'Mixed Shish Kebab Meal', 'Meal: drink + chips', 12.99, 9.00),
('The Grill', 'Lamb Kofta Kebab', 'Regular', 9.99, 9.00),
('The Grill', 'Lamb Kofta Kebab Meal', 'Meal: drink + chips', 12.99, 9.00),
('The Grill', 'Chicken Kofta Kebab', 'Regular', 9.99, 9.00),
('The Grill', 'Chicken Kofta Kebab Meal', 'Meal: drink + chips', 12.99, 9.00),
('The Grill', 'Grilled Lamb Chops', 'Regular', 12.99, 9.00),
('The Grill', 'Grilled Lamb Chops Meal', 'Meal: drink + chips', 15.99, 9.00),
('The Grill', 'Grilled Steak', 'Regular', 12.99, 9.00),
('The Grill', 'Grilled Steak Meal', 'Meal: drink + chips', 15.99, 9.00),
('The Grill', 'Fresh Sea Bass', 'Regular', 11.99, 9.00),
('The Grill', 'Fresh Sea Bass Meal', 'Meal: drink + chips', 14.99, 9.00),
('The Grill', 'Grill Special 1', 'Regular', 14.99, 9.00),
('The Grill', 'Grill Special 1 Meal', 'Meal: drink + chips', 17.99, 9.00),
('The Grill', 'Grill Special 2', 'Regular', 29.99, 9.00),
('The Grill', 'Grill Special 2 Meal', 'Meal: drink + chips', 34.99, 9.00),

-- Fresh-cut chips
('Fresh-Cut Chips', 'Chips', 'Plain', 1.99, 9.00),
('Fresh-Cut Chips', 'Garlic Chips', NULL, 2.99, 9.00),
('Fresh-Cut Chips', 'Cheese Chips', NULL, 3.99, 9.00),
('Fresh-Cut Chips', 'Curry Cheese Chips', NULL, 3.99, 9.00),
('Fresh-Cut Chips', 'Taco Chips', NULL, 4.99, 9.00),
('Fresh-Cut Chips', 'Taco Cheese Chips', NULL, 4.99, 9.00),

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
('Sides & Salad', 'Hummus with bread', NULL, 3.99, 0.00),
('Sides & Salad', 'Lentil Sauce', NULL, 2.99, 9.00),
('Sides & Salad', 'Greek Salad', NULL, 4.99, 0.00),
('Sides & Salad', 'Tabbouleh', NULL, 4.99, 0.00),
('Sides & Salad', 'Peri Peri Chicken Salad', 'Hot chicken salad', 6.99, 9.00),
('Sides & Salad', 'Onion Rings', '8 pcs', 3.99, 9.00),
('Sides & Salad', 'Onion Rings Meal', '8 pcs meal', 7.99, 9.00),
('Sides & Salad', 'Chicken Nuggets', '6 pcs', 4.99, 9.00),
('Sides & Salad', 'Chicken Nuggets Meal', '6 pcs meal', 7.99, 9.00),
('Sides & Salad', 'Chicken Goujons', '6 pcs', 4.99, 9.00),
('Sides & Salad', 'Chicken Goujons Meal', '6 pcs meal', 7.99, 9.00),

-- Drinks
('Drinks', 'Coke', 'Can', 1.50, 23.00),
('Drinks', 'Coke Zero', 'Can', 1.50, 23.00),
('Drinks', 'Diet Coke', 'Can', 1.50, 23.00),
('Drinks', 'Fanta', 'Can', 1.50, 23.00),
('Drinks', 'Club Orange', 'Can', 1.50, 23.00),
('Drinks', '7Up', 'Can', 1.50, 23.00),
('Drinks', 'Water', 'Bottle', 1.00, 23.00),
('Drinks', 'Capri-Sun', NULL, 1.00, 23.00),
('Drinks', 'Ayran', NULL, 1.50, 23.00),
('Drinks', 'Karak Chai', 'Hot tea', 1.99, 9.00),
('Drinks', 'Afghani Kawwa', 'Hot tea', 1.00, 9.00);

-- Align old names to the printed board
UPDATE categories
SET name = 'Mains',
    description = 'Rice dishes and mains',
    is_active = true,
    display_on_pos = true,
    vat_rate = 9.00,
    updated_at = NOW()
WHERE lower(btrim(name)) IN ('qabuli pulao & mains', 'mains');

UPDATE items SET name = 'Peri Peri Wrap', updated_at = NOW()
WHERE lower(btrim(name)) = 'chicken peri peri wrap';
UPDATE items SET name = 'Peri Peri Wrap Meal', updated_at = NOW()
WHERE lower(btrim(name)) = 'chicken peri peri wrap meal';
UPDATE items SET name = 'Cheese Chips', updated_at = NOW()
WHERE lower(btrim(name)) = 'garlic cheese chips';
UPDATE items SET name = 'Hummus with bread', updated_at = NOW()
WHERE lower(btrim(name)) = 'hummus';
UPDATE items SET name = 'Lentil Sauce', updated_at = NOW()
WHERE lower(btrim(name)) = 'lentil sauce small';
UPDATE items SET name = 'Afghani Kawwa', updated_at = NOW()
WHERE lower(btrim(name)) IN ('afghani kawa', 'afghani kawwa');

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
SELECT DISTINCT
  m.category_name,
  CASE m.category_name
    WHEN 'Drinks' THEN 'Cans, water and juice 23%; hot tea 9% on the item'
    WHEN 'Sides & Salad' THEN 'Hot sides 9%; cold salads/hummus 0%'
    WHEN 'Khyber Platters' THEN 'Family platters — includes Afghani kawa'
    ELSE m.category_name
  END,
  true,
  true,
  CASE WHEN m.category_name = 'Drinks' THEN 23.00 ELSE 9.00 END,
  NOW(),
  NOW()
FROM printed_menu m
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE lower(btrim(c.name)) = lower(m.category_name)
);

UPDATE categories c
SET is_active = true,
    display_on_pos = true,
    vat_rate = CASE WHEN c.name = 'Drinks' THEN 23.00 ELSE 9.00 END,
    updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM printed_menu m WHERE lower(btrim(m.category_name)) = lower(btrim(c.name))
);

UPDATE categories SET is_active = true, display_on_pos = true, updated_at = NOW()
WHERE lower(btrim(name)) = 'quick sale';

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
SELECT 'Quick Sale', 'Manually keyed sale', true, true, 23.00, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE lower(btrim(name)) = 'quick sale');

UPDATE items i
SET description = m.description,
    price = m.price,
    vat_rate = m.vat_rate,
    stock_quantity = 9999,
    category_id = c.id,
    updated_at = NOW()
FROM printed_menu m
JOIN categories c ON lower(btrim(c.name)) = lower(m.category_name)
WHERE lower(btrim(i.name)) = lower(m.item_name);

INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
SELECT
  m.item_name,
  m.description,
  m.price,
  9999,
  'KG-' || lpad((
    200 + row_number() OVER (ORDER BY m.category_name, m.item_name)
  )::text, 4, '0'),
  m.vat_rate,
  NULL,
  NULL,
  c.id,
  NOW(),
  NOW()
FROM printed_menu m
JOIN categories c ON lower(btrim(c.name)) = lower(m.category_name)
WHERE NOT EXISTS (
  SELECT 1 FROM items i WHERE lower(btrim(i.name)) = lower(m.item_name)
);

SELECT setval('categories_id_seq', (SELECT COALESCE(max(id), 1) FROM categories));
SELECT setval('items_id_seq', (SELECT COALESCE(max(id), 1) FROM items));

COMMIT;

SELECT id, name, vat_rate FROM categories ORDER BY name;
SELECT c.name AS category, count(*) AS items
FROM items i
JOIN categories c ON c.id = i.category_id
GROUP BY 1
ORDER BY 1;
SELECT c.name AS category, i.name, i.price, i.vat_rate
FROM items i
JOIN categories c ON c.id = i.category_id
ORDER BY c.name, i.name;
