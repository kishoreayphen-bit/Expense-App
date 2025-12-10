package com.expenseapp.notification;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> list(
            @RequestParam(name = "unreadOnly", defaultValue = "false") boolean unreadOnly,
            @RequestParam(name = "companyId", required = false) Long companyId) {
        String email = currentEmail();
        return ResponseEntity.ok(notificationService.list(email, unreadOnly, companyId));
    }

    @PostMapping("/mark-read")
    public ResponseEntity<Void> markRead(@Valid @RequestBody List<Long> ids) {
        String email = currentEmail();
        notificationService.markRead(email, ids);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<Void> markAllRead() {
        String email = currentEmail();
        notificationService.markAllRead(email);
        return ResponseEntity.ok().build();
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
