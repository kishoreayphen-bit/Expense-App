package com.expenseapp.group.dto;

import jakarta.validation.constraints.NotNull;

public class MemberChangeRequest {
    @NotNull
    private Long userId;
    private String role; // OWNER | MEMBER (optional)

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
