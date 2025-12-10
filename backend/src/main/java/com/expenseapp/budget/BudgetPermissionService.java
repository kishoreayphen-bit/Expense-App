package com.expenseapp.budget;

import com.expenseapp.company.Company;
import com.expenseapp.company.CompanyMember;
import com.expenseapp.company.CompanyMemberRepository;
import com.expenseapp.company.CompanyRepository;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BudgetPermissionService {
    
    private final BudgetPermissionRepository budgetPermissionRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    
    /**
     * Check if a user can create budgets in a company.
     * Only ADMIN role (company-level) and SUPER_ADMIN (system-level) can create budgets.
     * EMPLOYEE and MANAGER CANNOT create budgets.
     */
    @Transactional(readOnly = true)
    public boolean canCreateBudgets(User user, Long companyId) {
        // SUPER_ADMIN can create budgets for any company
        if (user.getRole() == com.expenseapp.user.Role.SUPER_ADMIN) {
            return true;
        }
        
        if (companyId == null) {
            // Personal budgets - NOT ALLOWED for company expenses
            // Only SUPER_ADMIN can create personal budgets
            return user.getRole() == com.expenseapp.user.Role.SUPER_ADMIN;
        }
        
        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) {
            return false;
        }
        
        CompanyMember member = companyMemberRepository.findByCompanyAndUser(company, user).orElse(null);
        if (member == null || !"ACTIVE".equals(member.getStatus())) {
            return false;
        }
        
        String companyRole = member.getRole();
        
        // Only ADMIN (company role) can create budgets
        // MANAGER and EMPLOYEE CANNOT create budgets
        return "ADMIN".equals(companyRole);
    }
    
    /**
     * Grant budget creation permission to a user.
     * Only ADMIN can grant permissions.
     */
    @Transactional
    public BudgetPermission grantPermission(String adminEmail, Long companyId, Long userId, String notes) {
        User admin = userRepository.findByEmail(adminEmail)
            .orElseThrow(() -> new IllegalArgumentException("Admin not found"));
        
        Company company = companyRepository.findById(companyId)
            .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        
        // Verify admin has permission
        CompanyMember adminMember = companyMemberRepository.findByCompanyAndUser(company, admin)
            .orElseThrow(() -> new IllegalArgumentException("You are not a member of this company"));
        
        if (!"ADMIN".equals(adminMember.getRole())) {
            throw new IllegalArgumentException("Only ADMIN can grant budget permissions");
        }
        
        User targetUser = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Target user not found"));
        
        // Check target is a member
        CompanyMember targetMember = companyMemberRepository.findByCompanyAndUser(company, targetUser)
            .orElseThrow(() -> new IllegalArgumentException("Target user is not a member of this company"));
        
        // Don't need to grant to ADMIN or MANAGER (they have default access)
        if ("ADMIN".equals(targetMember.getRole()) || "MANAGER".equals(targetMember.getRole())) {
            throw new IllegalArgumentException("ADMIN and MANAGER roles have default budget creation access");
        }
        
        // Create or update permission
        BudgetPermission permission = budgetPermissionRepository.findByCompanyAndUser(company, targetUser)
            .orElse(new BudgetPermission());
        
        permission.setCompany(company);
        permission.setUser(targetUser);
        permission.setCanCreateBudgets(true);
        permission.setGrantedBy(admin);
        if (notes != null) {
            permission.setNotes(notes);
        }
        
        return budgetPermissionRepository.save(permission);
    }
    
    /**
     * Revoke budget creation permission.
     * Only ADMIN can revoke permissions.
     */
    @Transactional
    public void revokePermission(String adminEmail, Long companyId, Long userId) {
        User admin = userRepository.findByEmail(adminEmail)
            .orElseThrow(() -> new IllegalArgumentException("Admin not found"));
        
        Company company = companyRepository.findById(companyId)
            .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        
        // Verify admin has permission
        CompanyMember adminMember = companyMemberRepository.findByCompanyAndUser(company, admin)
            .orElseThrow(() -> new IllegalArgumentException("You are not a member of this company"));
        
        if (!"ADMIN".equals(adminMember.getRole())) {
            throw new IllegalArgumentException("Only ADMIN can revoke budget permissions");
        }
        
        User targetUser = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Target user not found"));
        
        // Delete permission if exists
        budgetPermissionRepository.findByCompanyAndUser(company, targetUser)
            .ifPresent(budgetPermissionRepository::delete);
    }
}
