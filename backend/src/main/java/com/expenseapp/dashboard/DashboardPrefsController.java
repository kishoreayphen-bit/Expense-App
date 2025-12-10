package com.expenseapp.dashboard;

import com.expenseapp.dashboard.dto.DashboardPrefsDto;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/dashboard/prefs")
public class DashboardPrefsController {

    private final DashboardPrefsRepository prefsRepository;
    private final UserRepository userRepository;

    public DashboardPrefsController(DashboardPrefsRepository prefsRepository, UserRepository userRepository) {
        this.prefsRepository = prefsRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<DashboardPrefsDto> getPrefs() {
        User user = currentUser();
        DashboardPrefs prefs = prefsRepository.findByUser(user).orElseGet(() -> {
            DashboardPrefs p = new DashboardPrefs();
            p.setUser(user); return prefsRepository.save(p);
        });
        return ResponseEntity.ok(new DashboardPrefsDto(prefs.getPeriod(), prefs.getCollapsedWidgets()));
    }

    @PutMapping
    public ResponseEntity<DashboardPrefsDto> updatePrefs(@RequestBody DashboardPrefsDto dto) {
        User user = currentUser();
        DashboardPrefs prefs = prefsRepository.findByUser(user).orElseGet(() -> { DashboardPrefs p = new DashboardPrefs(); p.setUser(user); return p; });
        if (dto.getPeriod() != null && !dto.getPeriod().isBlank()) prefs.setPeriod(dto.getPeriod());
        prefs.setCollapsedWidgets(dto.getCollapsedWidgets());
        prefs = prefsRepository.save(prefs);
        return ResponseEntity.ok(new DashboardPrefsDto(prefs.getPeriod(), prefs.getCollapsedWidgets()));
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        return userRepository.findByEmail(email).orElseThrow();
    }
}
