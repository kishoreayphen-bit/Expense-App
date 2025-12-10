package com.expenseapp.group;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "group_defaults")
public class GroupDefaults {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false, unique = true)
    private Group group;

    @Column(name = "default_type")
    private String defaultType; // EQUAL | RATIO | PERCENTAGE

    @Column(name = "ratios_json", columnDefinition = "jsonb")
    private String ratiosJson; // JSON structure for ratios

    @Column(name = "percentages_json", columnDefinition = "jsonb")
    private String percentagesJson; // JSON structure for percentages

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Long getId() { return id; }
    public Group getGroup() { return group; }
    public void setGroup(Group group) { this.group = group; }
    public String getDefaultType() { return defaultType; }
    public void setDefaultType(String defaultType) { this.defaultType = defaultType; }
    public String getRatiosJson() { return ratiosJson; }
    public void setRatiosJson(String ratiosJson) { this.ratiosJson = ratiosJson; }
    public String getPercentagesJson() { return percentagesJson; }
    public void setPercentagesJson(String percentagesJson) { this.percentagesJson = percentagesJson; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
