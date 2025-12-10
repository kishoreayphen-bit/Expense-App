package com.expenseapp.audit;

import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuditLogService {
    
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    
    /**
     * Log an action to the audit trail
     */
    @Transactional
    public void log(String userEmail, String action, String resourceType, Long resourceId, 
                    String oldValue, String newValue, Long companyId) {
        User user = userRepository.findByEmail(userEmail).orElse(null);
        
        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setUserEmail(userEmail);
        log.setAction(action);
        log.setResourceType(resourceType);
        log.setResourceId(resourceId);
        log.setOldValue(oldValue);
        log.setNewValue(newValue);
        log.setCompanyId(companyId);
        
        auditLogRepository.save(log);
    }
    
    /**
     * Log a simple action
     */
    @Transactional
    public void logAction(String userEmail, String action, String resourceType, Long resourceId) {
        log(userEmail, action, resourceType, resourceId, null, null, null);
    }
    
    /**
     * Get all audit logs (SUPER_ADMIN only)
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getAllLogs(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }
    
    /**
     * Get logs for a specific user
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getLogsByUser(String userEmail, Pageable pageable) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return auditLogRepository.findByUserOrderByCreatedAtDesc(user, pageable);
    }
    
    /**
     * Get logs for a specific action
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getLogsByAction(String action, Pageable pageable) {
        return auditLogRepository.findByActionOrderByCreatedAtDesc(action, pageable);
    }
    
    /**
     * Get logs for a specific resource type
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getLogsByResourceType(String resourceType, Pageable pageable) {
        return auditLogRepository.findByResourceTypeOrderByCreatedAtDesc(resourceType, pageable);
    }
    
    /**
     * Get logs for a specific company
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getLogsByCompany(Long companyId, Pageable pageable) {
        return auditLogRepository.findByCompanyIdOrderByCreatedAtDesc(companyId, pageable);
    }
    
    /**
     * Get logs within a date range
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getLogsByDateRange(Instant startDate, Instant endDate, Pageable pageable) {
        return auditLogRepository.findByDateRange(startDate, endDate, pageable);
    }
}
