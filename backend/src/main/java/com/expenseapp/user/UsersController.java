package com.expenseapp.user;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
public class UsersController {

    private final NamedParameterJdbcTemplate jdbc;
    private final UserService userService;

    public UsersController(NamedParameterJdbcTemplate jdbc, UserService userService) {
        this.jdbc = jdbc;
        this.userService = userService;
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getName() != null) ? auth.getName() : "";
    }

    public static class UserView {
        private Long id;
        private String name;
        private String email;
        private String role;
        private Boolean enabled;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public Boolean getEnabled() { return enabled; }
        public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    }

    @GetMapping
    public ResponseEntity<List<UserView>> list(@RequestParam(value = "query", required = false) String query,
                                               @RequestParam(value = "limit", required = false, defaultValue = "50") int limit,
                                               @RequestParam(value = "offset", required = false, defaultValue = "0") int offset) {
        // Build query ensuring non-null name/email for client display
        String base = "SELECT id, COALESCE(name, email, CONCAT('User #', id)) AS name, COALESCE(email, '') AS email, role, enabled FROM users";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("limit", Math.max(1, Math.min(limit, 200)))
                .addValue("offset", Math.max(0, offset));
        String where = "";
        if (query != null && !query.trim().isEmpty()) {
            where = " WHERE LOWER(name) LIKE :q OR LOWER(email) LIKE :q";
            params.addValue("q", "%" + query.trim().toLowerCase() + "%");
        }
        String sql = base + where + " ORDER BY id DESC LIMIT :limit OFFSET :offset";
        List<UserView> rows = jdbc.query(sql, params, new BeanPropertyRowMapper<>(UserView.class));
        // Return empty list if no users found (removed demo user seeding)
        return ResponseEntity.ok(rows != null ? rows : List.of());
    }

    /**
     * Get all users with details (SUPER_ADMIN and ADMIN only)
     */
    @GetMapping("/admin/all")
    public ResponseEntity<List<UserService.UserDetailView>> getAllUsers() {
        String email = currentEmail();
        return ResponseEntity.ok(userService.listAllUsers(email));
    }

    /**
     * Get user details by ID (SUPER_ADMIN and ADMIN only)
     */
    @GetMapping("/admin/{userId}")
    public ResponseEntity<UserService.UserDetailView> getUserById(@PathVariable Long userId) {
        String email = currentEmail();
        return ResponseEntity.ok(userService.getUserDetails(email, userId));
    }

    /**
     * Toggle user status (suspend/activate) (SUPER_ADMIN and ADMIN only)
     */
    @PostMapping("/admin/{userId}/toggle-status")
    public ResponseEntity<UserService.UserDetailView> toggleUserStatus(@PathVariable Long userId) {
        String email = currentEmail();
        return ResponseEntity.ok(userService.toggleUserStatus(email, userId));
    }

    /**
     * Reset user password (SUPER_ADMIN and ADMIN only)
     */
    @PostMapping("/admin/{userId}/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request) {
        String email = currentEmail();
        String newPassword = request.get("newPassword");
        userService.resetUserPassword(email, userId, newPassword);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    /**
     * Get system statistics (SUPER_ADMIN and ADMIN only)
     */
    @GetMapping("/admin/stats")
    public ResponseEntity<UserService.SystemStats> getSystemStats() {
        String email = currentEmail();
        return ResponseEntity.ok(userService.getSystemStats(email));
    }
}
