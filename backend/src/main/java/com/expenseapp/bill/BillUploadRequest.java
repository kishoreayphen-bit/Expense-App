package com.expenseapp.bill;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BillUploadRequest {
    private String billNumber;
    private Long expenseId;
    private Long categoryId;
    private String merchant;
    private BigDecimal amount;
    private String currency;
    private LocalDate billDate;
    private String notes;
}
