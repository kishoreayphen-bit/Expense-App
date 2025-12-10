package com.expenseapp;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GeneratePasswordHash {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String password = "password123";
        String hashedPassword = encoder.encode(password);
        System.out.println("Hashed password: " + hashedPassword);
        
        // Generate SQL update statement
        System.out.println("\nSQL to update password in database:");
        System.out.println(String.format(
            "UPDATE users SET password = '%s' WHERE email = 'test@example.com';", 
            hashedPassword.replace("$", "\\$")
        ));
    }
}
