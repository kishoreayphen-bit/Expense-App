-- Align fx_rates.currency type with JPA expectation (varchar(3))
ALTER TABLE fx_rates
    ALTER COLUMN currency TYPE VARCHAR(3);
