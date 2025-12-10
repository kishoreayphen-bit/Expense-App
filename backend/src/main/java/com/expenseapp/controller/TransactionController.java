package com.expenseapp.controller;

import com.expenseapp.dto.TransactionDto;
import com.expenseapp.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final NamedParameterJdbcTemplate jdbc;
    private static final Logger log = LoggerFactory.getLogger(TransactionController.class);

    @Autowired
    public TransactionController(TransactionService transactionService, NamedParameterJdbcTemplate jdbc) {
        this.transactionService = transactionService;
        this.jdbc = jdbc;
    }

    @GetMapping
    public ResponseEntity<List<TransactionDto>> getAllTransactions() {
        Long userId = resolveUserId();
        return ResponseEntity.ok(transactionService.getAllTransactions(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionDto> getTransactionById(
            @PathVariable Long id) {
        Long userId = resolveUserId();
        return ResponseEntity.ok(transactionService.getTransactionById(id, userId));
    }

    @GetMapping("/filter")
    public ResponseEntity<List<TransactionDto>> getTransactionsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        Long userId = resolveUserId();
        return ResponseEntity.ok(transactionService.getTransactionsByDateRange(userId, startDate, endDate));
    }

    @PostMapping
    public ResponseEntity<TransactionDto> createTransaction(
            @RequestBody TransactionDto transactionDto) {
        Long userId = resolveUserId();
        try {
            log.debug("Creating transaction for userId={} payload={}", userId, transactionDto);
            TransactionDto createdTransaction = transactionService.createTransaction(transactionDto, userId);

            URI location = ServletUriComponentsBuilder
                    .fromCurrentRequest()
                    .path("/{id}")
                    .buildAndExpand(createdTransaction.getId())
                    .toUri();

            return ResponseEntity.created(location).body(createdTransaction);
        } catch (Exception ex) {
            log.error("Failed to create transaction for userId=" + userId + ": " + ex.getMessage(), ex);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionDto> updateTransaction(
            @PathVariable Long id,
            @RequestBody TransactionDto transactionDto) {
        Long userId = resolveUserId();
        return ResponseEntity.ok(transactionService.updateTransaction(id, transactionDto, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(
            @PathVariable Long id) {
        Long userId = resolveUserId();
        transactionService.deleteTransaction(id, userId);
        return ResponseEntity.noContent().build();
    }

    private Long resolveUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = (auth != null && auth.getPrincipal() instanceof UserDetails)
                ? ((UserDetails) auth.getPrincipal()).getUsername()
                : (auth != null ? String.valueOf(auth.getPrincipal()) : null);
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Unable to resolve authenticated user");
        }
        List<Long> ids = jdbc.query(
                "SELECT id FROM users WHERE email=:e ORDER BY id ASC LIMIT 1",
                new MapSqlParameterSource().addValue("e", email),
                (rs, i) -> rs.getLong("id")
        );
        // Do not auto-insert user here to avoid violating NOT NULL constraints on password
        if (ids.isEmpty()) {
            throw new IllegalStateException("Authenticated user not found in users table: " + email);
        }
        return ids.get(0);
    }
}
