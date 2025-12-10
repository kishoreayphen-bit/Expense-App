package com.expenseapp.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

public class PasswordTest {
    
    @Test
    public void testPasswordHashing() {
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        String rawPassword = "test123";
        String storedHash = "$2a$10$XALsOhfzUyKs4ufd4q1XQOZvYZv5Y3WkQ9nQYJfPYQnWYVYD8KJ6C";
        
        System.out.println("Raw password: " + rawPassword);
        System.out.println("Stored hash: " + storedHash);
        
        // Generate a new hash for the same password
        String newHash = passwordEncoder.encode(rawPassword);
        System.out.println("New hash: " + newHash);
        
        // Verify the password against the stored hash
        boolean matches = passwordEncoder.matches(rawPassword, storedHash);
        System.out.println("Password matches: " + matches);
        
        // Generate a new hash with the same salt as the stored hash
        String salt = storedHash.substring(0, 29); // BCrypt stores the salt in the first 29 characters
        System.out.println("Salt from stored hash: " + salt);
        
        // This is just for demonstration - in practice, you can't directly set the salt in BCrypt
        System.out.println("Note: BCrypt doesn't support setting a specific salt in the standard API");
    }
}
