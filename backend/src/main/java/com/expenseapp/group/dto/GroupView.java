package com.expenseapp.group.dto;

import java.time.Instant;
import java.util.List;

public class GroupView {
    private Long id;
    private String name;
    private String type;
    private boolean archived;
    private Instant createdAt;
    private List<MemberView> members;
    private Integer unreadCount; // per-current-user; optional

    public GroupView(Long id, String name, String type, boolean archived, Instant createdAt, List<MemberView> members) {
        this.id = id; this.name = name; this.type = type; this.archived = archived; this.createdAt = createdAt; this.members = members;
        this.unreadCount = null;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getType() { return type; }
    public boolean isArchived() { return archived; }
    public Instant getCreatedAt() { return createdAt; }
    public List<MemberView> getMembers() { return members; }
    public Integer getUnreadCount() { return unreadCount; }
    public void setUnreadCount(Integer unreadCount) { this.unreadCount = unreadCount; }

    public static class MemberView {
        private Long userId;
        private Long id; // Alias for userId for mobile compatibility
        private String role;
        private String name;
        private String email;
        
        public MemberView(Long userId, String role, String name, String email) { 
            this.userId = userId;
            this.id = userId; // Set both for compatibility
            this.role = role;
            this.name = name;
            this.email = email;
        }
        
        public Long getUserId() { return userId; }
        public Long getId() { return id; }
        public String getRole() { return role; }
        public String getName() { return name; }
        public String getEmail() { return email; }
    }
}
