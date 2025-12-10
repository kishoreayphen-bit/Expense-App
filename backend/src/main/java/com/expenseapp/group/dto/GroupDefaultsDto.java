package com.expenseapp.group.dto;

public class GroupDefaultsDto {
    private String defaultType; // EQUAL | RATIO | PERCENTAGE
    private String ratiosJson; // raw JSON string
    private String percentagesJson; // raw JSON string

    public GroupDefaultsDto() {}
    public GroupDefaultsDto(String defaultType, String ratiosJson, String percentagesJson) {
        this.defaultType = defaultType; this.ratiosJson = ratiosJson; this.percentagesJson = percentagesJson;
    }
    public String getDefaultType() { return defaultType; }
    public void setDefaultType(String defaultType) { this.defaultType = defaultType; }
    public String getRatiosJson() { return ratiosJson; }
    public void setRatiosJson(String ratiosJson) { this.ratiosJson = ratiosJson; }
    public String getPercentagesJson() { return percentagesJson; }
    public void setPercentagesJson(String percentagesJson) { this.percentagesJson = percentagesJson; }
}
