package com.picknpay.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/migration")
public class MigrationController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostMapping("/fix-enum-schema")
    public String fixEnumSchema() {
        try {
            // Fix sales table
            jdbcTemplate.execute("ALTER TABLE sales ADD COLUMN payment_method_new VARCHAR(10)");
            jdbcTemplate.execute("UPDATE sales SET payment_method_new = payment_method::text");
            jdbcTemplate.execute("ALTER TABLE sales DROP COLUMN payment_method");
            jdbcTemplate.execute("ALTER TABLE sales RENAME COLUMN payment_method_new TO payment_method");
            jdbcTemplate.execute("ALTER TABLE sales ALTER COLUMN payment_method SET NOT NULL");

            // Fix users table
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN role_new VARCHAR(10)");
            jdbcTemplate.execute("UPDATE users SET role_new = role::text");
            jdbcTemplate.execute("ALTER TABLE users DROP COLUMN role");
            jdbcTemplate.execute("ALTER TABLE users RENAME COLUMN role_new TO role");
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN role SET NOT NULL");

            // Drop enum types
            jdbcTemplate.execute("DROP TYPE IF EXISTS payment_method");
            jdbcTemplate.execute("DROP TYPE IF EXISTS user_role");

            return "Enum schema migration completed successfully!";
        } catch (Exception e) {
            return "Migration failed: " + e.getMessage();
        }
    }
}
