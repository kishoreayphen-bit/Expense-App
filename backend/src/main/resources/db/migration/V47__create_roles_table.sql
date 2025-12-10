-- Create roles table for RBAC system
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    level INT NOT NULL DEFAULT 0, -- Hierarchy: 0=EMPLOYEE, 1=MANAGER, 2=ADMIN, 3=SUPER_ADMIN
    is_system_role BOOLEAN NOT NULL DEFAULT false, -- System roles can't be deleted
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, display_name, description, level, is_system_role) VALUES
('EMPLOYEE', 'Employee', 'Can submit expenses, view own data, upload bills', 0, true),
('MANAGER', 'Manager', 'Can approve expenses, view team data, access reports', 1, true),
('ADMIN', 'Admin', 'Can manage users, configure policies, view all data', 2, true),
('SUPER_ADMIN', 'Super Admin', 'Full system access, manage admins, system settings', 3, true);

-- Create role_permissions table for fine-grained permissions
CREATE TABLE role_permissions (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_name VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50), -- expense, user, company, budget, etc.
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_read BOOLEAN NOT NULL DEFAULT false,
    can_update BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(role_id, permission_name, resource_type)
);

-- Create indexes for performance
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_level ON roles(level);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_resource ON role_permissions(resource_type);

-- Add role_id to users table (keep existing role column for backward compatibility)
ALTER TABLE users ADD COLUMN role_id BIGINT REFERENCES roles(id);

-- Migrate existing user roles to new table
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE') WHERE role = 'USER';
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'MANAGER') WHERE role = 'MANAGER';
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'ADMIN') WHERE role = 'ADMIN';

-- Add role_id to company_members table (keep existing role column for backward compatibility)
ALTER TABLE company_members ADD COLUMN role_id BIGINT REFERENCES roles(id);

-- Migrate company member roles
UPDATE company_members SET role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE') WHERE role = 'EMPLOYEE';
UPDATE company_members SET role_id = (SELECT id FROM roles WHERE name = 'MANAGER') WHERE role = 'MANAGER';
UPDATE company_members SET role_id = (SELECT id FROM roles WHERE name = 'ADMIN') WHERE role = 'ADMIN';
UPDATE company_members SET role_id = (SELECT id FROM roles WHERE name = 'ADMIN') WHERE role = 'OWNER'; -- Map OWNER to ADMIN

-- Insert default permissions for EMPLOYEE role
INSERT INTO role_permissions (role_id, permission_name, resource_type, can_create, can_read, can_update, can_delete) VALUES
((SELECT id FROM roles WHERE name = 'EMPLOYEE'), 'MANAGE_OWN_EXPENSES', 'expense', true, true, true, false),
((SELECT id FROM roles WHERE name = 'EMPLOYEE'), 'UPLOAD_BILLS', 'bill', true, true, false, false),
((SELECT id FROM roles WHERE name = 'EMPLOYEE'), 'VIEW_OWN_DATA', 'user', false, true, false, false),
((SELECT id FROM roles WHERE name = 'EMPLOYEE'), 'REQUEST_REIMBURSEMENT', 'reimbursement', true, true, false, false);

-- Insert default permissions for MANAGER role
INSERT INTO role_permissions (role_id, permission_name, resource_type, can_create, can_read, can_update, can_delete) VALUES
((SELECT id FROM roles WHERE name = 'MANAGER'), 'MANAGE_OWN_EXPENSES', 'expense', true, true, true, false),
((SELECT id FROM roles WHERE name = 'MANAGER'), 'APPROVE_EXPENSES', 'expense', false, true, true, false),
((SELECT id FROM roles WHERE name = 'MANAGER'), 'VIEW_TEAM_DATA', 'team', false, true, false, false),
((SELECT id FROM roles WHERE name = 'MANAGER'), 'APPROVE_REIMBURSEMENTS', 'reimbursement', false, true, true, false),
((SELECT id FROM roles WHERE name = 'MANAGER'), 'VIEW_REPORTS', 'report', false, true, false, false);

-- Insert default permissions for ADMIN role
INSERT INTO role_permissions (role_id, permission_name, resource_type, can_create, can_read, can_update, can_delete) VALUES
((SELECT id FROM roles WHERE name = 'ADMIN'), 'MANAGE_USERS', 'user', true, true, true, true),
((SELECT id FROM roles WHERE name = 'ADMIN'), 'MANAGE_ROLES', 'role', false, true, true, false),
((SELECT id FROM roles WHERE name = 'ADMIN'), 'MANAGE_POLICIES', 'policy', true, true, true, true),
((SELECT id FROM roles WHERE name = 'ADMIN'), 'VIEW_ALL_EXPENSES', 'expense', false, true, false, false),
((SELECT id FROM roles WHERE name = 'ADMIN'), 'CONFIGURE_SYSTEM', 'system', false, true, true, false);

-- Insert default permissions for SUPER_ADMIN role
INSERT INTO role_permissions (role_id, permission_name, resource_type, can_create, can_read, can_update, can_delete) VALUES
((SELECT id FROM roles WHERE name = 'SUPER_ADMIN'), 'MANAGE_ADMINS', 'admin', true, true, true, true),
((SELECT id FROM roles WHERE name = 'SUPER_ADMIN'), 'MANAGE_ALL_ROLES', 'role', true, true, true, true),
((SELECT id FROM roles WHERE name = 'SUPER_ADMIN'), 'SYSTEM_SETTINGS', 'system', true, true, true, true),
((SELECT id FROM roles WHERE name = 'SUPER_ADMIN'), 'VIEW_AUDIT_LOGS', 'audit', false, true, false, false),
((SELECT id FROM roles WHERE name = 'SUPER_ADMIN'), 'FULL_ACCESS', 'all', true, true, true, true);

-- Create audit_logs table for tracking all actions
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(320),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id BIGINT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
