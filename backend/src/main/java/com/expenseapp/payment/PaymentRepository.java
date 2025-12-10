package com.expenseapp.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    
    Optional<Payment> findByStripePaymentIntentId(String stripePaymentIntentId);
    
    List<Payment> findByUserId(Long userId);
    
    List<Payment> findBySplitShareId(Long splitShareId);
    
    Optional<Payment> findBySplitShareIdAndUserId(Long splitShareId, Long userId);
    
    List<Payment> findByStatus(Payment.PaymentStatus status);
}
