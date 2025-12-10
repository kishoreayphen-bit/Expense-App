package com.expenseapp.settlement;

import com.expenseapp.user.User;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "settlement_reminders")
public class SettlementReminder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // requester

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "counterparty_id", nullable = false)
    private User counterparty;

    @Column(name = "min_amount", precision = 14, scale = 2)
    private BigDecimal minAmount;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "channel")
    private String channel = "IN_APP";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public User getCounterparty() { return counterparty; }
    public void setCounterparty(User counterparty) { this.counterparty = counterparty; }
    public BigDecimal getMinAmount() { return minAmount; }
    public void setMinAmount(BigDecimal minAmount) { this.minAmount = minAmount; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public Instant getCreatedAt() { return createdAt; }
}
