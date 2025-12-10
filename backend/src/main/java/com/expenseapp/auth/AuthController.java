package com.expenseapp.auth;

import com.expenseapp.auth.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, String>> signup(@Valid @RequestBody SignupRequest request) {
        authService.signup(request);
        return ResponseEntity.ok(Map.of("message", "Signup successful. You can now log in."));
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request);
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<Map<String, Object>> forgot(@Valid @RequestBody PasswordResetRequests.ForgotRequest request) {
        String token = authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(Map.of(
                "message", "If the email exists, a reset link has been sent.",
                "resetToken", token // return for testing; remove in production
        ));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Map<String, Object>> reset(@Valid @RequestBody PasswordResetRequests.ResetRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password updated. You can now log in."));
    }

    // Sessions (current user)
    @GetMapping("/sessions")
    public ResponseEntity<java.util.List<SessionView>> sessions() {
        return ResponseEntity.ok(authService.listSessionsForCurrentUser());
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Map<String, Object>> revoke(@PathVariable Long id) {
        authService.revokeSession(id);
        return ResponseEntity.ok(Map.of("message", "Session revoked"));
    }

    @DeleteMapping("/sessions")
    public ResponseEntity<Map<String, Object>> revokeAll() {
        authService.revokeAllSessions();
        return ResponseEntity.ok(Map.of("message", "All sessions revoked"));
    }
}
