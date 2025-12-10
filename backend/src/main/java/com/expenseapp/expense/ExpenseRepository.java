package com.expenseapp.expense;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    @Query(value = "SELECT COALESCE(SUM(e.amount),0) FROM expenses e WHERE e.user_id = :userId AND e.occurred_on BETWEEN :from AND :to", nativeQuery = true)
    BigDecimal totalSpent(Long userId, LocalDate from, LocalDate to);

    @Query(value = "SELECT c.id, COALESCE(c.name,''), COALESCE(SUM(e.amount),0) FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.user_id = :userId AND e.occurred_on BETWEEN :from AND :to GROUP BY c.id, c.name ORDER BY 3 DESC", nativeQuery = true)
    List<Object[]> categoryTotals(Long userId, LocalDate from, LocalDate to);

    @Query(value = "SELECT e.occurred_on, COALESCE(SUM(e.amount),0) FROM expenses e WHERE e.user_id = :userId AND e.occurred_on BETWEEN :from AND :to GROUP BY e.occurred_on ORDER BY e.occurred_on", nativeQuery = true)
    List<Object[]> trends(Long userId, LocalDate from, LocalDate to);

    // Group ledger: credit per payer (sum of others' shares on their expenses)
    @Query(value = "SELECT e.user_id AS payer_id, COALESCE(SUM(CASE WHEN s.user_id <> e.user_id THEN s.share_amount ELSE 0 END),0) AS credit " +
            "FROM expenses e JOIN split_shares s ON s.expense_id = e.id " +
            "WHERE e.group_id = :groupId GROUP BY e.user_id", nativeQuery = true)
    List<Object[]> groupCredits(Long groupId);

    // Group ledger: debit per user (sum of their shares on group expenses)
    @Query(value = "SELECT s.user_id AS user_id, COALESCE(SUM(s.share_amount),0) AS debit " +
            "FROM expenses e JOIN split_shares s ON s.expense_id = e.id " +
            "WHERE e.group_id = :groupId GROUP BY s.user_id", nativeQuery = true)
    List<Object[]> groupDebits(Long groupId);

    // Pairwise view for a user: credits the user expects from others
    @Query(value = "SELECT s.user_id AS counterparty, COALESCE(SUM(s.share_amount),0) AS credit " +
            "FROM expenses e JOIN split_shares s ON s.expense_id = e.id " +
            "WHERE e.user_id = :userId AND s.user_id <> :userId GROUP BY s.user_id", nativeQuery = true)
    List<Object[]> pairwiseCredits(Long userId);

    // Pairwise view for a user: debits the user owes to payers
    @Query(value = "SELECT e.user_id AS counterparty, COALESCE(SUM(s.share_amount),0) AS debit " +
            "FROM expenses e JOIN split_shares s ON s.expense_id = e.id " +
            "WHERE s.user_id = :userId AND e.user_id <> :userId GROUP BY e.user_id", nativeQuery = true)
    List<Object[]> pairwiseDebits(Long userId);

    // Group category totals for a date range (used by budgets)
    @Query(value = "SELECT c.id, COALESCE(c.name,''), COALESCE(SUM(e.amount),0) FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.group_id = :groupId AND e.occurred_on BETWEEN :from AND :to GROUP BY c.id, c.name ORDER BY 3 DESC", nativeQuery = true)
    List<Object[]> groupCategoryTotals(Long groupId, java.time.LocalDate from, java.time.LocalDate to);

    // Personal category totals for a date range (used by budgets)
    @Query(value = "SELECT c.id, COALESCE(c.name,''), COALESCE(SUM(e.amount),0) FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.user_id = :userId AND e.occurred_on BETWEEN :from AND :to GROUP BY c.id, c.name ORDER BY 3 DESC", nativeQuery = true)
    List<Object[]> userCategoryTotals(Long userId, java.time.LocalDate from, java.time.LocalDate to);

    // For base-currency aggregations in service layer
    @Query("""
        SELECT e FROM Expense e 
        LEFT JOIN FETCH e.category c 
        LEFT JOIN FETCH e.user u 
        WHERE e.user = :user 
        AND e.occurredOn BETWEEN :from AND :to
        ORDER BY e.occurredOn
    """)
    List<Expense> findAllByUserAndOccurredOnBetween(
        @Param("user") com.expenseapp.user.User user, 
        @Param("from") java.time.LocalDate from, 
        @Param("to") java.time.LocalDate to
    );
    @Query("SELECT e FROM Expense e LEFT JOIN FETCH e.category WHERE e.group = :group AND e.occurredOn BETWEEN :from AND :to")
    List<Expense> findAllByGroupAndOccurredOnBetween(@Param("group") com.expenseapp.group.Group group, @Param("from") java.time.LocalDate from, @Param("to") java.time.LocalDate to);
    
    @Query(value = """
        SELECT 
            e.occurred_on as occurred_on,
            e.amount as amount,
            c.id as category_id,
            c.name as category_name
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = :userId 
        AND e.occurred_on BETWEEN :from AND :to
        ORDER BY e.occurred_on
    """, nativeQuery = true)
    List<Object[]> findExpenseDataForDashboard(
            @Param("userId") Long userId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    // Strict isolation scoped fetches
    @Query("""
        SELECT e FROM Expense e
        LEFT JOIN FETCH e.category c
        WHERE e.user = :user
          AND e.companyId IS NULL
          AND e.occurredOn BETWEEN :from AND :to
        ORDER BY e.occurredOn DESC, e.id DESC
    """)
    List<Expense> findPersonalByUserAndDate(
            @Param("user") com.expenseapp.user.User user,
            @Param("from") java.time.LocalDate from,
            @Param("to") java.time.LocalDate to
    );

    @Query("""
        SELECT e FROM Expense e
        LEFT JOIN FETCH e.category c
        WHERE e.user = :user
          AND e.companyId = :companyId
          AND e.occurredOn BETWEEN :from AND :to
        ORDER BY e.occurredOn DESC, e.id DESC
    """)
    List<Expense> findCompanyByUserAndDate(
            @Param("user") com.expenseapp.user.User user,
            @Param("companyId") Long companyId,
            @Param("from") java.time.LocalDate from,
            @Param("to") java.time.LocalDate to
    );
    
    // Comprehensive search with multiple filters
    @Query("""
        SELECT e FROM Expense e
        LEFT JOIN FETCH e.category c
        WHERE e.user = :user
          AND (:companyId IS NULL AND e.companyId IS NULL OR e.companyId = :companyId)
          AND (:categoryId IS NULL OR e.category.id = :categoryId)
          AND (:currency IS NULL OR LOWER(e.currency) = LOWER(:currency))
          AND (:merchant IS NULL OR LOWER(e.merchant) LIKE LOWER(CONCAT('%', :merchant, '%')))
          AND (:description IS NULL OR LOWER(e.description) LIKE LOWER(CONCAT('%', :description, '%')))
          AND (:minAmount IS NULL OR e.amount >= :minAmount)
          AND (:maxAmount IS NULL OR e.amount <= :maxAmount)
          AND (:startDate IS NULL OR e.occurredOn >= :startDate)
          AND (:endDate IS NULL OR e.occurredOn <= :endDate)
        ORDER BY e.occurredOn DESC, e.id DESC
    """)
    List<Expense> searchExpenses(
            @Param("user") com.expenseapp.user.User user,
            @Param("companyId") Long companyId,
            @Param("categoryId") Long categoryId,
            @Param("currency") String currency,
            @Param("merchant") String merchant,
            @Param("description") String description,
            @Param("minAmount") java.math.BigDecimal minAmount,
            @Param("maxAmount") java.math.BigDecimal maxAmount,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate
    );
    
    // Reimbursement queries
    List<Expense> findByCompanyIdAndReimbursementStatusOrderByReimbursementRequestedAtDesc(
            Long companyId, String reimbursementStatus);
    
    List<Expense> findByCompanyIdAndReimbursementStatusInOrderByReimbursementApprovedAtDesc(
            Long companyId, List<String> reimbursementStatuses);
    
    @Query("SELECT e FROM Expense e WHERE e.user = :user AND e.reimbursementStatus = :status ORDER BY e.reimbursementRequestedAt DESC")
    List<Expense> findByUserAndReimbursementStatus(
            @Param("user") com.expenseapp.user.User user,
            @Param("status") String status);
    
    // Admin dashboard queries
    long countByReimbursementStatus(String status);
    long countByCompanyId(Long companyId);
    long countByCompanyIdAndReimbursementStatus(Long companyId, String status);
    List<Expense> findByCreatedAtAfter(java.time.Instant createdAt);
    List<Expense> findByReimbursementStatusOrderByReimbursementRequestedAtDesc(String status);
    List<Expense> findByReimbursableOrderByCreatedAtDesc(boolean reimbursable);
    List<Expense> findByCompanyIdAndReimbursableOrderByCreatedAtDesc(Long companyId, boolean reimbursable);
    
    // For ADMIN to see all expenses in their company
    @Query("""
        SELECT e FROM Expense e
        LEFT JOIN FETCH e.category c
        WHERE e.companyId = :companyId
          AND e.occurredOn BETWEEN :from AND :to
        ORDER BY e.occurredOn DESC, e.id DESC
    """)
    List<Expense> findAllByCompanyAndDate(
            @Param("companyId") Long companyId,
            @Param("from") java.time.LocalDate from,
            @Param("to") java.time.LocalDate to
    );
    
    // Role-based visibility queries
    
    // For MANAGER: See own expenses + employee expenses in same company
    @Query(value = """
        SELECT DISTINCT e.* FROM expenses e
        WHERE e.company_id = :companyId
          AND e.occurred_on BETWEEN :from AND :to
          AND (e.user_id = :managerId 
               OR e.user_id IN (
                   SELECT cm.user_id FROM company_members cm
                   WHERE cm.company_id = :companyId
                   AND cm.role = 'EMPLOYEE'
               ))
        ORDER BY e.occurred_on DESC, e.id DESC
    """, nativeQuery = true)
    List<Expense> findManagerVisibleExpenses(
            @Param("managerId") Long managerId,
            @Param("companyId") Long companyId,
            @Param("from") java.time.LocalDate from,
            @Param("to") java.time.LocalDate to
    );
    
    // For EMPLOYEE: See only own expenses
    @Query("""
        SELECT e FROM Expense e
        LEFT JOIN FETCH e.category c
        WHERE e.user.id = :userId
          AND e.companyId = :companyId
          AND e.occurredOn BETWEEN :from AND :to
        ORDER BY e.occurredOn DESC, e.id DESC
    """)
    List<Expense> findEmployeeOwnExpenses(
            @Param("userId") Long userId,
            @Param("companyId") Long companyId,
            @Param("from") java.time.LocalDate from,
            @Param("to") java.time.LocalDate to
    );
}
