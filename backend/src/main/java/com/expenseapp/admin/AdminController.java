package com.expenseapp.admin;

import com.expenseapp.company.Company;
import com.expenseapp.expense.Expense;
import com.expenseapp.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminController {

    private final AdminService adminService;

    /**
     * Get Super Admin Dashboard Statistics
     */
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        log.info("[AdminController] Getting dashboard stats");
        Map<String, Object> stats = adminService.getDashboardStats();
        return ResponseEntity.ok(stats);
    }

    /**
     * Get all companies with statistics
     */
    @GetMapping("/companies")
    public ResponseEntity<List<Map<String, Object>>> getAllCompanies() {
        log.info("[AdminController] Getting all companies");
        List<Map<String, Object>> companies = adminService.getAllCompaniesWithStats();
        return ResponseEntity.ok(companies);
    }

    /**
     * Update company status (activate/deactivate)
     */
    @PutMapping("/companies/{id}/status")
    public ResponseEntity<Company> updateCompanyStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        log.info("[AdminController] Updating company {} status", id);
        String status = body.get("status");
        Company company = adminService.updateCompanyStatus(id, status);
        return ResponseEntity.ok(company);
    }

    /**
     * Get all users across all companies (simplified view for dashboard)
     */
    @GetMapping("/users-summary")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        log.info("[AdminController] Getting all users summary");
        List<Map<String, Object>> users = adminService.getAllUsersWithDetails();
        return ResponseEntity.ok(users);
    }

    /**
     * Update user status (suspend/activate) - simplified endpoint
     */
    @PutMapping("/users-summary/{id}/status")
    public ResponseEntity<User> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        log.info("[AdminController] Updating user {} status", id);
        boolean enabled = body.get("enabled");
        User user = adminService.updateUserStatus(id, enabled);
        return ResponseEntity.ok(user);
    }

    /**
     * Get all claims/reimbursements globally
     */
    @GetMapping("/claims")
    public ResponseEntity<List<Expense>> getAllClaims(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long companyId) {
        log.info("[AdminController] Getting all claims - status: {}, companyId: {}", status, companyId);
        List<Expense> claims = adminService.getAllClaims(status, companyId);
        return ResponseEntity.ok(claims);
    }

    /**
     * Get expense statistics by category
     */
    @GetMapping("/stats/categories")
    public ResponseEntity<List<Map<String, Object>>> getCategoryStats() {
        log.info("[AdminController] Getting category stats");
        List<Map<String, Object>> stats = adminService.getExpenseStatsByCategory();
        return ResponseEntity.ok(stats);
    }
    
    // ========== REPORTING ENDPOINTS ==========
    
    /**
     * Get monthly expense report
     */
    @GetMapping("/reports/monthly")
    public ResponseEntity<Map<String, Object>> getMonthlyReport(
            @RequestParam(defaultValue = "12") int months) {
        log.info("[AdminController] Getting monthly report for {} months", months);
        Map<String, Object> report = adminService.getMonthlyExpenseReport(months);
        return ResponseEntity.ok(report);
    }
    
    /**
     * Get company comparison report
     */
    @GetMapping("/reports/companies")
    public ResponseEntity<List<Map<String, Object>>> getCompanyReport() {
        log.info("[AdminController] Getting company comparison report");
        List<Map<String, Object>> report = adminService.getCompanyComparisonReport();
        return ResponseEntity.ok(report);
    }
    
    /**
     * Get user activity report
     */
    @GetMapping("/reports/users")
    public ResponseEntity<List<Map<String, Object>>> getUserActivityReport(
            @RequestParam(defaultValue = "10") int top) {
        log.info("[AdminController] Getting top {} user activity report", top);
        List<Map<String, Object>> report = adminService.getUserActivityReport(top);
        return ResponseEntity.ok(report);
    }
    
    // ========== BULK OPERATIONS ENDPOINTS ==========
    
    /**
     * Bulk update user status
     */
    @PostMapping("/bulk/users/status")
    public ResponseEntity<Map<String, Object>> bulkUpdateUserStatus(
            @RequestBody Map<String, Object> request) {
        log.info("[AdminController] Bulk updating user status");
        @SuppressWarnings("unchecked")
        List<Long> userIds = (List<Long>) request.get("userIds");
        boolean enabled = (Boolean) request.get("enabled");
        
        Map<String, Object> result = adminService.bulkUpdateUserStatus(userIds, enabled);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Bulk update company status
     */
    @PostMapping("/bulk/companies/status")
    public ResponseEntity<Map<String, Object>> bulkUpdateCompanyStatus(
            @RequestBody Map<String, Object> request) {
        log.info("[AdminController] Bulk updating company status");
        @SuppressWarnings("unchecked")
        List<Long> companyIds = (List<Long>) request.get("companyIds");
        String status = (String) request.get("status");
        
        Map<String, Object> result = adminService.bulkUpdateCompanyStatus(companyIds, status);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Bulk delete users
     */
    @PostMapping("/bulk/users/delete")
    public ResponseEntity<Map<String, Object>> bulkDeleteUsers(
            @RequestBody Map<String, List<Long>> request) {
        log.info("[AdminController] Bulk deleting users");
        List<Long> userIds = request.get("userIds");
        
        Map<String, Object> result = adminService.bulkDeleteUsers(userIds);
        return ResponseEntity.ok(result);
    }
}
