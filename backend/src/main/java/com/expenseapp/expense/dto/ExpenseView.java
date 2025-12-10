package com.expenseapp.expense.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public class ExpenseView {
    private Long id;
    private BigDecimal amount;
    private String currency;
    private BigDecimal baseAmount;
    private String baseCurrency;
    private LocalDate occurredOn;
    private Long companyId;
    private Long categoryId;
    private String categoryName;
    private String description;
    private String notes;
    private String merchant;
    private boolean reimbursable;
    private Instant createdAt;
    private boolean hasSplitShares;
    private String receiptUrl;
    private String receiptFileName;
    private Long receiptFileSize;
    private String receiptFileType;

    public ExpenseView(Long id, BigDecimal amount, String currency, BigDecimal baseAmount, String baseCurrency, LocalDate occurredOn,
                       Long companyId, Long categoryId, String categoryName, String description, String notes, String merchant,
                       boolean reimbursable, Instant createdAt, boolean hasSplitShares, String receiptUrl, String receiptFileName,
                       Long receiptFileSize, String receiptFileType) {
        this.id = id; this.amount = amount; this.currency = currency; this.baseAmount = baseAmount; this.baseCurrency = baseCurrency; this.occurredOn = occurredOn;
        this.companyId = companyId; this.categoryId = categoryId; this.categoryName = categoryName; this.description = description; this.notes = notes;
        this.merchant = merchant; this.reimbursable = reimbursable; this.createdAt = createdAt; this.hasSplitShares = hasSplitShares;
        this.receiptUrl = receiptUrl; this.receiptFileName = receiptFileName; this.receiptFileSize = receiptFileSize; this.receiptFileType = receiptFileType;
    }

    public Long getId() { return id; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public BigDecimal getBaseAmount() { return baseAmount; }
    public String getBaseCurrency() { return baseCurrency; }
    public LocalDate getOccurredOn() { return occurredOn; }
    public Long getCompanyId() { return companyId; }
    public Long getCategoryId() { return categoryId; }
    public String getCategoryName() { return categoryName; }
    public String getNotes() { return notes; }
    public String getMerchant() { return merchant; }
    public boolean isReimbursable() { return reimbursable; }
    public Instant getCreatedAt() { return createdAt; }
    public String getDescription() { return description; }
    public boolean isHasSplitShares() { return hasSplitShares; }
    public String getReceiptUrl() { return receiptUrl; }
    public String getReceiptFileName() { return receiptFileName; }
    public Long getReceiptFileSize() { return receiptFileSize; }
    public String getReceiptFileType() { return receiptFileType; }
}
