package com.expenseapp.user;

import com.expenseapp.company.CompanyMemberRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, 
                      CompanyMemberRepository companyMemberRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.companyMemberRepository = companyMemberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * List all users (SUPER_ADMIN and ADMIN only)
     */
    @Transactional(readOnly = true)
    public List<UserDetailView> listAllUsers(String requestorEmail) {
        User requestor = userRepository.findByEmail(requestorEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Only SUPER_ADMIN and ADMIN can list all users
        if (requestor.getRole() != Role.SUPER_ADMIN && requestor.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Access denied: Only SUPER_ADMIN and ADMIN can list all users");
        }
        
        return userRepository.findAll().stream()
            .map(this::toDetailView)
            .collect(Collectors.toList());
    }

    /**
     * Get user details (SUPER_ADMIN and ADMIN only)
     */
    @Transactional(readOnly = true)
    public UserDetailView getUserDetails(String requestorEmail, Long userId) {
        User requestor = userRepository.findByEmail(requestorEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Only SUPER_ADMIN and ADMIN can view user details
        if (requestor.getRole() != Role.SUPER_ADMIN && requestor.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Access denied: Only SUPER_ADMIN and ADMIN can view user details");
        }
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        return toDetailView(user);
    }

    /**
     * Suspend/Activate user (SUPER_ADMIN and ADMIN only)
     */
    @Transactional
    public UserDetailView toggleUserStatus(String requestorEmail, Long userId) {
        User requestor = userRepository.findByEmail(requestorEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Only SUPER_ADMIN and ADMIN can suspend/activate users
        if (requestor.getRole() != Role.SUPER_ADMIN && requestor.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Access denied: Only SUPER_ADMIN and ADMIN can manage user status");
        }
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Cannot suspend yourself
        if (user.getId().equals(requestor.getId())) {
            throw new IllegalArgumentException("Cannot suspend your own account");
        }
        
        // Cannot suspend other SUPER_ADMINs (unless you are SUPER_ADMIN)
        if (user.getRole() == Role.SUPER_ADMIN && requestor.getRole() != Role.SUPER_ADMIN) {
            throw new IllegalArgumentException("Cannot suspend SUPER_ADMIN users");
        }
        
        user.setEnabled(!user.isEnabled());
        userRepository.save(user);
        
        return toDetailView(user);
    }

    /**
     * Reset user password (SUPER_ADMIN and ADMIN only)
     */
    @Transactional
    public void resetUserPassword(String requestorEmail, Long userId, String newPassword) {
        User requestor = userRepository.findByEmail(requestorEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Only SUPER_ADMIN and ADMIN can reset passwords
        if (requestor.getRole() != Role.SUPER_ADMIN && requestor.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Access denied: Only SUPER_ADMIN and ADMIN can reset passwords");
        }
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Cannot reset your own password this way
        if (user.getId().equals(requestor.getId())) {
            throw new IllegalArgumentException("Cannot reset your own password through admin panel");
        }
        
        // Validate password
        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }
        
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    /**
     * Get system statistics (SUPER_ADMIN and ADMIN only)
     */
    @Transactional(readOnly = true)
    public SystemStats getSystemStats(String requestorEmail) {
        User requestor = userRepository.findByEmail(requestorEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Only SUPER_ADMIN and ADMIN can view system stats
        if (requestor.getRole() != Role.SUPER_ADMIN && requestor.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Access denied: Only SUPER_ADMIN and ADMIN can view system stats");
        }
        
        List<User> allUsers = userRepository.findAll();
        
        SystemStats stats = new SystemStats();
        stats.setTotalUsers(allUsers.size());
        stats.setActiveUsers((int) allUsers.stream().filter(User::isEnabled).count());
        stats.setSuspendedUsers((int) allUsers.stream().filter(u -> !u.isEnabled()).count());
        stats.setSuperAdmins((int) allUsers.stream().filter(u -> u.getRole() == Role.SUPER_ADMIN).count());
        stats.setAdmins((int) allUsers.stream().filter(u -> u.getRole() == Role.ADMIN).count());
        stats.setRegularUsers((int) allUsers.stream().filter(u -> u.getRole() == Role.USER).count());
        
        return stats;
    }

    private UserDetailView toDetailView(User user) {
        UserDetailView view = new UserDetailView();
        view.setId(user.getId());
        view.setName(user.getName());
        view.setEmail(user.getEmail());
        view.setPhone(user.getPhone());
        view.setRole(user.getRole().name());
        view.setEnabled(user.isEnabled());
        view.setCreatedAt(user.getCreatedAt());
        
        // Count company memberships
        int companyCount = companyMemberRepository.findActiveByUser(user).size();
        view.setCompanyCount(companyCount);
        
        return view;
    }

    // DTOs
    public static class UserDetailView {
        private Long id;
        private String name;
        private String email;
        private String phone;
        private String role;
        private Boolean enabled;
        private java.time.Instant createdAt;
        private Integer companyCount;

        // Getters and setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public Boolean getEnabled() { return enabled; }
        public void setEnabled(Boolean enabled) { this.enabled = enabled; }
        public java.time.Instant getCreatedAt() { return createdAt; }
        public void setCreatedAt(java.time.Instant createdAt) { this.createdAt = createdAt; }
        public Integer getCompanyCount() { return companyCount; }
        public void setCompanyCount(Integer companyCount) { this.companyCount = companyCount; }
    }

    public static class SystemStats {
        private Integer totalUsers;
        private Integer activeUsers;
        private Integer suspendedUsers;
        private Integer superAdmins;
        private Integer admins;
        private Integer regularUsers;

        // Getters and setters
        public Integer getTotalUsers() { return totalUsers; }
        public void setTotalUsers(Integer totalUsers) { this.totalUsers = totalUsers; }
        public Integer getActiveUsers() { return activeUsers; }
        public void setActiveUsers(Integer activeUsers) { this.activeUsers = activeUsers; }
        public Integer getSuspendedUsers() { return suspendedUsers; }
        public void setSuspendedUsers(Integer suspendedUsers) { this.suspendedUsers = suspendedUsers; }
        public Integer getSuperAdmins() { return superAdmins; }
        public void setSuperAdmins(Integer superAdmins) { this.superAdmins = superAdmins; }
        public Integer getAdmins() { return admins; }
        public void setAdmins(Integer admins) { this.admins = admins; }
        public Integer getRegularUsers() { return regularUsers; }
        public void setRegularUsers(Integer regularUsers) { this.regularUsers = regularUsers; }
    }
}
