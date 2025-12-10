-- Add external_ref for provider session mapping
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS external_ref VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_settlements_external_ref ON settlements(external_ref);
