package com.expenseapp.admin.dto;

import jakarta.validation.constraints.NotBlank;

public class RoleUpdateRequest {
    @NotBlank
    private String role; // USER or ADMIN

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
