package com.expenseapp.group.dto;

import jakarta.validation.constraints.NotBlank;

public class GroupCreateRequest {
    @NotBlank
    private String name;
    private String type; // EVENT | TRIP | TEAM etc.

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
