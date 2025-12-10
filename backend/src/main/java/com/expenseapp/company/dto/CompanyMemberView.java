package com.expenseapp.company.dto;

import java.time.Instant;

public class CompanyMemberView {
    private Long id;
    private Long companyId;
    private String companyName;
    private Long userId;
    private String userEmail;
    private String userName;
    private String role;
    private String status;
    private Instant joinedAt;
    private Instant invitedAt;

    // Constructors
    public CompanyMemberView() {}

    public CompanyMemberView(Long id, Long companyId, String companyName, Long userId, 
                            String userEmail, String userName, String role, String status,
                            Instant joinedAt, Instant invitedAt) {
        this.id = id;
        this.companyId = companyId;
        this.companyName = companyName;
        this.userId = userId;
        this.userEmail = userEmail;
        this.userName = userName;
        this.role = role;
        this.status = status;
        this.joinedAt = joinedAt;
        this.invitedAt = invitedAt;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }

    public Instant getInvitedAt() { return invitedAt; }
    public void setInvitedAt(Instant invitedAt) { this.invitedAt = invitedAt; }
}
