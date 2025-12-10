-- Audit Logs Table (already exists from previous migration, skip creation)

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) NOT NULL DEFAULT 'STRING',
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for system_settings
CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON system_settings(category);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
('app.name', 'Expense Tracker', 'STRING', 'GENERAL', 'Application name', true),
('app.version', '1.0.0', 'STRING', 'GENERAL', 'Application version', true),
('app.maintenance_mode', 'false', 'BOOLEAN', 'GENERAL', 'Enable maintenance mode', false),
('email.smtp_host', 'smtp.gmail.com', 'STRING', 'EMAIL', 'SMTP server host', false),
('email.smtp_port', '587', 'NUMBER', 'EMAIL', 'SMTP server port', false),
('email.from_address', 'noreply@expense.app', 'STRING', 'EMAIL', 'Default from email address', false),
('email.enabled', 'false', 'BOOLEAN', 'EMAIL', 'Enable email notifications', false),
('storage.max_file_size', '10485760', 'NUMBER', 'STORAGE', 'Max file size in bytes (10MB)', false),
('storage.allowed_types', 'jpg,jpeg,png,pdf', 'STRING', 'STORAGE', 'Allowed file types', false),
('security.session_timeout', '3600', 'NUMBER', 'SECURITY', 'Session timeout in seconds', false),
('security.max_login_attempts', '5', 'NUMBER', 'SECURITY', 'Max failed login attempts', false),
('security.password_min_length', '8', 'NUMBER', 'SECURITY', 'Minimum password length', false),
('features.company_mode', 'true', 'BOOLEAN', 'FEATURES', 'Enable company mode', true),
('features.splits', 'true', 'BOOLEAN', 'FEATURES', 'Enable bill splitting', true),
('features.fx', 'true', 'BOOLEAN', 'FEATURES', 'Enable currency exchange', true),
('features.reimbursements', 'true', 'BOOLEAN', 'FEATURES', 'Enable reimbursements', true)
ON CONFLICT (setting_key) DO NOTHING;

-- Add audit log trigger for important tables
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_email, action, entity_type, entity_id, details)
        VALUES (current_user, 'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD)::text);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_email, action, entity_type, entity_id, details)
        VALUES (current_user, 'UPDATE', TG_TABLE_NAME, NEW.id, 
                json_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))::text);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_email, action, entity_type, entity_id, details)
        VALUES (current_user, 'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW)::text);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables (optional - can be enabled later)
-- CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
--     FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
-- CREATE TRIGGER audit_companies AFTER INSERT OR UPDATE OR DELETE ON companies
--     FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
