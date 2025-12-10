package com.expenseapp.budget;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "company_budgets")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyBudget {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "company_id", nullable = false)
    private Long companyId;
    
    @Column(name = "period_type", nullable = false, length = 20)
    private String periodType; // MONTHLY, YEARLY, QUARTERLY, CUSTOM
    
    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;
    
    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;
    
    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;
    
    @Column(name = "spent_amount", precision = 15, scale = 2)
    private BigDecimal spentAmount = BigDecimal.ZERO;
    
    @Column(name = "currency", length = 3)
    private String currency = "USD";
    
    @Column(name = "alert_threshold_percent")
    private Integer alertThresholdPercent = 80;
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    @Column(name = "created_by")
    private Long createdBy;
    
    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
    
    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();
    
    /**
     * Calculate percentage of budget spent
     */
    public int getSpentPercentage() {
        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) == 0) {
            return 0;
        }
        if (spentAmount == null) {
            return 0;
        }
        return spentAmount.multiply(BigDecimal.valueOf(100))
                .divide(totalAmount, 0, java.math.RoundingMode.HALF_UP)
                .intValue();
    }
    
    /**
     * Calculate remaining budget
     */
    public BigDecimal getRemainingAmount() {
        if (totalAmount == null) {
            return BigDecimal.ZERO;
        }
        if (spentAmount == null) {
            return totalAmount;
        }
        return totalAmount.subtract(spentAmount);
    }
    
    /**
     * Check if budget is exceeded
     */
    public boolean isExceeded() {
        return getSpentPercentage() >= 100;
    }
    
    /**
     * Check if alert threshold is reached
     */
    public boolean isAlertThresholdReached() {
        return getSpentPercentage() >= alertThresholdPercent;
    }
}
