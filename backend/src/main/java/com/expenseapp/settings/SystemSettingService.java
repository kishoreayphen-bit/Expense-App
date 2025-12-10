package com.expenseapp.settings;

import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemSettingService {
    
    private final SystemSettingRepository settingRepository;
    private final UserRepository userRepository;
    
    /**
     * Get all settings (SUPER_ADMIN only)
     */
    @Transactional(readOnly = true)
    public List<SystemSetting> getAllSettings() {
        log.info("[SystemSettingService] Getting all settings");
        return settingRepository.findAll();
    }
    
    /**
     * Get settings by category
     */
    @Transactional(readOnly = true)
    public List<SystemSetting> getSettingsByCategory(SystemSetting.SettingCategory category) {
        log.info("[SystemSettingService] Getting settings for category: {}", category);
        return settingRepository.findByCategoryOrderByKeyAsc(category);
    }
    
    /**
     * Get public settings (accessible to all authenticated users)
     */
    @Transactional(readOnly = true)
    public List<SystemSetting> getPublicSettings() {
        log.info("[SystemSettingService] Getting public settings");
        return settingRepository.findByIsPublic(true);
    }
    
    /**
     * Get a specific setting by key
     */
    @Transactional(readOnly = true)
    public SystemSetting getSetting(String key) {
        log.info("[SystemSettingService] Getting setting: {}", key);
        return settingRepository.findByKey(key)
            .orElseThrow(() -> new IllegalArgumentException("Setting not found: " + key));
    }
    
    /**
     * Get setting value as string
     */
    @Transactional(readOnly = true)
    public String getSettingValue(String key, String defaultValue) {
        return settingRepository.findByKey(key)
            .map(SystemSetting::getValue)
            .orElse(defaultValue);
    }
    
    /**
     * Get setting value as boolean
     */
    @Transactional(readOnly = true)
    public boolean getSettingValueAsBoolean(String key, boolean defaultValue) {
        return settingRepository.findByKey(key)
            .map(s -> Boolean.parseBoolean(s.getValue()))
            .orElse(defaultValue);
    }
    
    /**
     * Get setting value as integer
     */
    @Transactional(readOnly = true)
    public int getSettingValueAsInt(String key, int defaultValue) {
        return settingRepository.findByKey(key)
            .map(s -> {
                try {
                    return Integer.parseInt(s.getValue());
                } catch (NumberFormatException e) {
                    return defaultValue;
                }
            })
            .orElse(defaultValue);
    }
    
    /**
     * Update a setting
     */
    @Transactional
    public SystemSetting updateSetting(String key, String value, String userEmail) {
        log.info("[SystemSettingService] Updating setting: {} = {}", key, value);
        
        SystemSetting setting = settingRepository.findByKey(key)
            .orElseThrow(() -> new IllegalArgumentException("Setting not found: " + key));
        
        User user = userRepository.findByEmail(userEmail).orElse(null);
        
        setting.setValue(value);
        setting.setUpdatedBy(user);
        setting.setUpdatedAt(Instant.now());
        
        return settingRepository.save(setting);
    }
    
    /**
     * Create a new setting
     */
    @Transactional
    public SystemSetting createSetting(SystemSetting setting, String userEmail) {
        log.info("[SystemSettingService] Creating setting: {}", setting.getKey());
        
        if (settingRepository.existsByKey(setting.getKey())) {
            throw new IllegalArgumentException("Setting already exists: " + setting.getKey());
        }
        
        User user = userRepository.findByEmail(userEmail).orElse(null);
        setting.setUpdatedBy(user);
        
        return settingRepository.save(setting);
    }
    
    /**
     * Delete a setting
     */
    @Transactional
    public void deleteSetting(String key) {
        log.info("[SystemSettingService] Deleting setting: {}", key);
        
        SystemSetting setting = settingRepository.findByKey(key)
            .orElseThrow(() -> new IllegalArgumentException("Setting not found: " + key));
        
        settingRepository.delete(setting);
    }
    
    /**
     * Bulk update settings
     */
    @Transactional
    public List<SystemSetting> bulkUpdateSettings(Map<String, String> updates, String userEmail) {
        log.info("[SystemSettingService] Bulk updating {} settings", updates.size());
        
        User user = userRepository.findByEmail(userEmail).orElse(null);
        
        return updates.entrySet().stream()
            .map(entry -> {
                SystemSetting setting = settingRepository.findByKey(entry.getKey())
                    .orElseThrow(() -> new IllegalArgumentException("Setting not found: " + entry.getKey()));
                
                setting.setValue(entry.getValue());
                setting.setUpdatedBy(user);
                setting.setUpdatedAt(Instant.now());
                
                return settingRepository.save(setting);
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Reset setting to default (implementation depends on your default values strategy)
     */
    @Transactional
    public SystemSetting resetSetting(String key, String userEmail) {
        log.info("[SystemSettingService] Resetting setting: {}", key);
        
        SystemSetting setting = settingRepository.findByKey(key)
            .orElseThrow(() -> new IllegalArgumentException("Setting not found: " + key));
        
        // Reset logic - you might want to store defaults elsewhere
        User user = userRepository.findByEmail(userEmail).orElse(null);
        setting.setUpdatedBy(user);
        setting.setUpdatedAt(Instant.now());
        
        return settingRepository.save(setting);
    }
}
