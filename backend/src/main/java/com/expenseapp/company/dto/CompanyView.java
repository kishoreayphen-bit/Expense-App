package com.expenseapp.company.dto;

import java.time.Instant;

public class CompanyView {
    private Long id;
    private String companyName;
    private String userRole;
    private String status;
    private Instant joinedAt;
    
    public CompanyView() {}
    
    public CompanyView(Long id, String companyName, String userRole, String status, Instant joinedAt) {
        this.id = id;
        this.companyName = companyName;
        this.userRole = userRole;
        this.status = status;
        this.joinedAt = joinedAt;
    }
    
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getCompanyName() {
        return companyName;
    }
    
    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }
    
    public String getUserRole() {
        return userRole;
    }
    
    public void setUserRole(String userRole) {
        this.userRole = userRole;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public Instant getJoinedAt() {
        return joinedAt;
    }
    
    public void setJoinedAt(Instant joinedAt) {
        this.joinedAt = joinedAt;
    }
}
