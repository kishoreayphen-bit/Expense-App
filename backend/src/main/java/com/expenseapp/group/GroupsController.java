package com.expenseapp.group;

import com.expenseapp.group.dto.GroupDefaultsDto;
import com.expenseapp.group.dto.GroupLedgerView;
import com.expenseapp.group.dto.GroupView;
import com.expenseapp.group.dto.MemberChangeRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/groups")
public class GroupsController {

    private final NamedParameterJdbcTemplate jdbc;
    private final GroupService groupService;

    public GroupsController(NamedParameterJdbcTemplate jdbc, GroupService groupService) {
        this.jdbc = jdbc;
        this.groupService = groupService;
    }

    public static class CreateGroupRequest {
        public String name;
        public String type; // TEAM/EVENT/PROJECT
        public Long ownerId; // optional; if null, backend may pick current user in future
        public List<Long> memberIds; // includes owner too or not; we'll ensure owner added
    }

    public static class AddMemberRequest {
        public Long userId;
        public String role; // MEMBER/ADMIN
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String,Object>> create(
            @RequestBody CreateGroupRequest req,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId,
            @RequestParam(value = "companyId", required = false) Long companyIdParam,
            @RequestParam(value = "company_id", required = false) Long companyIdSnake
    ) {
        if (req == null || req.name == null || req.name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error","Group name required"));
        }
        String type = (req.type == null || req.type.isBlank()) ? "TEAM" : req.type.trim();
        Long ownerId = req.ownerId;
        if (ownerId == null) {
            // Prefer the authenticated principal's user record; create one if missing
            String email = currentEmail();
            java.util.List<Long> ids = jdbc.query(
                    "SELECT id FROM users WHERE email=:e ORDER BY id ASC LIMIT 1",
                    new MapSqlParameterSource().addValue("e", email),
                    (rs, i) -> rs.getLong("id")
            );
            if (ids.isEmpty()) {
                jdbc.update("INSERT INTO users(name,email,role,enabled) VALUES(:n,:e,'USER',true)",
                        new MapSqlParameterSource().addValue("n", email).addValue("e", email));
                ids = jdbc.query(
                        "SELECT id FROM users WHERE email=:e ORDER BY id ASC LIMIT 1",
                        new MapSqlParameterSource().addValue("e", email),
                        (rs, i) -> rs.getLong("id")
                );
            }
            ownerId = ids.isEmpty() ? null : ids.get(0);
            if (ownerId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Owner could not be determined"));
            }
        }
        // Determine company scope - same logic as expenses
        Long coId = companyId != null ? companyId : (companyIdParam != null ? companyIdParam : companyIdSnake);
        Long normalizedCompanyId = (coId != null && coId > 0) ? coId : null;
        
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("name", req.name.trim())
                .addValue("type", type)
                .addValue("owner", ownerId)
                .addValue("companyId", normalizedCompanyId);
        // Use RETURNING to avoid race conditions on name
        Long groupId = jdbc.queryForObject(
                "INSERT INTO groups(name,type,owner_id,company_id,archived) VALUES(:name,:type,:owner,:companyId,false) RETURNING id",
                p,
                Long.class
        );
        // ensure owner member as OWNER
        jdbc.update("INSERT INTO group_members(group_id,user_id,role) VALUES(:g,:u,'OWNER') ON CONFLICT DO NOTHING",
                new MapSqlParameterSource().addValue("g", groupId).addValue("u", ownerId));
        if (req.memberIds != null) {
            for (Long uid : req.memberIds) {
                if (uid == null) continue;
                jdbc.update("INSERT INTO group_members(group_id,user_id,role) VALUES(:g,:u,'MEMBER') ON CONFLICT DO NOTHING",
                        new MapSqlParameterSource().addValue("g", groupId).addValue("u", uid));
            }
        }
        Map<String,Object> out = new HashMap<>();
        out.put("id", groupId);
        out.put("name", req.name.trim());
        out.put("type", type);
        return ResponseEntity.ok(out);
    }

    // ------- Members management -------
    @PostMapping("/{id}/members")
    @Transactional
    public ResponseEntity<GroupView> addMember(@PathVariable("id") Long groupId,
                                               @RequestBody AddMemberRequest body) {
        if (groupId == null || body == null || body.userId == null) {
            return ResponseEntity.badRequest().build();
        }
        String email = currentEmail();
        MemberChangeRequest req = new MemberChangeRequest();
        req.setUserId(body.userId);
        req.setRole(body.role);
        GroupView view = groupService.addMember(email, groupId, req);
        return ResponseEntity.ok(view);
    }

