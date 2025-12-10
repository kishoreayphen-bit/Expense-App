package com.expenseapp.bill;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface BillRepository extends JpaRepository<Bill, Long> {
    
    List<Bill> findByUserIdAndCompanyIdIsNull(Long userId);
    
    List<Bill> findByUserIdAndCompanyId(Long userId, Long companyId);
    
    List<Bill> findByExpenseId(Long expenseId);
    
    List<Bill> findByUserIdAndBillNumber(Long userId, String billNumber);
    
    @Query(value = "SELECT * FROM bills b WHERE b.user_id = :userId " +
           "AND ((:companyId IS NULL AND b.company_id IS NULL) OR (:companyId IS NOT NULL AND b.company_id = :companyId)) " +
           "AND (:billNumber IS NULL OR LOWER(CAST(b.bill_number AS text)) LIKE LOWER(CONCAT('%', :billNumber, '%'))) " +
           "AND (:merchant IS NULL OR LOWER(CAST(b.merchant AS text)) LIKE LOWER(CONCAT('%', :merchant, '%'))) " +
           "AND (:categoryId IS NULL OR b.category_id = :categoryId) " +
           "AND (:startDate IS NULL OR b.bill_date >= :startDate) " +
           "AND (:endDate IS NULL OR b.bill_date <= :endDate) " +
           "ORDER BY b.bill_date DESC NULLS LAST, b.uploaded_at DESC", 
           nativeQuery = true)
    List<Bill> searchBills(
        @Param("userId") Long userId,
        @Param("companyId") Long companyId,
        @Param("billNumber") String billNumber,
        @Param("merchant") String merchant,
        @Param("categoryId") Long categoryId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
}
