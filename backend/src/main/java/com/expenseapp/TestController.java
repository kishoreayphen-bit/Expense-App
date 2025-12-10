package com.expenseapp;

import com.expenseapp.user.Role;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "*")
public class TestController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public TestController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/create-test-user")
    public ResponseEntity<Map<String, Object>> createTestUser() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check if user already exists
            if (userRepository.findByEmail("test3@example.com").isPresent()) {
                response.put("status", "success");
                response.put("message", "Test user already exists");
                return ResponseEntity.ok(response);
            }

            // Create new user
            User user = new User();
            user.setName("Test User 3");
            user.setEmail("test3@example.com");
            user.setPassword(passwordEncoder.encode("password123"));
            user.setRole(Role.USER);
            user.setPhone("1234567890");

            userRepository.save(user);
            
            response.put("status", "success");
            response.put("message", "Test user created successfully");
            response.put("email", "test3@example.com");
            response.put("password", "password123");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Error creating test user: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
