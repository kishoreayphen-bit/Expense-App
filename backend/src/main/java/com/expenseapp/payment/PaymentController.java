package com.expenseapp.payment;

import com.stripe.exception.StripeException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {
    
    private final PaymentService paymentService;
    
    @Value("${stripe.publishable.key}")
    private String stripePublishableKey;
    
    /**
     * Get Stripe publishable key for frontend
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> getConfig() {
        Map<String, String> config = new HashMap<>();
        config.put("publishableKey", stripePublishableKey);
        return ResponseEntity.ok(config);
    }
    
    /**
     * Create payment intent for a split share
     */
    @PostMapping("/create-intent")
    public ResponseEntity<PaymentIntentResponse> createPaymentIntent(
            @RequestBody CreatePaymentRequest request,
            Authentication authentication) {
        
        try {
            Long userId = extractUserId(authentication);
            
            Payment payment = paymentService.createPaymentIntent(
                request.getSplitShareId(),
                userId,
                request.getAmount(),
                request.getCurrency()
            );
            
            // Retrieve the client secret from Stripe
            com.stripe.model.PaymentIntent paymentIntent = 
                com.stripe.model.PaymentIntent.retrieve(payment.getStripePaymentIntentId());
            
            PaymentIntentResponse response = PaymentIntentResponse.builder()
                .paymentId(payment.getId())
                .clientSecret(paymentIntent.getClientSecret())
                .status(payment.getStatus().name())
                .build();
            
            return ResponseEntity.ok(response);
            
        } catch (StripeException e) {
            log.error("Stripe error creating payment intent: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error creating payment intent: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Confirm payment after client-side confirmation
     */
    @PostMapping("/confirm")
    public ResponseEntity<PaymentResponse> confirmPayment(
            @RequestBody ConfirmPaymentRequest request) {
        
        try {
            Payment payment = paymentService.confirmPayment(request.getPaymentIntentId());
            
            PaymentResponse response = PaymentResponse.builder()
                .id(payment.getId())
                .splitShareId(payment.getSplitShareId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .status(payment.getStatus().name())
                .paidAt(payment.getPaidAt())
                .receiptUrl(payment.getReceiptUrl())
                .build();
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error confirming payment: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Get payment by split share
     */
    @GetMapping("/split-share/{splitShareId}")
    public ResponseEntity<PaymentResponse> getPaymentBySplitShare(
            @PathVariable Long splitShareId,
            Authentication authentication) {
        
        Long userId = extractUserId(authentication);
        
        return paymentService.getPaymentBySplitShare(splitShareId, userId)
            .map(payment -> {
                PaymentResponse response = PaymentResponse.builder()
                    .id(payment.getId())
                    .splitShareId(payment.getSplitShareId())
                    .amount(payment.getAmount())
                    .currency(payment.getCurrency())
                    .status(payment.getStatus().name())
                    .paidAt(payment.getPaidAt())
                    .receiptUrl(payment.getReceiptUrl())
                    .build();
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * Get user's payment history
     */
    @GetMapping("/my-payments")
    public ResponseEntity<List<PaymentResponse>> getMyPayments(Authentication authentication) {
        Long userId = extractUserId(authentication);
        
        List<PaymentResponse> payments = paymentService.getUserPayments(userId).stream()
            .map(payment -> PaymentResponse.builder()
                .id(payment.getId())
                .splitShareId(payment.getSplitShareId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .status(payment.getStatus().name())
                .paidAt(payment.getPaidAt())
                .receiptUrl(payment.getReceiptUrl())
                .build())
            .toList();
        
        return ResponseEntity.ok(payments);
    }
    
    /**
     * Stripe webhook endpoint
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(@RequestBody String payload) {
        // In production, verify webhook signature
        // For now, simple handling
        log.info("Received webhook: {}", payload);
        return ResponseEntity.ok("Webhook received");
    }
    
    private Long extractUserId(Authentication authentication) {
        // Extract user ID from authentication
        // This depends on your JWT implementation
        String email = authentication.getName();
        // You'll need to fetch the actual user ID from your user service
        // For now, returning a placeholder
        return 1L; // TODO: Implement proper user ID extraction
    }
    
    // DTOs
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class CreatePaymentRequest {
        private Long splitShareId;
        private BigDecimal amount;
        private String currency;
    }
    
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ConfirmPaymentRequest {
        private String paymentIntentId;
    }
    
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class PaymentIntentResponse {
        private Long paymentId;
        private String clientSecret;
        private String status;
    }
    
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class PaymentResponse {
        private Long id;
        private Long splitShareId;
        private BigDecimal amount;
        private String currency;
        private String status;
        private java.time.OffsetDateTime paidAt;
        private String receiptUrl;
    }
}
