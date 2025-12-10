package com.expenseapp.budget;

import com.expenseapp.expense.Category;
import com.expenseapp.group.Group;
import com.expenseapp.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "budgets")
public class Budget {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user; // nullable if group budget

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private Group group; // nullable if personal budget

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category; // nullable means all categories

    @Column(name = "company_id")
    private Long companyId; // null = personal, non-null = company

    @Column(nullable = false, length = 7)
    private String period; // YYYY-MM

    @Column(nullable = false)
    private java.math.BigDecimal amount;

    @Column(nullable = false)
    private boolean alert80 = true;

    @Column(nullable = false)
    private boolean alert100 = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Group getGroup() { return group; }
    public void setGroup(Group group) { this.group = group; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public java.math.BigDecimal getAmount() { return amount; }
    public void setAmount(java.math.BigDecimal amount) { this.amount = amount; }
    public boolean isAlert80() { return alert80; }
    public void setAlert80(boolean alert80) { this.alert80 = alert80; }
    public boolean isAlert100() { return alert100; }
    public void setAlert100(boolean alert100) { this.alert100 = alert100; }
    public Instant getCreatedAt() { return createdAt; }
    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }
}
