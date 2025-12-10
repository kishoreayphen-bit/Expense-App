package com.expenseapp.notification;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications/devices")
public class DeviceTokenController {

    private final DeviceTokenService deviceTokenService;

    public DeviceTokenController(DeviceTokenService deviceTokenService) {
        this.deviceTokenService = deviceTokenService;
    }

    public static class RegisterRequest {
        public String token;
        public String platform;
    }

    @PostMapping
    public ResponseEntity<DeviceToken> register(@Valid @RequestBody RegisterRequest req) {
        String email = currentEmail();
        return ResponseEntity.ok(deviceTokenService.register(email, req.token, req.platform));
    }

    @GetMapping
    public ResponseEntity<List<DeviceToken>> listMine() {
        String email = currentEmail();
        return ResponseEntity.ok(deviceTokenService.listMine(email));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remove(@PathVariable Long id) {
        String email = currentEmail();
        deviceTokenService.remove(email, id);
        return ResponseEntity.ok().build();
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
