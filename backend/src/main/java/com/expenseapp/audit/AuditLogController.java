package com.expenseapp.audit;

import com.expenseapp.security.CurrentUser;
import com.expenseapp.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
public class AuditLogController {
    
    private final AuditLogService auditLogService;
    
    /**
     * Get all audit logs (SUPER_ADMIN only)
     */
    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<AuditLog>> getAllLogs(Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getAllLogs(pageable));
    }
    
    /**
     * Get audit logs for current user
     */
    @GetMapping("/my-logs")
    public ResponseEntity<Page<AuditLog>> getMyLogs(
            @CurrentUser User user,
            Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getLogsByUser(user.getEmail(), pageable));
    }
    
    /**
     * Get audit logs by action (SUPER_ADMIN only)
     */
    @GetMapping("/by-action/{action}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<AuditLog>> getLogsByAction(
            @PathVariable String action,
            Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getLogsByAction(action, pageable));
    }
    
    /**
     * Get audit logs by resource type (SUPER_ADMIN only)
     */
    @GetMapping("/by-resource/{resourceType}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<AuditLog>> getLogsByResourceType(
            @PathVariable String resourceType,
            Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getLogsByResourceType(resourceType, pageable));
    }
    
    /**
     * Get audit logs by company (ADMIN and above)
     */
    @GetMapping("/by-company/{companyId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<AuditLog>> getLogsByCompany(
            @PathVariable Long companyId,
            Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getLogsByCompany(companyId, pageable));
    }
    
    /**
     * Get audit logs by date range (SUPER_ADMIN only)
     */
    @GetMapping("/by-date-range")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<AuditLog>> getLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate,
            Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getLogsByDateRange(startDate, endDate, pageable));
    }
}
