package com.expenseapp.audit;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

    private final AccessLogRepository repo;

    public AuditController(AccessLogRepository repo) { this.repo = repo; }

    @GetMapping("/logs")
    public ResponseEntity<Map<String, Object>> logs(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String resourceType,
            @RequestParam(required = false) Long resourceId,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false, defaultValue = "0") Integer offset,
            @RequestParam(required = false, defaultValue = "50") Integer limit
    ) {
        String email = currentEmail();
        Instant fromTs = from != null ? from.atStartOfDay().toInstant(ZoneOffset.UTC) : null;
        Instant toTs = to != null ? to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC) : null;
        List<AccessLog> all = repo.findAll();
        // If not admin, restrict to actorEmail == current user (own activity only)
        boolean admin = isAdmin();
        List<AccessLog> filtered = all.stream()
                .filter(l -> fromTs == null || !l.getCreatedAt().isBefore(fromTs))
                .filter(l -> toTs == null || l.getCreatedAt().isBefore(toTs))
                .filter(l -> admin || (l.getActorEmail() != null && l.getActorEmail().equalsIgnoreCase(email)))
                .filter(l -> actorId == null || (l.getActorId() != null && l.getActorId().equals(actorId)))
                .filter(l -> action == null || l.getAction().equalsIgnoreCase(action))
                .filter(l -> resourceType == null || l.getResourceType().equalsIgnoreCase(resourceType))
                .filter(l -> resourceId == null || (l.getResourceId() != null && l.getResourceId().equals(resourceId)))
                .filter(l -> outcome == null || l.getOutcome().equalsIgnoreCase(outcome))
                .sorted((a,b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());
        int start = Math.max(0, offset);
        int end = Math.min(filtered.size(), start + Math.max(1, limit));
        List<AccessLog> page = start >= end ? List.of() : filtered.subList(start, end);
        return ResponseEntity.ok(Map.of(
                "total", filtered.size(),
                "offset", start,
                "limit", end - start,
                "items", page
        ));
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) return false;
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .anyMatch(r -> "ROLE_ADMIN".equalsIgnoreCase(r) || "ADMIN".equalsIgnoreCase(r));
    }
}
