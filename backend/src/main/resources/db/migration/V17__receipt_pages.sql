-- Multi-page receipts
CREATE TABLE IF NOT EXISTS receipt_pages (
    id BIGSERIAL PRIMARY KEY,
    receipt_id BIGINT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    file_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (receipt_id, page_number)
);
CREATE INDEX IF NOT EXISTS idx_receipt_pages_receipt ON receipt_pages(receipt_id);
