package com.expenseapp.company;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    
    Optional<Company> findByCompanyCode(String companyCode);
    
    Optional<Company> findByCompanyName(String companyName);
    
    boolean existsByCompanyCode(String companyCode);
    
    boolean existsByCompanyName(String companyName);
    
    long countByStatus(String status);
}
