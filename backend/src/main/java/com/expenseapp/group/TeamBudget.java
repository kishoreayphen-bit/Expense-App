package com.expenseapp.group;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "team_budget_tracking")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamBudget {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "group_id", nullable = false)
    private Long groupId;
    
    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;
    
    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;
    
    @Column(name = "allocated_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal allocatedAmount;
    
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
        if (allocatedAmount == null || allocatedAmount.compareTo(BigDecimal.ZERO) == 0) {
            return 0;
        }
        if (spentAmount == null) {
            return 0;
        }
        return spentAmount.multiply(BigDecimal.valueOf(100))
                .divide(allocatedAmount, 0, java.math.RoundingMode.HALF_UP)
                .intValue();
    }
    
    /**
     * Calculate remaining budget
     */
    public BigDecimal getRemainingAmount() {
        if (allocatedAmount == null) {
            return BigDecimal.ZERO;
        }
        if (spentAmount == null) {
            return allocatedAmount;
        }
        return allocatedAmount.subtract(spentAmount);
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
