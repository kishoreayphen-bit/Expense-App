package com.expenseapp.expense;

import com.expenseapp.user.User;
import com.expenseapp.group.Group;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "expenses")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Group group;

    @Column(name = "company_id")
    private Long companyId;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "occurred_on", nullable = false)
    private LocalDate occurredOn;

    private String notes;

    private String merchant;

    @Column(name = "is_reimbursable", nullable = false)
    private boolean reimbursable = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "approval_status")
    private String approvalStatus; // PENDING | APPROVED | REJECTED | null

    private String description;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "bill_number")
    private String billNumber;

    @Column(name = "reimbursement_status")
    private String reimbursementStatus; // PENDING | APPROVED | REJECTED | PAID

    @Column(name = "reimbursement_requested_at")
    private Instant reimbursementRequestedAt;

    @Column(name = "reimbursement_approved_at")
    private Instant reimbursementApprovedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reimbursement_approved_by")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User reimbursementApprovedBy;

    @Column(name = "reimbursement_paid_at")
    private Instant reimbursementPaidAt;

    @Column(name = "reimbursement_notes")
    private String reimbursementNotes;

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Group getGroup() { return group; }
    public void setGroup(Group group) { this.group = group; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public LocalDate getOccurredOn() { return occurredOn; }
    public void setOccurredOn(LocalDate occurredOn) { this.occurredOn = occurredOn; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getMerchant() { return merchant; }
    public void setMerchant(String merchant) { this.merchant = merchant; }
    public boolean isReimbursable() { return reimbursable; }
    public void setReimbursable(boolean reimbursable) { this.reimbursable = reimbursable; }
    public Instant getCreatedAt() { return createdAt; }
    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }
    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }
    public Instant getApprovedAt() { return approvedAt; }
    public void setApprovedAt(Instant approvedAt) { this.approvedAt = approvedAt; }
    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }
    public String getBillNumber() { return billNumber; }
    public void setBillNumber(String billNumber) { this.billNumber = billNumber; }
    public String getReimbursementStatus() { return reimbursementStatus; }
    public void setReimbursementStatus(String reimbursementStatus) { this.reimbursementStatus = reimbursementStatus; }
    public Instant getReimbursementRequestedAt() { return reimbursementRequestedAt; }
    public void setReimbursementRequestedAt(Instant reimbursementRequestedAt) { this.reimbursementRequestedAt = reimbursementRequestedAt; }
    public Instant getReimbursementApprovedAt() { return reimbursementApprovedAt; }
    public void setReimbursementApprovedAt(Instant reimbursementApprovedAt) { this.reimbursementApprovedAt = reimbursementApprovedAt; }
    public User getReimbursementApprovedBy() { return reimbursementApprovedBy; }
    public void setReimbursementApprovedBy(User reimbursementApprovedBy) { this.reimbursementApprovedBy = reimbursementApprovedBy; }
    public Instant getReimbursementPaidAt() { return reimbursementPaidAt; }
    public void setReimbursementPaidAt(Instant reimbursementPaidAt) { this.reimbursementPaidAt = reimbursementPaidAt; }
    public String getReimbursementNotes() { return reimbursementNotes; }
    public void setReimbursementNotes(String reimbursementNotes) { this.reimbursementNotes = reimbursementNotes; }
}