    // Delete a group - only owner can delete
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteGroup(@PathVariable("id") Long groupId) {
        if (groupId == null) {
            return ResponseEntity.badRequest().build();
        }
        String email = currentEmail();
        groupService.deleteGroup(email, groupId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Group deleted successfully"));
    }

    // Remove a member - only owner or admin (admin can remove MEMBERs only)
    @DeleteMapping("/{id}/members/{userId}")
    @Transactional
    public ResponseEntity<GroupView> removeMember(@PathVariable("id") Long groupId,
                                                  @PathVariable("userId") Long userId) {
        if (groupId == null || userId == null) {
            return ResponseEntity.badRequest().build();
        }
        String email = currentEmail();
        GroupView view = groupService.removeMember(email, groupId, userId);
        return ResponseEntity.ok(view);
    }

    // Update member role (MEMBER <-> ADMIN)
    public static class UpdateRoleRequest {
        public Long userId;
        public String role; // MEMBER or ADMIN
    }

    @PostMapping("/{id}/members/role")
    @Transactional
    public ResponseEntity<GroupView> updateRole(@PathVariable("id") Long groupId,
                                                @RequestBody UpdateRoleRequest body) {
        if (groupId == null || body == null || body.userId == null || body.role == null) {
            return ResponseEntity.badRequest().build();
        }
        String email = currentEmail();
        MemberChangeRequest req = new MemberChangeRequest();
        req.setUserId(body.userId);
        req.setRole(body.role);
        GroupView view = groupService.updateMemberRole(email, groupId, req);
        return ResponseEntity.ok(view);
    }

    // ------- GET endpoints (queries) -------
    @GetMapping
    public ResponseEntity<List<GroupView>> myGroups(
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId,
            @RequestParam(value = "companyId", required = false) Long companyIdParam,
            @RequestParam(value = "company_id", required = false) Long companyIdSnake
    ) {
        String email = currentEmail();
        // Determine company scope - same logic as expenses
        Long coId = companyId != null ? companyId : (companyIdParam != null ? companyIdParam : companyIdSnake);
        Long normalizedCompanyId = (coId != null && coId > 0) ? coId : null;
        
        List<GroupView> list = groupService.myGroups(email, normalizedCompanyId);
        // compute unread counts per group for current user
        try {
            Long userId = jdbc.queryForObject(
                "SELECT id FROM users WHERE lower(email)=:e ORDER BY id ASC LIMIT 1",
                new MapSqlParameterSource().addValue("e", email.toLowerCase()),
                Long.class
            );
            if (userId != null) {
                for (GroupView gv : list) {
                    Long groupId = gv.getId();
                    // Baseline read moment: last_read_at if present else membership created_at
                    java.sql.Timestamp baseline = jdbc.queryForObject(
                        "SELECT COALESCE(\n" +
                        "  (SELECT last_read_at FROM group_reads WHERE group_id=:g AND user_id=:u),\n" +
                        "  (SELECT created_at FROM group_members WHERE group_id=:g AND user_id=:u)\n" +
                        ")",
                        new MapSqlParameterSource().addValue("g", groupId).addValue("u", userId),
                        java.sql.Timestamp.class
                    );
                    Integer unread = jdbc.queryForObject(
                        "SELECT COUNT(1) FROM group_messages WHERE group_id=:g AND created_at > COALESCE(:b, to_timestamp(0)) AND sender_user_id != :u",
                        new MapSqlParameterSource().addValue("g", groupId).addValue("b", baseline).addValue("u", userId),
                        Integer.class
                    );
                    gv.setUnreadCount(unread != null ? unread : 0);
                }
            }
        } catch (Exception ignored) {}
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupView> get(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(groupService.get(email, id));
    }

    @GetMapping("/{id}/ledger")
    public ResponseEntity<GroupLedgerView> ledger(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(groupService.getLedger(email, id));
    }

    @GetMapping("/{id}/defaults")
    public ResponseEntity<GroupDefaultsDto> getDefaults(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(groupService.getDefaults(email, id));
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails) {
            return ((UserDetails) principal).getUsername();
        }
        if (principal instanceof String) {
            String name = (String) principal;
            if (name != null && !name.equalsIgnoreCase("anonymousUser") && !name.isBlank()) {
                return name;
            }
        }
        String name = auth.getName();
        if (name != null && !name.equalsIgnoreCase("anonymousUser") && !name.isBlank()) {
            return name;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unable to determine current user");
    }
}
