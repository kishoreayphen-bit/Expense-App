package com.expenseapp.group;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TeamBudgetRepository extends JpaRepository<TeamBudget, Long> {
    
    List<TeamBudget> findByGroupId(Long groupId);
    
    List<TeamBudget> findByGroupIdAndIsActiveTrue(Long groupId);
    
    Optional<TeamBudget> findByGroupIdAndPeriodStartAndPeriodEndAndIsActiveTrue(
            Long groupId, LocalDate periodStart, LocalDate periodEnd);
    
    @Query("SELECT tb FROM TeamBudget tb WHERE tb.groupId = :groupId " +
           "AND tb.isActive = true " +
           "AND :date BETWEEN tb.periodStart AND tb.periodEnd")
    Optional<TeamBudget> findActiveByGroupAndDate(
            @Param("groupId") Long groupId,
            @Param("date") LocalDate date);
    
    @Query("SELECT tb FROM TeamBudget tb WHERE tb.groupId = :groupId " +
           "AND tb.periodStart <= :endDate AND tb.periodEnd >= :startDate " +
           "ORDER BY tb.periodStart DESC")
    List<TeamBudget> findByGroupAndDateRange(
            @Param("groupId") Long groupId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
    
    @Query("SELECT tb FROM TeamBudget tb WHERE tb.isActive = true " +
           "AND tb.spentAmount >= (tb.allocatedAmount * tb.alertThresholdPercent / 100)")
    List<TeamBudget> findBudgetsOverThreshold();
    
    boolean existsByGroupIdAndPeriodStartAndPeriodEndAndIsActiveTrue(
            Long groupId, LocalDate periodStart, LocalDate periodEnd);
    
    @Query("SELECT tb FROM TeamBudget tb " +
           "JOIN Group g ON tb.groupId = g.id " +
           "WHERE g.companyId = :companyId AND tb.isActive = true")
    List<TeamBudget> findActiveByCompanyId(@Param("companyId") Long companyId);
}
