package com.expenseapp.receipt.dto;

import jakarta.validation.constraints.NotBlank;

public class ReceiptPageCreateRequest {
    @NotBlank
    private String fileName;
    private String contentType;
    private Long fileSize;

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
}
