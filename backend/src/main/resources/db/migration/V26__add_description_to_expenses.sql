-- Add description column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT;
