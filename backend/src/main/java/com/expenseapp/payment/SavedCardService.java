package com.expenseapp.payment;

import com.expenseapp.user.UserRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentMethod;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SavedCardService {
    
    private final SavedCardRepository savedCardRepository;
    private final UserRepository userRepository;
    
    @Value("${stripe.secret.key:}")
    private String stripeSecretKey;
    
    @PostConstruct
    public void init() {
        if (stripeSecretKey != null && !stripeSecretKey.isEmpty()) {
            Stripe.apiKey = stripeSecretKey;
        }
    }
    
    @Transactional
    public SavedCard saveCard(String userEmail, String paymentMethodId, boolean setAsDefault) {
        var user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        try {
            // Retrieve payment method details from Stripe
            PaymentMethod pm = PaymentMethod.retrieve(paymentMethodId);
            
            // Check if card already saved
            var existing = savedCardRepository.findByStripePaymentMethodId(paymentMethodId);
            if (existing.isPresent()) {
                if (setAsDefault) {
                    return setDefaultCard(userEmail, existing.get().getId());
                }
                return existing.get();
            }
            
            // Create new saved card
            SavedCard card = new SavedCard();
            card.setUserId(user.getId());
            card.setStripePaymentMethodId(paymentMethodId);
            card.setCardBrand(pm.getCard().getBrand());
            card.setCardLast4(pm.getCard().getLast4());
            card.setCardExpMonth(pm.getCard().getExpMonth().intValue());
            card.setCardExpYear(pm.getCard().getExpYear().intValue());
            card.setIsDefault(setAsDefault);
            
            if (setAsDefault) {
                savedCardRepository.clearDefaultForUser(user.getId());
            }
            
            return savedCardRepository.save(card);
            
        } catch (StripeException e) {
            log.error("Failed to save card", e);
            throw new RuntimeException("Failed to save card: " + e.getMessage());
        }
    }
    
    public List<SavedCard> listCards(String userEmail) {
        var user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return savedCardRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(user.getId());
    }
    
    public SavedCard getDefaultCard(String userEmail) {
        var user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return savedCardRepository.findByUserIdAndIsDefaultTrue(user.getId())
            .orElse(null);
    }
    
    @Transactional
    public SavedCard setDefaultCard(String userEmail, Long cardId) {
        var user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        SavedCard card = savedCardRepository.findById(cardId)
            .orElseThrow(() -> new RuntimeException("Card not found"));
        
        if (!card.getUserId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        
        savedCardRepository.clearDefaultForUser(user.getId());
        card.setIsDefault(true);
        card.setUpdatedAt(LocalDateTime.now());
        
        return savedCardRepository.save(card);
    }
    
    @Transactional
    public void deleteCard(String userEmail, Long cardId) {
        var user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        SavedCard card = savedCardRepository.findById(cardId)
            .orElseThrow(() -> new RuntimeException("Card not found"));
        
        if (!card.getUserId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        
        savedCardRepository.delete(card);
    }
}
