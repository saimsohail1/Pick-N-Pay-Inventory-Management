-- Ensure clean defaults: Inventory System company, single admin user (admin123).
-- BCrypt hash below is for password: admin123

BEGIN;

UPDATE company_settings
SET company_name = 'Inventory System',
    address = NULL,
    phone = NULL,
    email = NULL,
    tax_number = NULL,
    updated_at = NOW();

DELETE FROM users WHERE username <> 'admin';

INSERT INTO users (username, email, password, full_name, role, is_active)
SELECT 'admin', 'admin@local',
       '$2a$10$Zsk8XbjYk3FiVDKjrCKu.O9KrtQ1985FD2Qw4FsdMWt4GjCSIB5j6',
       'System Administrator', 'ADMIN', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

UPDATE users
SET email = 'admin@local',
    password = '$2a$10$Zsk8XbjYk3FiVDKjrCKu.O9KrtQ1985FD2Qw4FsdMWt4GjCSIB5j6',
    full_name = 'System Administrator',
    role = 'ADMIN',
    is_active = true,
    updated_at = NOW()
WHERE username = 'admin';

COMMIT;
