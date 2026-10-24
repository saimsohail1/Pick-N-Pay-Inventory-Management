-- PRODUCTION restore for Khyber City Grill only. Do not run on other shops.
-- Puts back Pizza, Shawarma/Doner, extra wraps, Doner burgers, extra sides
-- and drinks that scripts/apply_khyber_printed_menu.sql previously deleted.
-- Keeps printed-board items and prices already on the till.
-- Does not wipe sales or users. Does not delete any item.
--
-- On the shop till:
--   psql -U postgres -d YOUR_KHYBER_DB -f scripts/restore_khyber_removed_catalogue.sql

BEGIN;

CREATE TEMP TABLE restore_menu (
  category_name text NOT NULL,
  item_name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  vat_rate numeric(5,2) NOT NULL,
  barcode text NOT NULL
);

INSERT INTO restore_menu (category_name, item_name, description, price, vat_rate, barcode) VALUES
-- Shawarma / Doner (old till — not on the TV board, still sold)
('Shawarma Kebabs', 'Lamb Doner Kebab', 'Lamb slow-roasted on an upright spit', 7.99, 9.00, 'KG-0008'),
('Shawarma Kebabs', 'Lamb Doner Kebab Meal', 'Lamb slow-roasted on an upright spit', 9.99, 9.00, 'KG-0009'),
('Shawarma Kebabs', 'Chicken Doner Kebab', 'Marinated chicken roasted on an upright spit', 7.99, 9.00, 'KG-0010'),
('Shawarma Kebabs', 'Chicken Doner Kebab Meal', 'Marinated chicken roasted on an upright spit', 9.99, 9.00, 'KG-0011'),
('Shawarma Kebabs', 'Mixed Doner Kebab', 'Lamb and chicken shawarma in naan with salad', 7.99, 9.00, 'KG-0012'),
('Shawarma Kebabs', 'Mixed Doner Kebab Meal', 'Lamb and chicken shawarma in naan with salad', 9.99, 9.00, 'KG-0013'),
('Shawarma Kebabs', 'Chicken Shawarma Kebab', 'Chicken shawarma with salad and garlic', 7.99, 9.00, 'KG-0014'),
('Shawarma Kebabs', 'Chicken Shawarma Kebab Meal', 'Chicken shawarma with salad and garlic', 9.99, 9.00, 'KG-0015'),

-- Extra wraps from the old till
('Wraps', 'Lamb Doner Wrap', NULL, 5.99, 9.00, 'KG-0018'),
('Wraps', 'Lamb Doner Wrap Meal', NULL, 8.99, 9.00, 'KG-0019'),
('Wraps', 'Mixed Doner Wrap', NULL, 5.99, 9.00, 'KG-0020'),
('Wraps', 'Mixed Doner Wrap Meal', NULL, 8.99, 9.00, 'KG-0021'),
('Wraps', 'Chicken Shawarma Wrap', NULL, 5.99, 9.00, 'KG-0022'),
('Wraps', 'Chicken Shawarma Wrap Meal', NULL, 8.99, 9.00, 'KG-0023'),
('Wraps', 'Chicken Tikka Wrap', NULL, 5.99, 9.00, 'KG-0024'),
('Wraps', 'Chicken Tikka Wrap Meal', NULL, 8.99, 9.00, 'KG-0025'),

-- Pizza
('Pizza', 'Margherita 10"', NULL, 9.99, 9.00, 'KG-0050'),
('Pizza', 'Margherita 12"', NULL, 11.99, 9.00, 'KG-0051'),
('Pizza', 'Margherita 16"', NULL, 14.99, 9.00, 'KG-0052'),
('Pizza', 'Pepperoni Deluxe 10"', NULL, 9.99, 9.00, 'KG-0053'),
('Pizza', 'Pepperoni Deluxe 12"', NULL, 11.99, 9.00, 'KG-0054'),
('Pizza', 'Pepperoni Deluxe 16"', NULL, 14.99, 9.00, 'KG-0055'),
('Pizza', 'Meat Feast 10"', NULL, 9.99, 9.00, 'KG-0056'),
('Pizza', 'Meat Feast 12"', NULL, 11.99, 9.00, 'KG-0057'),
('Pizza', 'Meat Feast 16"', NULL, 14.99, 9.00, 'KG-0058'),
('Pizza', 'Four Seasons 10"', NULL, 9.99, 9.00, 'KG-0059'),
('Pizza', 'Four Seasons 12"', NULL, 11.99, 9.00, 'KG-0060'),
('Pizza', 'Four Seasons 16"', NULL, 14.99, 9.00, 'KG-0061'),
('Pizza', 'Hawaiian 10"', NULL, 9.99, 9.00, 'KG-0062'),
('Pizza', 'Hawaiian 12"', NULL, 11.99, 9.00, 'KG-0063'),
('Pizza', 'Hawaiian 16"', NULL, 14.99, 9.00, 'KG-0064'),
('Pizza', 'Hot & Spicy 10"', NULL, 9.99, 9.00, 'KG-0065'),
('Pizza', 'Hot & Spicy 12"', NULL, 11.99, 9.00, 'KG-0066'),
('Pizza', 'Hot & Spicy 16"', NULL, 14.99, 9.00, 'KG-0067'),
('Pizza', 'Vegetarian 10"', NULL, 9.99, 9.00, 'KG-0068'),
('Pizza', 'Vegetarian 12"', NULL, 11.99, 9.00, 'KG-0069'),
('Pizza', 'Vegetarian 16"', NULL, 14.99, 9.00, 'KG-0070'),
('Pizza', 'Extra Pizza Topping', 'Any extra topping', 1.49, 9.00, 'KG-0071'),

