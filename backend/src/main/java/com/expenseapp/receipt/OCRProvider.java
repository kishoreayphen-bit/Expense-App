package com.expenseapp.receipt;

public interface OCRProvider {
    void processAsync(Long jobId);
}
