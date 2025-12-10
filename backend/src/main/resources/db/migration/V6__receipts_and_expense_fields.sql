-- Add merchant and reimbursable fields to expenses; create receipts table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS merchant VARCHAR(200);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_reimbursable BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS receipts (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    file_uri TEXT NOT NULL,
    ocr_status VARCHAR(20), -- PENDING | DONE | FAILED (future)
    extracted_json JSONB,   -- raw OCR extract (future)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_receipts_expense ON receipts(expense_id);