-- Extra burger
('Burgers', 'Doner Burger', NULL, 5.99, 9.00, 'KG-0080'),
('Burgers', 'Doner Burger Meal', NULL, 8.99, 9.00, 'KG-0081'),

-- Extra chips / sides
('Fresh-Cut Chips', 'Curry Chips', NULL, 3.99, 9.00, 'KG-0085'),
('Sides & Salad', 'Lentil Sauce Large', NULL, 6.99, 9.00, 'KG-0111'),
('Sides & Salad', 'Garlic Bread', NULL, 2.99, 9.00, 'KG-0115'),
('Sides & Salad', 'Garlic Bread with Cheese', NULL, 3.99, 9.00, 'KG-0116'),

-- Extra drinks
('Drinks', 'Red Bull', 'Energy drink', 2.00, 23.00, 'KG-0133'),
('Drinks', 'Alokozay', 'Energy drink', 2.00, 23.00, 'KG-0134'),
('Drinks', 'Ginseng', 'Can', 2.00, 23.00, 'KG-0135'),
('Drinks', 'Rubicon', 'Juice', 2.00, 23.00, 'KG-0136');

INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)
SELECT DISTINCT
  m.category_name,
  CASE m.category_name
    WHEN 'Shawarma Kebabs' THEN 'Doner and shawarma — Regular and Meal'
    WHEN 'Pizza' THEN '10, 12 and 16 inch — hot takeaway'
    ELSE m.category_name
  END,
  true,
  true,
  9.00,
  NOW(),
  NOW()
FROM restore_menu m
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE lower(btrim(c.name)) = lower(m.category_name)
);

UPDATE categories
SET is_active = true,
    display_on_pos = true,
    updated_at = NOW()
WHERE lower(btrim(name)) IN ('shawarma kebabs', 'pizza', 'wraps', 'burgers',
                             'fresh-cut chips', 'sides & salad', 'drinks');

INSERT INTO items (name, description, price, stock_quantity, barcode, vat_rate,
                   batch_id, general_expiry_date, category_id, created_at, updated_at)
SELECT
  m.item_name,
  m.description,
  m.price,
  9999,
  CASE
    WHEN EXISTS (SELECT 1 FROM items i WHERE i.barcode = m.barcode)
      THEN 'KG-R' || lpad((1000 + row_number() OVER (ORDER BY m.category_name, m.item_name))::text, 4, '0')
    ELSE m.barcode
  END,
  m.vat_rate,
  NULL,
  NULL,
  c.id,
  NOW(),
  NOW()
FROM restore_menu m
JOIN categories c ON lower(btrim(c.name)) = lower(m.category_name)
WHERE NOT EXISTS (
  SELECT 1 FROM items i WHERE lower(btrim(i.name)) = lower(m.item_name)
);

SELECT setval('categories_id_seq', (SELECT COALESCE(max(id), 1) FROM categories));
SELECT setval('items_id_seq', (SELECT COALESCE(max(id), 1) FROM items));

COMMIT;

SELECT id, name FROM categories ORDER BY name;
SELECT c.name AS category, count(*) AS items
FROM items i
JOIN categories c ON c.id = i.category_id
GROUP BY 1
ORDER BY 1;
SELECT c.name AS category, i.name, i.price
FROM items i
JOIN categories c ON c.id = i.category_id
ORDER BY c.name, i.name;
