package com.expenseapp.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utility to generate BCrypt password hashes
 * Run this to generate hashes for seed data
 */
public class PasswordHashGenerator {
    
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);
        
        String password = "Password123!";
        String hash = encoder.encode(password);
        
        System.out.println("========================================");
        System.out.println("Password Hash Generator");
        System.out.println("========================================");
        System.out.println("Plain Password: " + password);
        System.out.println("BCrypt Hash:    " + hash);
        System.out.println("========================================");
        System.out.println("\nUse this hash in your SQL migration:");
        System.out.println("'" + hash + "'");
        System.out.println("========================================");
        
        // Verify the hash works
        boolean matches = encoder.matches(password, hash);
        System.out.println("\nVerification: " + (matches ? "✓ Hash is valid" : "✗ Hash is invalid"));
        System.out.println("========================================");
    }
}
