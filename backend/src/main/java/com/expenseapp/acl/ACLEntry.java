package com.expenseapp.acl;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "acl_entries", uniqueConstraints = @UniqueConstraint(columnNames = {"resource_type","resource_id","principal_type","principal_id","permission"}))
public class ACLEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "resource_type", nullable = false, length = 20)
    private String resourceType; // EXPENSE | RECEIPT

    @Column(name = "resource_id", nullable = false)
    private Long resourceId;

    @Column(name = "principal_type", nullable = false, length = 20)
    private String principalType; // USER | GROUP

    @Column(name = "principal_id", nullable = false)
    private Long principalId;

    @Column(name = "permission", nullable = false, length = 10)
    private String permission; // READ | WRITE

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "created_by")
    private Long createdBy;

    public Long getId() { return id; }
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
    public Instant getCreatedAt() { return createdAt; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
}
