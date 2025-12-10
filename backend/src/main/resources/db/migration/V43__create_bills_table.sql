-- Create bills table for storing expense receipts/bills
CREATE TABLE IF NOT EXISTS bills (
    id BIGSERIAL PRIMARY KEY,
    bill_number VARCHAR(255),
    expense_id BIGINT,
    user_id BIGINT NOT NULL,
    company_id BIGINT,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    category_id BIGINT,
    merchant VARCHAR(255),
    amount DECIMAL(15,2),
    currency VARCHAR(10),
    bill_date DATE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CONSTRAINT fk_bill_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL,
    CONSTRAINT fk_bill_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bill_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_bill_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Create indexes for efficient searching
CREATE INDEX idx_bills_user_id ON bills(user_id);
CREATE INDEX idx_bills_company_id ON bills(company_id);
CREATE INDEX idx_bills_expense_id ON bills(expense_id);
CREATE INDEX idx_bills_bill_number ON bills(bill_number);
CREATE INDEX idx_bills_bill_date ON bills(bill_date);
CREATE INDEX idx_bills_category_id ON bills(category_id);
CREATE INDEX idx_bills_merchant ON bills(merchant);
CREATE INDEX idx_bills_uploaded_at ON bills(uploaded_at);

-- Create full-text search index for bill numbers and merchants
CREATE INDEX idx_bills_search ON bills USING gin(to_tsvector('english', COALESCE(bill_number, '') || ' ' || COALESCE(merchant, '') || ' ' || COALESCE(notes, '')));
