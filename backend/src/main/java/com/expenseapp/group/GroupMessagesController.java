package com.expenseapp.group;

import com.expenseapp.notification.NotificationPublisher;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/groups/{groupId}/messages")
public class GroupMessagesController {

    private final NamedParameterJdbcTemplate jdbc;
    private final NotificationPublisher notificationPublisher;

    public GroupMessagesController(NamedParameterJdbcTemplate jdbc, NotificationPublisher notificationPublisher) {
        this.jdbc = jdbc;
        this.notificationPublisher = notificationPublisher;
    }

    public static class MessageBody {
        public String type; // text | split
        public String text;
        public SplitBody split;
    }
    public static class SplitBody {
        public String title;
        public Double totalAmount;
        public String currency;
        public List<Long> involvedUserIds;
        public List<ShareBody> shares; // optional
    }
    public static class ShareBody {
        public Long userId;
        public Double amount;
    }

    @GetMapping
    public ResponseEntity<List<Map<String,Object>>> list(@PathVariable("groupId") Long groupId) {
        String email = currentEmail();
        // Optional: ensure requester is member of group
        if (!isGroupMember(email, groupId)) {
            return ResponseEntity.status(403).build();
        }
        String sql = "SELECT id, group_id, sender_user_id, type, text, split_title, split_total_amount, split_currency, split_involved_ids, created_at FROM group_messages WHERE group_id=:g ORDER BY created_at ASC, id ASC";
        List<Map<String, Object>> rows = jdbc.queryForList(sql, new MapSqlParameterSource().addValue("g", groupId));
        List<Map<String,Object>> out = new ArrayList<>();
        for (Map<String,Object> r : rows) {
            out.add(toDto(r));
        }
        return ResponseEntity.ok(out);
    }

    @PostMapping
    public ResponseEntity<Map<String,Object>> create(@PathVariable("groupId") Long groupId,
                                                     @RequestBody MessageBody body) {
        String email = currentEmail();
        Long senderId = ensureUser(email);
        if (senderId == null) return ResponseEntity.status(401).build();
        if (!isGroupMember(email, groupId)) {
            // auto-add sender as MEMBER if not present
            try {
                jdbc.update("INSERT INTO group_members(group_id,user_id,role) VALUES(:g,:u,'MEMBER') ON CONFLICT DO NOTHING",
                        new MapSqlParameterSource().addValue("g", groupId).addValue("u", senderId));
            } catch (Exception ignored) {}
        }
        String type = (body != null && body.type != null) ? body.type.trim().toLowerCase() : "text";
        String text = (body != null) ? body.text : null;
        String splitTitle = null;
        Double splitAmount = null;
        String splitCurrency = null;
        String involvedCsv = null;
        if ("split".equals(type) && body != null && body.split != null) {
            splitTitle = (body.split.title == null || body.split.title.isBlank()) ? "Untitled" : body.split.title.trim();
            splitAmount = body.split.totalAmount != null ? body.split.totalAmount : 0.0;
            splitCurrency = (body.split.currency == null || body.split.currency.isBlank()) ? "INR" : body.split.currency.trim();
            List<Long> ids = (body.split.involvedUserIds != null) ? body.split.involvedUserIds.stream().filter(Objects::nonNull).filter(x -> x > 0).collect(Collectors.toList()) : List.of();
            involvedCsv = ids.stream().map(String::valueOf).collect(Collectors.joining(","));
        }
        Long id = jdbc.queryForObject(
                "INSERT INTO group_messages(group_id, sender_user_id, type, text, split_title, split_total_amount, split_currency, split_involved_ids, created_at) " +
                        "VALUES(:g,:u,:t,:txt,:st,:sa,:sc,:ids,:ts) RETURNING id",
                new MapSqlParameterSource()
                        .addValue("g", groupId)
                        .addValue("u", senderId)
                        .addValue("t", type)
                        .addValue("txt", text)
                        .addValue("st", splitTitle)
                        .addValue("sa", splitAmount)
                        .addValue("sc", splitCurrency)
                        .addValue("ids", involvedCsv)
                        .addValue("ts", Timestamp.from(Instant.now())),
                Long.class
        );
        Map<String,Object> row = jdbc.queryForMap("SELECT id, group_id, sender_user_id, type, text, split_title, split_total_amount, split_currency, split_involved_ids, created_at FROM group_messages WHERE id=:id",
                new MapSqlParameterSource().addValue("id", id));
        Map<String, Object> dto = toDto(row);
        // Mark sender as read up to this message
        try {
            jdbc.update(
                "INSERT INTO group_reads(group_id,user_id,last_read_message_id,last_read_at) VALUES(:g,:u,:m, NOW()) " +
                "ON CONFLICT (group_id, user_id) DO UPDATE SET last_read_message_id=GREATEST(group_reads.last_read_message_id, EXCLUDED.last_read_message_id), last_read_at=NOW()",
                new MapSqlParameterSource().addValue("g", groupId).addValue("u", senderId).addValue("m", id)
            );
        } catch (Exception ignored) {}
        
        // Send notifications for split creation
        if ("split".equals(type) && body != null && body.split != null) {
            String groupName = getGroupName(groupId);
            String senderName = getSenderName(senderId);
            List<Long> involvedIds = (body.split.involvedUserIds != null) 
                ? body.split.involvedUserIds.stream().filter(Objects::nonNull).filter(x -> x > 0).collect(Collectors.toList()) 
                : List.of();
            
            // Get all group members
            List<Long> allMemberIds = jdbc.query(
                "SELECT DISTINCT user_id FROM group_members WHERE group_id=:g UNION SELECT owner_id FROM groups WHERE id=:g",
                new MapSqlParameterSource().addValue("g", groupId),
                (rs, i) -> rs.getLong("user_id")
            );
            
            // Notify all group members
            for (Long memberId : allMemberIds) {
                if (memberId.equals(senderId)) continue; // Don't notify sender
                
                boolean isInvolved = involvedIds.contains(memberId);
                String dataJson = String.format(
                    "{\"groupId\":%d,\"splitId\":%d,\"isInvolved\":%b,\"groupName\":\"%s\",\"splitTitle\":\"%s\"}",
                    groupId, id, isInvolved,
                    groupName.replace("\"", "\\\""),
                    (splitTitle != null ? splitTitle : "Untitled").replace("\"", "\\\"")
                );
                
                String notifTitle = isInvolved ? "New Split" : "Group Activity";
                String notifBody = isInvolved 
                    ? String.format("%s created a split '%s' in %s", senderName, splitTitle, groupName)
                    : String.format("New split '%s' in %s", splitTitle, groupName);
                
                notificationPublisher.publish(memberId, "SPLIT_CREATED", notifTitle, notifBody, dataJson);
            }
        }
        
        return ResponseEntity.ok(dto);
    }

