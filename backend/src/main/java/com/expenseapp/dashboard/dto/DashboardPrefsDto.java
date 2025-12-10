package com.expenseapp.dashboard.dto;

public class DashboardPrefsDto {
    private String period;
    private String collapsedWidgets;

    public DashboardPrefsDto() {}
    public DashboardPrefsDto(String period, String collapsedWidgets) {
        this.period = period; this.collapsedWidgets = collapsedWidgets;
    }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public String getCollapsedWidgets() { return collapsedWidgets; }
    public void setCollapsedWidgets(String collapsedWidgets) { this.collapsedWidgets = collapsedWidgets; }
}
