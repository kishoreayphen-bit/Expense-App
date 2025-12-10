package com.expenseapp.dashboard;

import com.expenseapp.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "dashboard_prefs")
public class DashboardPrefs {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String period = "LAST_30_DAYS";

    @Column(name = "collapsed_widgets")
    private String collapsedWidgets; // comma-separated keys

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public String getCollapsedWidgets() { return collapsedWidgets; }
    public void setCollapsedWidgets(String collapsedWidgets) { this.collapsedWidgets = collapsedWidgets; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
