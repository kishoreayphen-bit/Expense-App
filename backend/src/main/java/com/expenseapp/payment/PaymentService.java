package com.expenseapp.payment;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.PaymentIntentConfirmParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {
    
    private final PaymentRepository paymentRepository;
    
    @Value("${stripe.secret.key}")
    private String stripeSecretKey;
    
    /**
     * Create a payment intent for a split share
     */
    @Transactional
    public Payment createPaymentIntent(Long splitShareId, Long userId, BigDecimal amount, String currency) throws StripeException {
        log.info("Creating payment intent for splitShareId={}, userId={}, amount={} {}", splitShareId, userId, amount, currency);
        
        // Check if payment already exists
        // Note: splitShareId might be a user ID or reference ID, not necessarily a DB split_share ID
        Optional<Payment> existing = paymentRepository.findBySplitShareIdAndUserId(splitShareId, userId);
        if (existing.isPresent() && existing.get().getStatus() == Payment.PaymentStatus.SUCCEEDED) {
            log.warn("Payment already completed for splitShareId={}, userId={}", splitShareId, userId);
            return existing.get();
        }
        
        // If existing payment is pending or failed, we can reuse it
        if (existing.isPresent()) {
            Payment existingPayment = existing.get();
            if (existingPayment.getStatus() == Payment.PaymentStatus.PENDING || 
                existingPayment.getStatus() == Payment.PaymentStatus.FAILED) {
                log.info("Reusing existing payment intent: paymentId={}", existingPayment.getId());
                return existingPayment;
            }
        }
        
        // Convert amount to cents (Stripe uses smallest currency unit)
        long amountInCents = amount.multiply(new BigDecimal("100")).longValue();
        
        // Create Stripe Payment Intent
        Map<String, String> metadata = new HashMap<>();
        metadata.put("split_share_id", splitShareId.toString());
        metadata.put("user_id", userId.toString());
        
        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
            .setAmount(amountInCents)
            .setCurrency(currency.toLowerCase())
            .putAllMetadata(metadata)
            .setAutomaticPaymentMethods(
                PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                    .setEnabled(true)
                    .build()
            )
            .build();
        
        PaymentIntent paymentIntent = PaymentIntent.create(params);
        
        // Save payment record
        Payment payment = Payment.builder()
            .splitShareId(splitShareId)
            .userId(userId)
            .amount(amount)
            .currency(currency)
            .stripePaymentIntentId(paymentIntent.getId())
            .status(Payment.PaymentStatus.PENDING)
            .build();
        
        payment = paymentRepository.save(payment);
        log.info("Payment intent created: paymentId={}, stripePaymentIntentId={}", payment.getId(), paymentIntent.getId());
        
        return payment;
    }
    
    /**
     * Confirm a payment (called after client confirms payment)
     */
    @Transactional
    public Payment confirmPayment(String paymentIntentId) throws StripeException {
        log.info("Confirming payment for paymentIntentId={}", paymentIntentId);
        
        Payment payment = paymentRepository.findByStripePaymentIntentId(paymentIntentId)
            .orElseThrow(() -> new RuntimeException("Payment not found for intent: " + paymentIntentId));
        
        // Retrieve payment intent from Stripe
        PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);
        
        // Update payment status based on Stripe status
        updatePaymentFromStripe(payment, paymentIntent);
        
        return paymentRepository.save(payment);
    }
    
    /**
     * Handle Stripe webhook events
     */
    @Transactional
    public void handleWebhook(String paymentIntentId, String eventType) {
        log.info("Handling webhook event: type={}, paymentIntentId={}", eventType, paymentIntentId);
        
        try {
            Payment payment = paymentRepository.findByStripePaymentIntentId(paymentIntentId)
                .orElse(null);
            
            if (payment == null) {
                log.warn("Payment not found for webhook event: paymentIntentId={}", paymentIntentId);
                return;
            }
            
            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);
            updatePaymentFromStripe(payment, paymentIntent);
            paymentRepository.save(payment);
            
        } catch (StripeException e) {
            log.error("Error handling webhook for paymentIntentId={}: {}", paymentIntentId, e.getMessage());
        }
    }
    
    /**
     * Get payment by ID
     */
    public Optional<Payment> getPayment(Long paymentId) {
        return paymentRepository.findById(paymentId);
    }
    
    /**
     * Get payment by split share ID
     */
    public Optional<Payment> getPaymentBySplitShare(Long splitShareId, Long userId) {
        return paymentRepository.findBySplitShareIdAndUserId(splitShareId, userId);
    }
    
    /**
     * Get all payments for a user
     */
    public List<Payment> getUserPayments(Long userId) {
        return paymentRepository.findByUserId(userId);
    }
    
    /**
     * Update payment record from Stripe PaymentIntent
     */
    private void updatePaymentFromStripe(Payment payment, PaymentIntent paymentIntent) {
        String status = paymentIntent.getStatus();
        
        switch (status) {
            case "succeeded":
                payment.setStatus(Payment.PaymentStatus.SUCCEEDED);
                payment.setPaidAt(OffsetDateTime.now());
                // Store basic payment info (charge details can be retrieved separately if needed)
                if (paymentIntent.getLatestCharge() != null) {
                    payment.setStripeChargeId(paymentIntent.getLatestCharge());
                }
                break;
            case "processing":
                payment.setStatus(Payment.PaymentStatus.PROCESSING);
                break;
            case "requires_payment_method":
            case "requires_confirmation":
            case "requires_action":
                payment.setStatus(Payment.PaymentStatus.PENDING);
                break;
            case "canceled":
                payment.setStatus(Payment.PaymentStatus.CANCELLED);
                break;
            default:
                log.warn("Unknown payment intent status: {}", status);
        }
    }
}
