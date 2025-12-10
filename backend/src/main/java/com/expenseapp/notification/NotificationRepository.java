package com.expenseapp.notification;

import com.expenseapp.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findAllByUserOrderByCreatedAtDesc(User user);
    List<Notification> findAllByUserAndReadAtIsNullOrderByCreatedAtDesc(User user);
    
    // Company-scoped notifications
    List<Notification> findAllByUserAndCompanyIdOrderByCreatedAtDesc(User user, Long companyId);
    List<Notification> findAllByUserAndCompanyIdAndReadAtIsNullOrderByCreatedAtDesc(User user, Long companyId);
    
    // Personal notifications (companyId is null)
    List<Notification> findAllByUserAndCompanyIdIsNullOrderByCreatedAtDesc(User user);
    List<Notification> findAllByUserAndCompanyIdIsNullAndReadAtIsNullOrderByCreatedAtDesc(User user);

    @Query(value = "SELECT COUNT(1) FROM notifications WHERE user_id = :userId AND type = :type AND title = :title AND created_at >= :since", nativeQuery = true)
    long countRecentDuplicates(@Param("userId") Long userId, @Param("type") String type, @Param("title") String title, @Param("since") Instant since);

    // Deduplicate budget alerts: ensure we only send once per budget (by budgetId embedded in JSON data)
    // Postgres: cast jsonb column to text for LIKE pattern match
    @Query(value = "SELECT COUNT(1) FROM notifications WHERE user_id = :userId AND type = :type AND title = :title AND (data::text) LIKE CONCAT('%\"budgetId\":', :budgetId, '%')", nativeQuery = true)
    long countByUserAndTypeAndTitleAndBudgetId(@Param("userId") Long userId, @Param("type") String type, @Param("title") String title, @Param("budgetId") Long budgetId);
}
