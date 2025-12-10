package com.expenseapp.settings;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, Long> {
    
    Optional<SystemSetting> findByKey(String key);
    
    List<SystemSetting> findByCategory(SystemSetting.SettingCategory category);
    
    List<SystemSetting> findByIsPublic(Boolean isPublic);
    
    List<SystemSetting> findByCategoryOrderByKeyAsc(SystemSetting.SettingCategory category);
    
    boolean existsByKey(String key);
}
