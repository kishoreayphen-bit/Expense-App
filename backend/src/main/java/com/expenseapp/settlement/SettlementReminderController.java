package com.expenseapp.settlement;

import com.expenseapp.settlement.dto.SettlementReminderDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/settlements/reminders")
public class SettlementReminderController {

    private final SettlementReminderService reminderService;

    public SettlementReminderController(SettlementReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @PostMapping
    public ResponseEntity<SettlementReminderDto> create(@Valid @RequestBody SettlementReminderDto req) {
        String email = currentEmail();
        return ResponseEntity.ok(reminderService.create(email, req));
    }

    @GetMapping
    public ResponseEntity<List<SettlementReminderDto>> list() {
        String email = currentEmail();
        return ResponseEntity.ok(reminderService.list(email));
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
