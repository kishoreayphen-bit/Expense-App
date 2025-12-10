package com.expenseapp.budget;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyBudgetRepository extends JpaRepository<CompanyBudget, Long> {
    
    List<CompanyBudget> findByCompanyId(Long companyId);
    
    List<CompanyBudget> findByCompanyIdAndIsActiveTrue(Long companyId);
    
    Optional<CompanyBudget> findByCompanyIdAndPeriodStartAndPeriodEndAndIsActiveTrue(
            Long companyId, LocalDate periodStart, LocalDate periodEnd);
    
    @Query("SELECT cb FROM CompanyBudget cb WHERE cb.companyId = :companyId " +
           "AND cb.isActive = true " +
           "AND :date BETWEEN cb.periodStart AND cb.periodEnd")
    Optional<CompanyBudget> findActiveByCompanyAndDate(
            @Param("companyId") Long companyId,
            @Param("date") LocalDate date);
    
    @Query("SELECT cb FROM CompanyBudget cb WHERE cb.companyId = :companyId " +
           "AND cb.periodStart <= :endDate AND cb.periodEnd >= :startDate " +
           "ORDER BY cb.periodStart DESC")
    List<CompanyBudget> findByCompanyAndDateRange(
            @Param("companyId") Long companyId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
    
    @Query("SELECT cb FROM CompanyBudget cb WHERE cb.isActive = true " +
           "AND cb.spentAmount >= (cb.totalAmount * cb.alertThresholdPercent / 100)")
    List<CompanyBudget> findBudgetsOverThreshold();
    
    boolean existsByCompanyIdAndPeriodStartAndPeriodEndAndIsActiveTrue(
            Long companyId, LocalDate periodStart, LocalDate periodEnd);
}
