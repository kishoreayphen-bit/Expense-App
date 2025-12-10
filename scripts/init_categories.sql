-- Insert default expense categories
INSERT INTO categories (name) VALUES 
('Food & Dining'),
('Shopping'),
('Transportation'),
('Housing'),
('Bills & Utilities'),
('Entertainment'),
('Travel'),
('Health & Medical'),
('Education'),
('Gifts & Donations'),
('Personal Care'),
('Groceries'),
('Salary'),
('Bonus'),
('Investment'),
('Other')
ON CONFLICT (name) DO NOTHING;
