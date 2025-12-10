-- =====================================================
-- RBAC User Seeding Script
-- Creates test users for each role with known credentials
-- Password for all users: "Password123!"
-- =====================================================

-- First, let's update existing company owners to ADMIN role
UPDATE users 
SET role = 'ADMIN' 
WHERE id IN (
    SELECT DISTINCT created_by 
    FROM companies 
    WHERE created_by IS NOT NULL
);

-- Create SUPER_ADMIN user
-- Email: superadmin@expense.app
-- Password: Password123!
-- Hashed password using BCrypt with strength 10
INSERT INTO users (name, email, password, phone, role, enabled)
VALUES (
    'Super Admin',
    'superadmin@expense.app',
    '$2a$10$dXJ3SW6G7P370kBeiUA.NO/RbpqU4cccD5A3nkSzKFocurBQQR4GC', -- Password123!
    '+1-555-0001',
    'SUPER_ADMIN',
    true
)
ON CONFLICT (email) DO UPDATE 
SET role = 'SUPER_ADMIN',
    name = 'Super Admin',
    phone = '+1-555-0001',
    enabled = true;

-- Create ADMIN user (separate from company owners)
-- Email: admin@expense.app
-- Password: Password123!
INSERT INTO users (name, email, password, phone, role, enabled)
VALUES (
    'Admin User',
    'admin@expense.app',
    '$2a$10$dXJ3SW6G7P370kBeiUA.NO/RbpqU4cccD5A3nkSzKFocurBQQR4GC', -- Password123!
    '+1-555-0002',
    'ADMIN',
    true
)
ON CONFLICT (email) DO UPDATE 
SET role = 'ADMIN',
    name = 'Admin User',
    phone = '+1-555-0002',
    enabled = true;

-- Create MANAGER users for each existing company
-- These managers will be added as members to their respective companies
DO $$
DECLARE
    company_record RECORD;
    manager_email TEXT;
    manager_name TEXT;
    manager_user_id BIGINT;
    counter INT := 1;
BEGIN
    FOR company_record IN 
        SELECT id, company_name FROM companies ORDER BY id
    LOOP
        -- Create unique email for each company's manager
        manager_email := 'manager' || counter || '@expense.app';
        manager_name := 'Manager ' || counter || ' (' || company_record.company_name || ')';
        
        -- Insert or update manager user
        INSERT INTO users (name, email, password, phone, role, enabled)
        VALUES (
            manager_name,
            manager_email,
            '$2a$10$dXJ3SW6G7P370kBeiUA.NO/RbpqU4cccD5A3nkSzKFocurBQQR4GC', -- Password123!
            '+1-555-' || LPAD((1000 + counter)::TEXT, 4, '0'),
            'MANAGER',
            true
        )
        ON CONFLICT (email) DO UPDATE 
        SET role = 'MANAGER',
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            enabled = true
        RETURNING id INTO manager_user_id;
        
        -- If manager already existed, get their ID
        IF manager_user_id IS NULL THEN
            SELECT id INTO manager_user_id FROM users WHERE email = manager_email;
        END IF;
        
        -- Add manager as company member if not already a member
        INSERT INTO company_members (company_id, user_id, role, joined_at)
        VALUES (
            company_record.id,
            manager_user_id,
            'MANAGER',
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (company_id, user_id) DO UPDATE
        SET role = 'MANAGER';
        
        counter := counter + 1;
    END LOOP;
END $$;

-- Create EMPLOYEE user
-- Email: employee@expense.app
-- Password: Password123!
INSERT INTO users (name, email, password, phone, role, enabled)
VALUES (
    'Employee User',
    'employee@expense.app',
    '$2a$10$dXJ3SW6G7P370kBeiUA.NO/RbpqU4cccD5A3nkSzKFocurBQQR4GC', -- Password123!
    '+1-555-9999',
    'EMPLOYEE',
    true
)
ON CONFLICT (email) DO UPDATE 
SET role = 'EMPLOYEE',
    name = 'Employee User',
    phone = '+1-555-9999',
    enabled = true;

-- Add employee to first company (if exists)
DO $$
DECLARE
    first_company_id BIGINT;
    employee_user_id BIGINT;
BEGIN
    SELECT id INTO first_company_id FROM companies ORDER BY id LIMIT 1;
    SELECT id INTO employee_user_id FROM users WHERE email = 'employee@expense.app';
    
    IF first_company_id IS NOT NULL AND employee_user_id IS NOT NULL THEN
        INSERT INTO company_members (company_id, user_id, role, joined_at)
        VALUES (
            first_company_id,
            employee_user_id,
            'EMPLOYEE',
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (company_id, user_id) DO UPDATE
        SET role = 'EMPLOYEE';
    END IF;
END $$;

-- Summary: Print created users
-- (This will be visible in migration logs)
DO $$
DECLARE
    user_count INT;
    company_count INT;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE');
    SELECT COUNT(*) INTO company_count FROM companies;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RBAC Users Seeded Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total users with roles: %', user_count;
    RAISE NOTICE 'Total companies: %', company_count;
    RAISE NOTICE '========================================';
END $$;
