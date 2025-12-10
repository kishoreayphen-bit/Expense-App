package com.expenseapp.settings;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/settings")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SystemSettingController {
    
    private final SystemSettingService settingService;
    
    /**
     * Get all system settings
     */
    @GetMapping
    public ResponseEntity<List<SystemSetting>> getAllSettings() {
        log.info("[SystemSettingController] Getting all settings");
        List<SystemSetting> settings = settingService.getAllSettings();
        return ResponseEntity.ok(settings);
    }
    
    /**
     * Get settings by category
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<List<SystemSetting>> getSettingsByCategory(
            @PathVariable SystemSetting.SettingCategory category) {
        log.info("[SystemSettingController] Getting settings for category: {}", category);
        List<SystemSetting> settings = settingService.getSettingsByCategory(category);
        return ResponseEntity.ok(settings);
    }
    
    /**
     * Get a specific setting
     */
    @GetMapping("/{key}")
    public ResponseEntity<SystemSetting> getSetting(@PathVariable String key) {
        log.info("[SystemSettingController] Getting setting: {}", key);
        SystemSetting setting = settingService.getSetting(key);
        return ResponseEntity.ok(setting);
    }
    
    /**
     * Update a setting
     */
    @PutMapping("/{key}")
    public ResponseEntity<SystemSetting> updateSetting(
            @PathVariable String key,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        log.info("[SystemSettingController] Updating setting: {}", key);
        String value = body.get("value");
        String userEmail = authentication.getName();
        
        SystemSetting setting = settingService.updateSetting(key, value, userEmail);
        return ResponseEntity.ok(setting);
    }
    
    /**
     * Create a new setting
     */
    @PostMapping
    public ResponseEntity<SystemSetting> createSetting(
            @RequestBody SystemSetting setting,
            Authentication authentication) {
        log.info("[SystemSettingController] Creating setting: {}", setting.getKey());
        String userEmail = authentication.getName();
        
        SystemSetting created = settingService.createSetting(setting, userEmail);
        return ResponseEntity.ok(created);
    }
    
    /**
     * Delete a setting
     */
    @DeleteMapping("/{key}")
    public ResponseEntity<Void> deleteSetting(@PathVariable String key) {
        log.info("[SystemSettingController] Deleting setting: {}", key);
        settingService.deleteSetting(key);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Bulk update settings
     */
    @PostMapping("/bulk")
    public ResponseEntity<List<SystemSetting>> bulkUpdateSettings(
            @RequestBody Map<String, String> updates,
            Authentication authentication) {
        log.info("[SystemSettingController] Bulk updating {} settings", updates.size());
        String userEmail = authentication.getName();
        
        List<SystemSetting> settings = settingService.bulkUpdateSettings(updates, userEmail);
        return ResponseEntity.ok(settings);
    }
    
    /**
     * Reset setting to default
     */
    @PostMapping("/{key}/reset")
    public ResponseEntity<SystemSetting> resetSetting(
            @PathVariable String key,
            Authentication authentication) {
        log.info("[SystemSettingController] Resetting setting: {}", key);
        String userEmail = authentication.getName();
        
        SystemSetting setting = settingService.resetSetting(key, userEmail);
        return ResponseEntity.ok(setting);
    }
}
