-- Add default categories
INSERT INTO categories (name, parent_id) VALUES 
('Food', NULL),
('Groceries', NULL),
('Transportation', NULL),
('Housing', NULL),
('Utilities', NULL),
('Healthcare', NULL),
('Entertainment', NULL),
('Shopping', NULL),
('Education', NULL),
('Travel', NULL),
('Gifts', NULL),
('Other', NULL);

-- Subcategories for Food
INSERT INTO categories (name, parent_id)
SELECT 'Restaurants', id FROM categories WHERE name = 'Food';

-- Subcategories for Transportation
INSERT INTO categories (name, parent_id)
SELECT 'Public Transit', id FROM categories WHERE name = 'Transportation';

INSERT INTO categories (name, parent_id)
SELECT 'Taxi', id FROM categories WHERE name = 'Transportation';

-- Subcategories for Housing
INSERT INTO categories (name, parent_id)
SELECT 'Rent', id FROM categories WHERE name = 'Housing';

INSERT INTO categories (name, parent_id)
SELECT 'Mortgage', id FROM categories WHERE name = 'Housing';

-- Subcategories for Utilities
INSERT INTO categories (name, parent_id)
SELECT 'Electricity', id FROM categories WHERE name = 'Utilities';

INSERT INTO categories (name, parent_id)
SELECT 'Water', id FROM categories WHERE name = 'Utilities';

-- Subcategories for Shopping
INSERT INTO categories (name, parent_id)
SELECT 'Clothing', id FROM categories WHERE name = 'Shopping';

-- Subcategories for Entertainment
INSERT INTO categories (name, parent_id)
SELECT 'Movies', id FROM categories WHERE name = 'Entertainment';

-- Verify the categories were added
SELECT * FROM categories ORDER BY parent_id NULLS FIRST, name;
