package com.expenseapp.admin;

import com.expenseapp.company.Company;
import com.expenseapp.company.CompanyMember;
import com.expenseapp.company.CompanyMemberRepository;
import com.expenseapp.company.CompanyRepository;
import com.expenseapp.expense.Expense;
import com.expenseapp.expense.ExpenseRepository;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {
    
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final ExpenseRepository expenseRepository;
    
    /**
     * Get Super Admin Dashboard Statistics
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats() {
        log.info("[AdminService] Getting dashboard stats");
        
        long totalCompanies = companyRepository.count();
        long totalUsers = userRepository.count();
        long totalExpenses = expenseRepository.count();
        
        // Get pending reimbursements count
        long pendingReimbursements = expenseRepository.countByReimbursementStatus("PENDING");
        
        // Get this month's expenses
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        Instant startOfMonthInstant = startOfMonth.atZone(ZoneId.systemDefault()).toInstant();
        List<Expense> thisMonthExpenses = expenseRepository.findByCreatedAtAfter(startOfMonthInstant);
        BigDecimal thisMonthTotal = thisMonthExpenses.stream()
            .map(Expense::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Get active companies
        long activeCompanies = companyRepository.countByStatus("ACTIVE");
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCompanies", totalCompanies);
        stats.put("activeCompanies", activeCompanies);
        stats.put("totalUsers", totalUsers);
        stats.put("totalExpenses", totalExpenses);
        stats.put("pendingReimbursements", pendingReimbursements);
        stats.put("thisMonthExpenseCount", thisMonthExpenses.size());
        stats.put("thisMonthExpenseTotal", thisMonthTotal);
        
        log.info("[AdminService] Dashboard stats: {} companies, {} users, {} expenses", 
            totalCompanies, totalUsers, totalExpenses);
        
        return stats;
    }
    
    /**
     * Get all companies with statistics
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllCompaniesWithStats() {
        log.info("[AdminService] Getting all companies with stats");
        
        List<Company> companies = companyRepository.findAll();
        
        return companies.stream().map(company -> {
            Map<String, Object> companyData = new HashMap<>();
            companyData.put("id", company.getId());
            companyData.put("name", company.getCompanyName());
            companyData.put("code", company.getCompanyCode());
            companyData.put("email", company.getCompanyEmail());
            companyData.put("status", company.getStatus());
            companyData.put("createdAt", company.getCreatedAt());
            
            // Get member count
            long memberCount = companyMemberRepository.countByCompany(company);
            companyData.put("memberCount", memberCount);
            
            // Get expense count
            long expenseCount = expenseRepository.countByCompanyId(company.getId());
            companyData.put("expenseCount", expenseCount);
            
            // Get pending reimbursements
            long pendingReimbursements = expenseRepository.countByCompanyIdAndReimbursementStatus(
                company.getId(), "PENDING");
            companyData.put("pendingReimbursements", pendingReimbursements);
            
            return companyData;
        }).collect(Collectors.toList());
    }
    
    /**
     * Update company status (activate/deactivate)
     */
    @Transactional
    public Company updateCompanyStatus(Long companyId, String status) {
        log.info("[AdminService] Updating company {} status to {}", companyId, status);
        
        Company company = companyRepository.findById(companyId)
            .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        
        company.setStatus(status);
        company.setUpdatedAt(Instant.now());
        
        return companyRepository.save(company);
    }
    
    /**
     * Get all users across all companies
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllUsersWithDetails() {
        log.info("[AdminService] Getting all users with details");
        
        List<User> users = userRepository.findAll();
        
        return users.stream().map(user -> {
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("name", user.getName());
            userData.put("email", user.getEmail());
            userData.put("phone", user.getPhone());
            userData.put("role", user.getRole().name());
            userData.put("enabled", user.isEnabled());
            userData.put("createdAt", user.getCreatedAt());
            
            // Get companies this user belongs to
            List<CompanyMember> memberships = companyMemberRepository.findAllByUser(user);
            List<Map<String, String>> companies = memberships.stream().map(m -> {
                Map<String, String> companyInfo = new HashMap<>();
                companyInfo.put("companyId", m.getCompany().getId().toString());
                companyInfo.put("companyName", m.getCompany().getCompanyName());
                companyInfo.put("role", m.getRole());
                return companyInfo;
            }).collect(Collectors.toList());
            userData.put("companies", companies);
            
            return userData;
        }).collect(Collectors.toList());
    }
    
    /**
     * Suspend or activate a user
     */
    @Transactional
    public User updateUserStatus(Long userId, boolean enabled) {
        log.info("[AdminService] Updating user {} status to {}", userId, enabled ? "ACTIVE" : "SUSPENDED");
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        user.setEnabled(enabled);
        
        return userRepository.save(user);
    }
    
    /**
     * Get all claims/reimbursements across all companies
     */
    @Transactional(readOnly = true)
    public List<Expense> getAllClaims(String status, Long companyId) {
        log.info("[AdminService] Getting all claims - status: {}, companyId: {}", status, companyId);
        
        if (companyId != null && status != null) {
            return expenseRepository.findByCompanyIdAndReimbursementStatusOrderByReimbursementRequestedAtDesc(
                companyId, status);
        } else if (companyId != null) {
            return expenseRepository.findByCompanyIdAndReimbursableOrderByCreatedAtDesc(companyId, true);
        } else if (status != null) {
            return expenseRepository.findByReimbursementStatusOrderByReimbursementRequestedAtDesc(status);
        } else {
            return expenseRepository.findByReimbursableOrderByCreatedAtDesc(true);
        }
    }
    
    /**
     * Get expense statistics by category
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getExpenseStatsByCategory() {
        log.info("[AdminService] Getting expense stats by category");
        
        List<Expense> allExpenses = expenseRepository.findAll();
        
        Map<String, List<Expense>> byCategory = allExpenses.stream()
            .filter(e -> e.getCategory() != null)
            .collect(Collectors.groupingBy(e -> e.getCategory().getName()));
        
        return byCategory.entrySet().stream().map(entry -> {
            Map<String, Object> stats = new HashMap<>();
            stats.put("category", entry.getKey());
            stats.put("count", entry.getValue().size());
            
            BigDecimal total = entry.getValue().stream()
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            stats.put("total", total);
            
            return stats;
        }).collect(Collectors.toList());
    }
    
    /**
     * Generate advanced report - Monthly expense trends
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getMonthlyExpenseReport(int months) {
        log.info("[AdminService] Generating monthly expense report for last {} months", months);
        
        LocalDateTime startDate = LocalDate.now().minusMonths(months).atStartOfDay();
        Instant startDateInstant = startDate.atZone(ZoneId.systemDefault()).toInstant();
        List<Expense> expenses = expenseRepository.findByCreatedAtAfter(startDateInstant);
        
        // Group by month
        Map<String, List<Expense>> byMonth = expenses.stream()
            .collect(Collectors.groupingBy(e -> {
                LocalDate date = e.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
                return date.getYear() + "-" + String.format("%02d", date.getMonthValue());
            }));
        
        List<Map<String, Object>> monthlyData = byMonth.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entry -> {
                Map<String, Object> data = new HashMap<>();
                data.put("month", entry.getKey());
                data.put("count", entry.getValue().size());
                data.put("total", entry.getValue().stream()
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
                return data;
            })
            .collect(Collectors.toList());
        
        Map<String, Object> report = new HashMap<>();
        report.put("period", months + " months");
        report.put("data", monthlyData);
        report.put("totalExpenses", expenses.size());
        report.put("totalAmount", expenses.stream()
            .map(Expense::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add));
        
        return report;
    }
    
    /**
     * Generate company comparison report
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCompanyComparisonReport() {
        log.info("[AdminService] Generating company comparison report");
        
        List<Company> companies = companyRepository.findAll();
        
        return companies.stream().map(company -> {
            Map<String, Object> data = new HashMap<>();
            data.put("companyId", company.getId());
            data.put("companyName", company.getCompanyName());
            data.put("memberCount", companyMemberRepository.countByCompany(company));
            
            List<Expense> companyExpenses = expenseRepository.findAll().stream()
                .filter(e -> e.getCompanyId() != null && e.getCompanyId().equals(company.getId()))
                .collect(Collectors.toList());
            data.put("expenseCount", companyExpenses.size());
            data.put("totalExpenses", companyExpenses.stream()
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
            
            long pendingReimbursements = companyExpenses.stream()
                .filter(e -> e.isReimbursable() && "PENDING".equals(e.getReimbursementStatus()))
                .count();
            data.put("pendingReimbursements", pendingReimbursements);
            
            return data;
        }).collect(Collectors.toList());
    }
    
    /**
     * Generate user activity report
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getUserActivityReport(int topN) {
        log.info("[AdminService] Generating top {} user activity report", topN);
        
        List<User> users = userRepository.findAll();
        
        return users.stream()
            .map(user -> {
                Map<String, Object> data = new HashMap<>();
                data.put("userId", user.getId());
                data.put("userName", user.getName());
                data.put("userEmail", user.getEmail());
                data.put("role", user.getRole().name());
                
                List<Expense> userExpenses = expenseRepository.findAll().stream()
                    .filter(e -> e.getUser() != null && e.getUser().getId().equals(user.getId()))
                    .collect(Collectors.toList());
                data.put("expenseCount", userExpenses.size());
                data.put("totalAmount", userExpenses.stream()
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
                
                return data;
            })
            .sorted((a, b) -> Integer.compare(
                (Integer) b.get("expenseCount"), 
                (Integer) a.get("expenseCount")
            ))
            .limit(topN)
            .collect(Collectors.toList());
    }
    
    /**
     * Bulk update user status
     */
    @Transactional
    public Map<String, Object> bulkUpdateUserStatus(List<Long> userIds, boolean enabled) {
        log.info("[AdminService] Bulk updating status for {} users to {}", userIds.size(), enabled);
        
        int successCount = 0;
        int failCount = 0;
        List<String> errors = new ArrayList<>();
        
        for (Long userId : userIds) {
            try {
                User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
                user.setEnabled(enabled);
                userRepository.save(user);
                successCount++;
            } catch (Exception e) {
                failCount++;
                errors.add("User " + userId + ": " + e.getMessage());
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("total", userIds.size());
        result.put("success", successCount);
        result.put("failed", failCount);
        result.put("errors", errors);
        
        return result;
    }
    
    /**
     * Bulk update company status
     */
    @Transactional
    public Map<String, Object> bulkUpdateCompanyStatus(List<Long> companyIds, String status) {
        log.info("[AdminService] Bulk updating status for {} companies to {}", companyIds.size(), status);
        
        int successCount = 0;
        int failCount = 0;
        List<String> errors = new ArrayList<>();
        
        for (Long companyId : companyIds) {
            try {
                Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new IllegalArgumentException("Company not found: " + companyId));
                company.setStatus(status);
                companyRepository.save(company);
                successCount++;
            } catch (Exception e) {
                failCount++;
                errors.add("Company " + companyId + ": " + e.getMessage());
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("total", companyIds.size());
        result.put("success", successCount);
        result.put("failed", failCount);
        result.put("errors", errors);
        
        return result;
    }
    
    /**
     * Bulk delete users (soft delete - disable)
     */
    @Transactional
    public Map<String, Object> bulkDeleteUsers(List<Long> userIds) {
        log.info("[AdminService] Bulk deleting {} users", userIds.size());
        
        return bulkUpdateUserStatus(userIds, false);
    }
}
