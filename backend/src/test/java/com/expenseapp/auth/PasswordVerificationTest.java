package com.expenseapp.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

public class PasswordVerificationTest {

    @Test
    public void testPasswordMatching() {
        String storedHash = "$2a$10$XALsOhfzUyKs4ufd4q1XQOZvYZv5Y3WkQ9nQYJfPYQnWYVYD8KJ6C";
        String password = "admin123";
        
        // Create a password encoder with default settings
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        
        System.out.println("=== Password Verification Test ===");
        System.out.println("Testing password: " + password);
        System.out.println("Stored hash: " + storedHash);
        System.out.println("Stored hash length: " + storedHash.length());
        
        // Check bcrypt version and parameters
        if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("2y$")) {
            System.out.println("BCrypt version: " + storedHash.substring(0, 4));
            String cost = storedHash.substring(4, 6);
            System.out.println("BCrypt cost: " + cost);
        } else {
            System.out.println("Not a valid BCrypt hash");
        }
        
        // Check if the password matches the stored hash
        boolean matches = passwordEncoder.matches(password, storedHash);
        System.out.println("Password matches: " + matches);
        
        // Generate a new hash for the same password
        String newHash = passwordEncoder.encode(password);
        System.out.println("New hash: " + newHash);
        System.out.println("New hash length: " + newHash.length());
        
        // Check if the new hash matches the stored hash (should be false)
        boolean newHashMatches = storedHash.equals(newHash);
        System.out.println("New hash matches stored hash: " + newHashMatches);
        
        // Check if the new hash verifies the password
        boolean newHashVerifies = passwordEncoder.matches(password, newHash);
        System.out.println("New hash verifies password: " + newHashVerifies);
        
        // The stored hash should verify the password
        assertTrue(matches, "Stored hash should verify the password");
    }
}
