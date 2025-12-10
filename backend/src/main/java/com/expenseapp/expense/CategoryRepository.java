package com.expenseapp.expense;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    boolean existsByName(String name);
    
    Optional<Category> findByName(String name);
    
    // Find global categories (company_id is null)
    List<Category> findByCompanyIdIsNull();
    
    // Find global + company-specific categories
    @Query("SELECT c FROM Category c WHERE c.companyId IS NULL OR c.companyId = :companyId")
    List<Category> findByCompanyIdIsNullOrCompanyId(@Param("companyId") Long companyId);
}
