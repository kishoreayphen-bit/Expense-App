package com.expenseapp.payment;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/saved-cards")
@RequiredArgsConstructor
public class SavedCardController {
    
    private final SavedCardService savedCardService;
    
    @PostMapping
    public ResponseEntity<SavedCard> saveCard(
            @RequestBody Map<String, Object> request,
            Authentication auth) {
        
        String paymentMethodId = (String) request.get("paymentMethodId");
        Boolean setAsDefault = (Boolean) request.getOrDefault("setAsDefault", false);
        
        SavedCard card = savedCardService.saveCard(auth.getName(), paymentMethodId, setAsDefault);
        return ResponseEntity.ok(card);
    }
    
    @GetMapping
    public ResponseEntity<List<SavedCard>> listCards(Authentication auth) {
        return ResponseEntity.ok(savedCardService.listCards(auth.getName()));
    }
    
    @GetMapping("/default")
    public ResponseEntity<SavedCard> getDefaultCard(Authentication auth) {
        SavedCard card = savedCardService.getDefaultCard(auth.getName());
        if (card == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(card);
    }
    
    @PutMapping("/{id}/set-default")
    public ResponseEntity<SavedCard> setDefaultCard(
            @PathVariable Long id,
            Authentication auth) {
        
        SavedCard card = savedCardService.setDefaultCard(auth.getName(), id);
        return ResponseEntity.ok(card);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCard(
            @PathVariable Long id,
            Authentication auth) {
        
        savedCardService.deleteCard(auth.getName(), id);
        return ResponseEntity.ok().build();
    }
}
