package com.expenseapp.notification;

import com.expenseapp.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "notification_prefs")
public class NotificationPrefs {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "categories_json", columnDefinition = "jsonb")
    private String categoriesJson; // e.g., {"splits":true,"approvals":true}

    @Column(name = "quiet_start")
    private java.time.LocalTime quietStart;

    @Column(name = "quiet_end")
    private java.time.LocalTime quietEnd;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getCategoriesJson() { return categoriesJson; }
    public void setCategoriesJson(String categoriesJson) { this.categoriesJson = categoriesJson; }
    public java.time.LocalTime getQuietStart() { return quietStart; }
    public void setQuietStart(java.time.LocalTime quietStart) { this.quietStart = quietStart; }
    public java.time.LocalTime getQuietEnd() { return quietEnd; }
    public void setQuietEnd(java.time.LocalTime quietEnd) { this.quietEnd = quietEnd; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