    public static class ReadBody { public Long messageId; }

    @PostMapping("/read")
    public ResponseEntity<Map<String,Object>> markRead(@PathVariable("groupId") Long groupId,
                                                       @RequestBody(required = false) ReadBody body) {
        String email = currentEmail();
        if (!isGroupMember(email, groupId)) return ResponseEntity.status(403).body(Map.of("error","Not a group member"));
        Long userId = ensureUser(email);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error","Unauthorized"));
        Long targetMessageId = body != null && body.messageId != null ? body.messageId : null;
        if (targetMessageId == null) {
            try {
                targetMessageId = jdbc.queryForObject("SELECT COALESCE(MAX(id),0) FROM group_messages WHERE group_id=:g", new MapSqlParameterSource().addValue("g", groupId), Long.class);
            } catch (Exception e) { targetMessageId = 0L; }
        }
        try {
            jdbc.update(
                "INSERT INTO group_reads(group_id,user_id,last_read_message_id,last_read_at) VALUES(:g,:u,:m, NOW()) " +
                "ON CONFLICT (group_id, user_id) DO UPDATE SET last_read_message_id=GREATEST(group_reads.last_read_message_id, EXCLUDED.last_read_message_id), last_read_at=NOW()",
                new MapSqlParameterSource().addValue("g", groupId).addValue("u", userId).addValue("m", targetMessageId)
            );
        } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of("groupId", groupId, "lastReadMessageId", targetMessageId));
    }

    @GetMapping("/{messageId}/seen")
    public ResponseEntity<List<Map<String,Object>>> seenBy(@PathVariable("groupId") Long groupId,
                                                           @PathVariable("messageId") Long messageId) {
        String email = currentEmail();
        if (!isGroupMember(email, groupId)) return ResponseEntity.status(403).build();
        // Users in the group whose last_read_message_id >= messageId
        String sql = "SELECT u.id, COALESCE(u.name,u.email, CONCAT('User #', u.id)) AS name, COALESCE(u.email,'') AS email " +
                     "FROM group_members gm JOIN users u ON u.id=gm.user_id " +
                     "LEFT JOIN group_reads gr ON gr.group_id=gm.group_id AND gr.user_id=gm.user_id " +
                     "WHERE gm.group_id=:g AND COALESCE(gr.last_read_message_id,0) >= :m";
        List<Map<String,Object>> out = jdbc.query(sql,
            new MapSqlParameterSource().addValue("g", groupId).addValue("m", messageId),
            (rs, i) -> {
                Map<String,Object> m = new HashMap<>();
                m.put("id", rs.getLong("id"));
                m.put("name", rs.getString("name"));
                m.put("email", rs.getString("email"));
                return m;
            }
        );
        return ResponseEntity.ok(out);
    }

    private Map<String,Object> toDto(Map<String,Object> r) {
        Map<String,Object> dto = new LinkedHashMap<>();
        Long groupId = asLong(r.get("group_id"));
        Long id = asLong(r.get("id"));
        Long senderUserId = asLong(r.get("sender_user_id"));
        String type = asString(r.get("type"));
        String text = asString(r.get("text"));
        String st = asString(r.get("split_title"));
        Double sa = asDouble(r.get("split_total_amount"));
        String sc = asString(r.get("split_currency"));
        String ids = asString(r.get("split_involved_ids"));
        Object created = r.get("created_at");
        dto.put("id", String.valueOf(id));
        dto.put("groupId", groupId);
        dto.put("createdAt", created != null ? created.toString() : Instant.now().toString());
        // sender summary
        Map<String,Object> sender = jdbc.queryForObject(
                "SELECT id, COALESCE(name, email, CONCAT('User #', id)) AS name, COALESCE(email,'') AS email FROM users WHERE id=:id",
                new MapSqlParameterSource().addValue("id", senderUserId),
                (rs, i) -> {
                    Map<String,Object> m = new HashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("name", rs.getString("name"));
                    m.put("email", rs.getString("email"));
                    return m;
                }
        );
        dto.put("sender", sender);
        dto.put("type", type);
        if ("text".equals(type)) {
            dto.put("text", text != null ? text : "");
        } else if ("split".equals(type)) {
            Map<String,Object> split = new LinkedHashMap<>();
            split.put("id", id);
            split.put("title", st != null ? st : "Untitled");
            split.put("totalAmount", sa != null ? sa : 0.0);
            split.put("currency", sc != null ? sc : "INR");
            List<Long> involved = (ids == null || ids.isBlank()) ? List.of() : Arrays.stream(ids.split(",")).map(String::trim).filter(s -> !s.isBlank()).map(Long::parseLong).collect(Collectors.toList());
            split.put("involvedUserIds", involved);
            dto.put("split", split);
        }
        return dto;
    }

    private boolean isGroupMember(String email, Long groupId) {
        String norm = email == null ? null : email.trim().toLowerCase();
        if (norm == null || norm.isBlank()) return false;

        // 1) Check by email via join to avoid problems with duplicate user rows
        Long ce = jdbc.queryForObject(
                "SELECT COUNT(1) FROM group_members gm JOIN users u ON u.id=gm.user_id WHERE gm.group_id=:g AND lower(u.email)=:e",
                new MapSqlParameterSource().addValue("g", groupId).addValue("e", norm), Long.class);
        if (ce != null && ce > 0) return true;

        // also owner by email
        Long coe = jdbc.queryForObject(
                "SELECT COUNT(1) FROM groups gr JOIN users u ON gr.owner_id=u.id WHERE gr.id=:g AND lower(u.email)=:e",
                new MapSqlParameterSource().addValue("g", groupId).addValue("e", norm), Long.class);
        if (coe != null && coe > 0) return true;

        // 2) Fallback: resolve UID and check by ID
        Long uid = ensureUser(norm);
        if (uid == null) return false;
        Long c = jdbc.queryForObject("SELECT COUNT(1) FROM group_members WHERE group_id=:g AND user_id=:u",
                new MapSqlParameterSource().addValue("g", groupId).addValue("u", uid), Long.class);
        if (c != null && c > 0) return true;
        // also owner by id
        Long co = jdbc.queryForObject("SELECT COUNT(1) FROM groups WHERE id=:g AND owner_id=:u",
                new MapSqlParameterSource().addValue("g", groupId).addValue("u", uid), Long.class);
        return co != null && co > 0;
    }

    private Long ensureUser(String email) {
        String norm = email == null ? null : email.trim().toLowerCase();
        if (norm == null || norm.isBlank()) return null;
        List<Long> ids = jdbc.query("SELECT id FROM users WHERE lower(email)=:e ORDER BY id ASC LIMIT 1",
                new MapSqlParameterSource().addValue("e", norm), (rs, i) -> rs.getLong("id"));
        if (!ids.isEmpty()) return ids.get(0);
        jdbc.update("INSERT INTO users(name,email,role,enabled) VALUES(:n,:e,'USER',true)", new MapSqlParameterSource().addValue("n", norm).addValue("e", norm));
        ids = jdbc.query("SELECT id FROM users WHERE lower(email)=:e ORDER BY id ASC LIMIT 1",
                new MapSqlParameterSource().addValue("e", norm), (rs, i) -> rs.getLong("id"));
        return ids.isEmpty() ? null : ids.get(0);
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Object principal = auth != null ? auth.getPrincipal() : null;
        if (principal instanceof UserDetails) {
            String u = ((UserDetails) principal).getUsername();
            return u != null ? u.toLowerCase() : null;
        }
        if (principal instanceof String) {
            String name = (String) principal;
            if (name != null && !name.equalsIgnoreCase("anonymousUser") && !name.isBlank()) {
                return name.toLowerCase();
            }
        }
        String n = auth != null ? auth.getName() : null;
        return n != null ? n.toLowerCase() : null;
    }

    private String getGroupName(Long groupId) {
        try {
            return jdbc.queryForObject(
                "SELECT name FROM groups WHERE id=:id",
                new MapSqlParameterSource().addValue("id", groupId),
                String.class
            );
        } catch (Exception e) {
            return "Group #" + groupId;
        }
    }
    
    private String getSenderName(Long userId) {
        try {
            return jdbc.queryForObject(
                "SELECT COALESCE(name, email, CONCAT('User #', id)) FROM users WHERE id=:id",
                new MapSqlParameterSource().addValue("id", userId),
                String.class
            );
        } catch (Exception e) {
            return "User #" + userId;
        }
    }

    @PostMapping("/{messageId}/remind")
    public ResponseEntity<Map<String, Object>> sendReminder(
            @PathVariable("groupId") Long groupId,
            @PathVariable("messageId") Long messageId) {
        String email = currentEmail();
        if (!isGroupMember(email, groupId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Not a group member"));
        }
        
        Long senderId = ensureUser(email);
        
        // Fetch the split message details
        String query = "SELECT id, type, split_title, split_total_amount, split_currency, split_involved_ids, sender_user_id " +
                       "FROM group_messages WHERE id=:msgId AND group_id=:gid AND type='split'";
        List<Map<String, Object>> results = jdbc.query(query,
                new MapSqlParameterSource()
                    .addValue("msgId", messageId)
                    .addValue("gid", groupId),
                (rs, i) -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("type", rs.getString("type"));
                    m.put("split_title", rs.getString("split_title"));
                    m.put("split_total_amount", rs.getDouble("split_total_amount"));
                    m.put("split_currency", rs.getString("split_currency"));
                    m.put("split_involved_ids", rs.getString("split_involved_ids"));
                    m.put("sender_user_id", rs.getLong("sender_user_id"));
                    return m;
                });
        
        if (results.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Split not found"));
        }
        
        Map<String, Object> split = results.get(0);
        String splitTitle = asString(split.get("split_title"));
        Double totalAmount = asDouble(split.get("split_total_amount"));
        String currency = asString(split.get("split_currency"));
        String involvedIdsStr = asString(split.get("split_involved_ids"));
        
        // Parse involved user IDs
        List<Long> involvedIds = new ArrayList<>();
        if (involvedIdsStr != null && !involvedIdsStr.isBlank()) {
            involvedIds = Arrays.stream(involvedIdsStr.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .map(Long::parseLong)
                    .collect(Collectors.toList());
        }
        
        // Get group and sender names
        String groupName = getGroupName(groupId);
        String senderName = getSenderName(senderId);
        
        // Send reminder notifications to all involved users except the sender
        int notificationsSent = 0;
        for (Long userId : involvedIds) {
            if (userId.equals(senderId)) continue; // Don't remind yourself
            
            String dataJson = String.format(
                "{\"groupId\":%d,\"splitId\":%d,\"groupName\":\"%s\",\"splitTitle\":\"%s\"}",
                groupId, messageId,
                groupName.replace("\"", "\\\""),
                (splitTitle != null ? splitTitle : "Untitled").replace("\"", "\\\"")
            );
            
            notificationPublisher.publish(
                userId,
                "SPLIT_REMINDER",
                "Payment Reminder",
                String.format("%s sent a reminder for '%s' (%.2f %s) in %s", 
                    senderName, splitTitle, totalAmount, currency, groupName),
                dataJson
            );
            notificationsSent++;
        }
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "notificationsSent", notificationsSent,
            "message", "Reminder sent to " + notificationsSent + " user(s)"
        ));
    }

    private static Long asLong(Object o) { return (o instanceof Number) ? ((Number)o).longValue() : (o != null ? Long.parseLong(String.valueOf(o)) : null); }
    private static String asString(Object o) { return o != null ? String.valueOf(o) : null; }
    private static Double asDouble(Object o) { return (o instanceof Number) ? ((Number)o).doubleValue() : (o != null ? Double.parseDouble(String.valueOf(o)) : null); }
}
