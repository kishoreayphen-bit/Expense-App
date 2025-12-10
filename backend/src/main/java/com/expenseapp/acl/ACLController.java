package com.expenseapp.acl;

import com.expenseapp.acl.dto.AclShareRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/acl")
public class ACLController {

    private final ACLEntryService aclEntryService;
    private final com.expenseapp.audit.AccessLogService accessLogService;

    public ACLController(ACLEntryService aclEntryService, com.expenseapp.audit.AccessLogService accessLogService) {
        this.aclEntryService = aclEntryService;
        this.accessLogService = accessLogService;
    }

    @PostMapping("/share")
    public ResponseEntity<ACLEntry> share(@Validated @RequestBody AclShareRequest req) {
        String actor = currentEmail();
        ACLEntry e = aclEntryService.share(actor, req.getResourceType().toUpperCase(), req.getResourceId(),
                req.getPrincipalType().toUpperCase(), req.getPrincipalId(), req.getPermission().toUpperCase());
        accessLogService.log(null, actor, "ACL_SHARE", "ACL", e.getId(), "SUCCESS",
                "resource=" + e.getResourceType() + ":" + e.getResourceId() + ", principal=" + e.getPrincipalType() + ":" + e.getPrincipalId() + ", perm=" + e.getPermission());
        return ResponseEntity.ok(e);
    }

    @DeleteMapping("/share")
    public ResponseEntity<Void> revoke(@Validated @RequestBody AclShareRequest req) {
        aclEntryService.revoke(req.getResourceType().toUpperCase(), req.getResourceId(),
                req.getPrincipalType().toUpperCase(), req.getPrincipalId(), req.getPermission().toUpperCase());
        String actor = currentEmail();
        accessLogService.log(null, actor, "ACL_REVOKE", "ACL", req.getResourceId(), "SUCCESS",
                "resource=" + req.getResourceType().toUpperCase() + ", principal=" + req.getPrincipalType().toUpperCase() + ":" + req.getPrincipalId() + ", perm=" + req.getPermission().toUpperCase());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/list")
    public ResponseEntity<List<ACLEntry>> list(@RequestParam String resourceType, @RequestParam Long resourceId) {
        return ResponseEntity.ok(aclEntryService.list(resourceType.toUpperCase(), resourceId));
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
