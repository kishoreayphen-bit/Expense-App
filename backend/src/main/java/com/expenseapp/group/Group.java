package com.expenseapp.group;

import com.expenseapp.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "groups")
public class Group {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type = "EVENT";

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_lead_id")
    private User teamLead;

    @Column(name = "company_id")
    private Long companyId;

    @Column(nullable = false)
    private boolean archived = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
    
    @Column(name = "budget_amount", precision = 15, scale = 2)
    private java.math.BigDecimal budgetAmount;
    
    @Column(name = "budget_period_start")
    private java.time.LocalDate budgetPeriodStart;
    
    @Column(name = "budget_period_end")
    private java.time.LocalDate budgetPeriodEnd;
    
    @Column(name = "budget_currency", length = 3)
    private String budgetCurrency = "USD";

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }
    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
    public Instant getCreatedAt() { return createdAt; }
    public User getTeamLead() { return teamLead; }
    public void setTeamLead(User teamLead) { this.teamLead = teamLead; }
    public java.math.BigDecimal getBudgetAmount() { return budgetAmount; }
    public void setBudgetAmount(java.math.BigDecimal budgetAmount) { this.budgetAmount = budgetAmount; }
    public java.time.LocalDate getBudgetPeriodStart() { return budgetPeriodStart; }
    public void setBudgetPeriodStart(java.time.LocalDate budgetPeriodStart) { this.budgetPeriodStart = budgetPeriodStart; }
    public java.time.LocalDate getBudgetPeriodEnd() { return budgetPeriodEnd; }
    public void setBudgetPeriodEnd(java.time.LocalDate budgetPeriodEnd) { this.budgetPeriodEnd = budgetPeriodEnd; }
    public String getBudgetCurrency() { return budgetCurrency; }
    public void setBudgetCurrency(String budgetCurrency) { this.budgetCurrency = budgetCurrency; }
}
