package com.expenseapp.notification;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications/prefs")
public class NotificationPrefsController {

    private final NotificationPrefsService prefsService;

    public NotificationPrefsController(NotificationPrefsService prefsService) {
        this.prefsService = prefsService;
    }

    @GetMapping
    public ResponseEntity<NotificationPrefs> get() {
        String email = currentEmail();
        return ResponseEntity.ok(prefsService.get(email));
    }

    @PutMapping
    public ResponseEntity<NotificationPrefs> update(@RequestBody NotificationPrefs req) {
        String email = currentEmail();
        return ResponseEntity.ok(prefsService.update(email, req));
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
