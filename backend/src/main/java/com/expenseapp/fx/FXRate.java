package com.expenseapp.fx;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "fx_rates", uniqueConstraints = @UniqueConstraint(columnNames = {"rate_date", "currency"}))
public class FXRate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rate_date", nullable = false)
    private LocalDate rateDate;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "rate_to_base", nullable = false, precision = 18, scale = 8)
    private BigDecimal rateToBase;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public LocalDate getRateDate() { return rateDate; }
    public void setRateDate(LocalDate rateDate) { this.rateDate = rateDate; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public BigDecimal getRateToBase() { return rateToBase; }
    public void setRateToBase(BigDecimal rateToBase) { this.rateToBase = rateToBase; }
    public Instant getCreatedAt() { return createdAt; }
}
