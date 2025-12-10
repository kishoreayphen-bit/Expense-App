package com.expenseapp.bill;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "bills")
public class Bill {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String billNumber;
    private Long expenseId;
    
    @Column(nullable = false)
    private Long userId;
    
    private Long companyId;
    
    @Column(nullable = false)
    private String fileName;
    
    @Column(nullable = false)
    private String filePath;
    
    private Long fileSize;
    private String mimeType;
    private Long categoryId;
    private String merchant;
    private BigDecimal amount;
    private String currency;
    private LocalDate billDate;
    
    @Column(nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();
    
    private String notes;
}
