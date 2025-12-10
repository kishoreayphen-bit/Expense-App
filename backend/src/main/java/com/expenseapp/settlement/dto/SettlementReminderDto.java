package com.expenseapp.settlement.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class SettlementReminderDto {
    private Long id;
    private Long counterpartyId;
    private BigDecimal minAmount;
    private LocalDate dueDate;
    private String channel;

    public SettlementReminderDto() {}
    public SettlementReminderDto(Long id, Long counterpartyId, BigDecimal minAmount, LocalDate dueDate, String channel) {
        this.id = id; this.counterpartyId = counterpartyId; this.minAmount = minAmount; this.dueDate = dueDate; this.channel = channel;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCounterpartyId() { return counterpartyId; }
    public void setCounterpartyId(Long counterpartyId) { this.counterpartyId = counterpartyId; }
    public BigDecimal getMinAmount() { return minAmount; }
    public void setMinAmount(BigDecimal minAmount) { this.minAmount = minAmount; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
}
