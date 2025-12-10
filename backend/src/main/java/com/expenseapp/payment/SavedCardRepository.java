package com.expenseapp.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface SavedCardRepository extends JpaRepository<SavedCard, Long> {
    
    List<SavedCard> findByUserIdOrderByIsDefaultDescCreatedAtDesc(Long userId);
    
    Optional<SavedCard> findByUserIdAndIsDefaultTrue(Long userId);
    
    Optional<SavedCard> findByStripePaymentMethodId(String stripePaymentMethodId);
    
    @Modifying
    @Query("UPDATE SavedCard sc SET sc.isDefault = false WHERE sc.userId = :userId")
    void clearDefaultForUser(@Param("userId") Long userId);
}
