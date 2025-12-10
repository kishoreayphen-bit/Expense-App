-- Enforce allowed values for transactions.type and cleanup invalid legacy values
ALTER TABLE transactions
    ADD CONSTRAINT chk_transactions_type_allowed
    CHECK (type IN ('INCOME','TRANSFER'));

-- Optional: delete or move any legacy EXPENSE rows from transactions
-- DELETE FROM transactions WHERE type NOT IN ('INCOME','TRANSFER');
