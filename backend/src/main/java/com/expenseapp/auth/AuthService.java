package com.expenseapp.auth;

import com.expenseapp.auth.dto.LoginRequest;
import com.expenseapp.auth.dto.RefreshRequest;
import com.expenseapp.auth.dto.SignupRequest;
import com.expenseapp.auth.dto.TokenResponse;
import com.expenseapp.auth.dto.SessionView;
import com.expenseapp.security.JwtService;
import com.expenseapp.token.RefreshToken;
import com.expenseapp.token.RefreshTokenRepository;
import com.expenseapp.token.PasswordResetToken;
import com.expenseapp.token.PasswordResetTokenRepository;
import com.expenseapp.user.Role;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${JWT_ACCESS_TTL_MIN:15}")
    private long accessTtlMin;

    @Value("${JWT_REFRESH_TTL_DAYS:7}")
    private long refreshTtlDays;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public void signup(SignupRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email already in use");
        }
        if (req.getPhone() != null && !req.getPhone().isBlank() && userRepository.existsByPhone(req.getPhone())) {
            throw new IllegalArgumentException("Phone already in use");
        }
        User user = new User();
        user.setName(req.getName());
        user.setEmail(req.getEmail());
        user.setPhone(req.getPhone());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setRole(Role.USER);
        userRepository.save(user);
    }

    @Transactional
    public TokenResponse login(LoginRequest req) {
        log.info("=== LOGIN ATTEMPT STARTED ===");
        log.info("Email: {}", req.getEmail());
        log.info("Password length: {}", req.getPassword() != null ? req.getPassword().length() : 0);
        
        try {
            log.info("Looking up user with email: {}", req.getEmail());
            User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> {
                    log.error("User not found with email: {}", req.getEmail());
                    return new IllegalArgumentException("Invalid credentials");
                });
            
            log.info("User found - ID: {}, Email: {}", 
                    user.getId(), user.getEmail());
            
            // Log password encoder info
            log.info("Password encoder class: {}", passwordEncoder.getClass().getName());
            
            // Verify password
            log.info("Verifying password...");
            String storedPassword = user.getPassword();
            log.info("Stored password hash: {}", storedPassword);
            log.info("Stored password hash length: {}", storedPassword.length());
            
            // Check if the stored password is a valid bcrypt hash
            boolean isBcryptHash = storedPassword.startsWith("$2a$") || 
                                 storedPassword.startsWith("$2b$") ||
                                 storedPassword.startsWith("$2y$");
            log.info("Stored password appears to be a bcrypt hash: {}", isBcryptHash);
            
            if (!isBcryptHash) {
                log.error("Stored password is not a valid bcrypt hash!");
                throw new IllegalStateException("Invalid password format");
            }
            
            boolean passwordMatches = false;
            try {
                // Try with configured encoder first
                passwordMatches = passwordEncoder.matches(req.getPassword(), storedPassword);
                log.info("Password matches with configured encoder: {}", passwordMatches);
                
                // If that fails, try direct BCrypt verification
                if (!passwordMatches) {
                    log.info("Trying direct BCrypt verification...");
                    boolean directMatch = org.springframework.security.crypto.bcrypt.BCrypt.checkpw(
                        req.getPassword(), 
                        storedPassword
                    );
                    log.info("Direct BCrypt verification result: {}", directMatch);
                    passwordMatches = directMatch;
                }
            } catch (Exception e) {
                log.error("Error during password verification: {}", e.getMessage());
            }
            
            if (!passwordMatches) {
                log.error("Password verification failed for user: {}", req.getEmail());
                throw new IllegalArgumentException("Invalid credentials");
            }
            
            // Generate tokens
            log.info("Generating tokens for user: {} with role: {}", user.getEmail(), user.getRole());
            String accessToken = jwtService.generateToken(user.getEmail(), user.getId(), user.getRole().name(), accessTtlMin);
            String refreshToken = UUID.randomUUID().toString();
            
            // Save refresh token
            RefreshToken rt = new RefreshToken(
                user, 
                refreshToken, 
                Instant.now().plus(refreshTtlDays, ChronoUnit.DAYS)
            );
            refreshTokenRepository.save(rt);
            
            log.info("=== LOGIN SUCCESSFUL ===");
            return new TokenResponse(accessToken, refreshToken, accessTtlMin * 60);
            
        } catch (Exception e) {
            log.error("Login failed for user: {} - {}", req.getEmail(), e.getMessage());
            throw e;
        }
    }

    @Transactional
    public TokenResponse refresh(RefreshRequest req) {
        RefreshToken rt = refreshTokenRepository.findByToken(req.getRefreshToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
        if (rt.isRevoked() || rt.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalStateException("Refresh token expired or revoked");
        }
        // Rotate
        rt.setRevoked(true);
        User user = rt.getUser();
        String newRefresh = UUID.randomUUID().toString();
        RefreshToken replacement = new RefreshToken(user, newRefresh, Instant.now().plus(refreshTtlDays, ChronoUnit.DAYS));
        refreshTokenRepository.save(replacement);
        String access = jwtService.generateToken(user.getEmail(), user.getId(), user.getRole().name(), accessTtlMin);
        return new TokenResponse(access, newRefresh, accessTtlMin * 60);
    }

    @Transactional
    public void logout(RefreshRequest req) {
        RefreshToken rt = refreshTokenRepository.findByToken(req.getRefreshToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
        rt.setRevoked(true);
    }

    @Transactional
    public String forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("If the email exists, a reset link will be sent"));
        if (!user.isEnabled()) {
            throw new IllegalStateException("Account not verified");
        }
        // Invalidate previous tokens for this user (optional cleanup)
        // Could be implemented via a delete query if needed.
        String token = UUID.randomUUID().toString().replace("-", "");
        PasswordResetToken prt = new PasswordResetToken(user, token, Instant.now().plus(30, ChronoUnit.MINUTES));
        passwordResetTokenRepository.save(prt);
        // Token is returned for testing purposes
        return token;
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken prt = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid reset token"));
        if (prt.isUsed() || prt.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalStateException("Reset token expired or used");
        }
        User user = prt.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        prt.setUsed(true);
    }

    // ----- Sessions management -----
    @Transactional(readOnly = true)
    public java.util.List<SessionView> listSessionsForCurrentUser() {
        User user = currentUser();
        return refreshTokenRepository.findAllByUserAndRevokedIsFalse(user).stream()
                .map(rt -> new SessionView(rt.getId(), rt.getCreatedAt(), rt.getExpiresAt(), rt.isRevoked()))
                .toList();
    }

    @Transactional
    public void revokeSession(Long id) {
        User user = currentUser();
        RefreshToken rt = refreshTokenRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
        rt.setRevoked(true);
    }

    @Transactional
    public void revokeAllSessions() {
        User user = currentUser();
        refreshTokenRepository.findAllByUserAndRevokedIsFalse(user)
                .forEach(rt -> rt.setRevoked(true));
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserDetails)) {
            throw new IllegalStateException("Not authenticated");
        }
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        return userRepository.findByEmail(email).orElseThrow(() -> new IllegalStateException("User not found"));
    }
}
