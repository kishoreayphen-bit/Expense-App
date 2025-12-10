import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

public class TestPassword {
    public static void main(String[] args) {
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        String rawPassword = "test123";
        String storedHash = "$2a$10$XALsOhfzUyKs4ufd4q1XQOZvYZv5Y3WkQ9nQYJfPYQnWYVYD8KJ6C";
        
        System.out.println("Testing password hashing and verification");
        System.out.println("=======================================\n");
        
        System.out.println("Raw password: " + rawPassword);
        System.out.println("Stored hash:  " + storedHash);
        
        // Generate a new hash for the same password
        String newHash = passwordEncoder.encode(rawPassword);
        System.out.println("\nNew hash:     " + newHash);
        
        // Verify the password against the stored hash
        boolean matches = passwordEncoder.matches(rawPassword, storedHash);
        System.out.println("\nPassword matches stored hash: " + matches);
        
        // Check if the stored hash starts with the expected BCrypt identifier
        System.out.println("\nStored hash starts with $2a$: " + storedHash.startsWith("$2a$"));
        
        // Check if the stored hash has the correct length
        System.out.println("Stored hash length: " + storedHash.length());
        
        // Try with a known good password/hash pair to verify BCrypt is working
        String knownGoodHash = passwordEncoder.encode("password");
        boolean knownGoodMatch = passwordEncoder.matches("password", knownGoodHash);
        System.out.println("\nKnown good password test: " + knownGoodMatch);
    }
}
