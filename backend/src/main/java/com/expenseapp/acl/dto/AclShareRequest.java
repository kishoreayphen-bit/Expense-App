package com.expenseapp.acl.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AclShareRequest {
    @NotBlank
    private String resourceType; // EXPENSE | RECEIPT
    @NotNull
    private Long resourceId;
    @NotBlank
    private String principalType; // USER | GROUP
    @NotNull
    private Long principalId;
    @NotBlank
    private String permission; // READ | WRITE

    public String getResourceType() { return resourceType; }
    public void setResourceType(String resourceType) { this.resourceType = resourceType; }
    public Long getResourceId() { return resourceId; }
    public void setResourceId(Long resourceId) { this.resourceId = resourceId; }
    public String getPrincipalType() { return principalType; }
    public void setPrincipalType(String principalType) { this.principalType = principalType; }
    public Long getPrincipalId() { return principalId; }
    public void setPrincipalId(Long principalId) { this.principalId = principalId; }
    public String getPermission() { return permission; }
    public void setPermission(String permission) { this.permission = permission; }
}
