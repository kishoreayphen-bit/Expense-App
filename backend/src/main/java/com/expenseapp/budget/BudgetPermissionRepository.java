package com.expenseapp.budget;

import com.expenseapp.company.Company;
import com.expenseapp.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BudgetPermissionRepository extends JpaRepository<BudgetPermission, Long> {
    
    Optional<BudgetPermission> findByCompanyAndUser(Company company, User user);
    
    List<BudgetPermission> findAllByCompany(Company company);
    
    List<BudgetPermission> findAllByUserAndCanCreateBudgets(User user, boolean canCreateBudgets);
    
    boolean existsByCompanyAndUserAndCanCreateBudgets(Company company, User user, boolean canCreateBudgets);
}
