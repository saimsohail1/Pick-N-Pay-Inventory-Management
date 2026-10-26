-- PRODUCTION restore for Khyber City Grill only. Do not run on other shops.
-- Puts back extra sides and drinks the old apply deleted.
-- Does NOT add Pizza, Doner, or Shawarma — those are old-till only, not the new board.
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
-- Extra wrap from the old till (not doner/shawarma)
('Wraps', 'Chicken Tikka Wrap', NULL, 5.99, 9.00, 'KG-0024'),
('Wraps', 'Chicken Tikka Wrap Meal', NULL, 8.99, 9.00, 'KG-0025'),

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
  m.category_name,
  true,
  true,
  CASE WHEN m.category_name = 'Drinks' THEN 23.00 ELSE 9.00 END,
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
WHERE lower(btrim(name)) IN ('wraps', 'fresh-cut chips', 'sides & salad', 'drinks');

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
