package com.expenseapp.expense;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "expense_viewers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseViewer {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "expense_id", nullable = false)
    private Long expenseId;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "can_view")
    private Boolean canView = true;
    
    @Column(name = "can_approve")
    private Boolean canApprove = false;
    
    @Column(name = "granted_by")
    private Long grantedBy;
    
    @Column(name = "granted_at")
    private Instant grantedAt = Instant.now();
    
    public ExpenseViewer(Long expenseId, Long userId, Boolean canView, Boolean canApprove, Long grantedBy) {
        this.expenseId = expenseId;
        this.userId = userId;
        this.canView = canView;
        this.canApprove = canApprove;
        this.grantedBy = grantedBy;
        this.grantedAt = Instant.now();
    }
}
