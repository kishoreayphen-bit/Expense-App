package com.expenseapp.settings;

import com.expenseapp.user.User;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;

@Entity
@Table(name = "system_settings")
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SystemSetting {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "setting_key", unique = true, nullable = false, length = 100)
    private String key;
    
    @Column(name = "setting_value", columnDefinition = "TEXT")
    private String value;
    
    @Column(name = "setting_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private SettingType type = SettingType.STRING;
    
    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private SettingCategory category = SettingCategory.GENERAL;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "is_public")
    private Boolean isPublic = false;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;
    
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
    
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
    
    public enum SettingType {
        STRING, NUMBER, BOOLEAN, JSON
    }
    
    public enum SettingCategory {
        GENERAL, EMAIL, STORAGE, SECURITY, FEATURES, PAYMENT, NOTIFICATION
    }
}
