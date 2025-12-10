package com.expenseapp.split.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;

public class SplitRequest {
    @NotBlank
    private String type; // EQUAL | RATIO | PERCENTAGE

    @NotNull @Positive
    private BigDecimal totalAmount;

    // Optional: native currency of the total and the date for FX conversion
    private String currency; // e.g., "USD"; if null, assume base currency
    private java.time.LocalDate occurredOn; // date of expense for FX rate

    @NotNull
    private List<Participant> participants;

    public static class Participant {
        @NotNull
        private Long userId;
        private BigDecimal ratio; // for RATIO
        private BigDecimal percentage; // for PERCENTAGE (0-100)
        private Boolean excluded; // if true, excluded from base distribution
        private BigDecimal fixedAmount; // allocate this amount first (optional)
        private BigDecimal capAmount;   // maximum amount this participant can be allocated (optional)

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public BigDecimal getRatio() { return ratio; }
        public void setRatio(BigDecimal ratio) { this.ratio = ratio; }
        public BigDecimal getPercentage() { return percentage; }
        public void setPercentage(BigDecimal percentage) { this.percentage = percentage; }
        public Boolean getExcluded() { return excluded; }
        public void setExcluded(Boolean excluded) { this.excluded = excluded; }
        public BigDecimal getFixedAmount() { return fixedAmount; }
        public void setFixedAmount(BigDecimal fixedAmount) { this.fixedAmount = fixedAmount; }
        public BigDecimal getCapAmount() { return capAmount; }
        public void setCapAmount(BigDecimal capAmount) { this.capAmount = capAmount; }
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public List<Participant> getParticipants() { return participants; }
    public void setParticipants(List<Participant> participants) { this.participants = participants; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public java.time.LocalDate getOccurredOn() { return occurredOn; }
    public void setOccurredOn(java.time.LocalDate occurredOn) { this.occurredOn = occurredOn; }
}
