package com.expenseapp.expense.dto;

import java.time.Instant;

public class ReceiptView {
    private Long id;
    private String fileUri;
    private String ocrStatus;
    private Instant createdAt;
    private String extractedJson;

    public ReceiptView(Long id, String fileUri, String ocrStatus, Instant createdAt, String extractedJson) {
        this.id = id; this.fileUri = fileUri; this.ocrStatus = ocrStatus; this.createdAt = createdAt; this.extractedJson = extractedJson;
    }

    public Long getId() { return id; }
    public String getFileUri() { return fileUri; }
    public String getOcrStatus() { return ocrStatus; }
    public Instant getCreatedAt() { return createdAt; }
    public String getExtractedJson() { return extractedJson; }
}
