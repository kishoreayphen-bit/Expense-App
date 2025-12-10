package com.expenseapp.company.repository;

import com.expenseapp.company.domain.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    boolean existsByCompanyNameIgnoreCase(String companyName);
    boolean existsByCompanyCodeIgnoreCase(String companyCode);
    Optional<Company> findByIdAndStatusNot(Long id, String status);
    
    // User-scoped queries for multi-tenancy
    java.util.List<Company> findByCreatedByAndStatusNot(Long userId, String status);
    Optional<Company> findByIdAndCreatedByAndStatusNot(Long id, Long userId, String status);
}
