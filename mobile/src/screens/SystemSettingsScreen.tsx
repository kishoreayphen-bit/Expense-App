import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  category: 'GENERAL' | 'EMAIL' | 'STORAGE' | 'SECURITY' | 'FEATURES' | 'PAYMENT' | 'NOTIFICATION';
  description: string;
  isPublic: boolean;
  updatedAt: string;
}

interface SettingChanges {
  [key: string]: string;
}

export default function SystemSettingsScreen() {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [changes, setChanges] = useState<SettingChanges>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'GENERAL', 'EMAIL', 'STORAGE', 'SECURITY', 'FEATURES'];

  const loadSettings = useCallback(async () => {
    try {
      console.log('[SystemSettings] Loading settings');
      const response = await api.get('/api/v1/admin/settings');
      console.log('[SystemSettings] Loaded:', response.data.length);
      setSettings(response.data);
    } catch (error: any) {
      console.error('[SystemSettings] Error loading:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleRefresh = () => {
    setRefreshing(true);
    setChanges({});
    loadSettings();
  };

  const handleChange = (key: string, value: string) => {
    setChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      Alert.alert('No Changes', 'No settings have been modified');
      return;
    }

    Alert.alert(
      'Save Changes',
      `Save ${Object.keys(changes).length} setting(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            try {
              setSaving(true);
              console.log('[SystemSettings] Saving changes:', changes);
              
              await api.post('/api/v1/admin/settings/bulk', changes);
              
              Alert.alert('Success', 'Settings updated successfully');
              setChanges({});
              loadSettings();
            } catch (error: any) {
              console.error('[SystemSettings] Error saving:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to save settings');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleReset = () => {
    if (Object.keys(changes).length === 0) {
      return;
    }

    Alert.alert(
      'Discard Changes',
      'Discard all unsaved changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => setChanges({}),
        },
      ]
    );
  };

  const getCurrentValue = (setting: SystemSetting): string => {
    return changes[setting.key] !== undefined ? changes[setting.key] : setting.value;
  };

  const isModified = (key: string): boolean => {
    return changes[key] !== undefined;
  };

  const renderSettingInput = (setting: SystemSetting) => {
    const currentValue = getCurrentValue(setting);
    const modified = isModified(setting.key);

    switch (setting.type) {
      case 'BOOLEAN':
        return (
          <View style={styles.switchContainer}>
            <Switch
              value={currentValue === 'true'}
              onValueChange={(value) => handleChange(setting.key, value.toString())}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={currentValue === 'true' ? '#6366F1' : '#F3F4F6'}
            />
          </View>
        );

      case 'NUMBER':
        return (
          <TextInput
            style={[styles.input, modified && styles.inputModified]}
            value={currentValue}
            onChangeText={(value) => handleChange(setting.key, value)}
            keyboardType="numeric"
            placeholder="Enter number"
            placeholderTextColor="#9CA3AF"
          />
        );

      case 'JSON':
        return (
          <TextInput
            style={[styles.textArea, modified && styles.inputModified]}
            value={currentValue}
            onChangeText={(value) => handleChange(setting.key, value)}
            multiline
            numberOfLines={4}
            placeholder="Enter JSON"
            placeholderTextColor="#9CA3AF"
          />
        );

      default: // STRING
        return (
          <TextInput
            style={[styles.input, modified && styles.inputModified]}
            value={currentValue}
            onChangeText={(value) => handleChange(setting.key, value)}
            placeholder="Enter value"
            placeholderTextColor="#9CA3AF"
          />
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'GENERAL': return 'settings';
      case 'EMAIL': return 'email';
      case 'STORAGE': return 'storage';
      case 'SECURITY': return 'security';
      case 'FEATURES': return 'extension';
      default: return 'settings';
    }
  };

  const filteredSettings = selectedCategory === 'ALL'
    ? settings
    : settings.filter(s => s.category === selectedCategory);

  const groupedSettings = filteredSettings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>System Settings</Text>
          <Text style={styles.subtitle}>
            {filteredSettings.length} settings
            {hasChanges && ` • ${Object.keys(changes).length} modified`}
          </Text>
        </View>
        {hasChanges && (
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <MaterialIcons name="refresh" size={24} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterChip,
              selectedCategory === category && styles.filterChipActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <MaterialIcons
              name={getCategoryIcon(category) as any}
              size={16}
              color={selectedCategory === category ? '#FFFFFF' : '#6B7280'}
            />
            <Text style={[
              styles.filterChipText,
              selectedCategory === category && styles.filterChipTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Settings List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} />
        }
      >
        {Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <MaterialIcons name={getCategoryIcon(category) as any} size={20} color="#6366F1" />
              <Text style={styles.categoryTitle}>{category}</Text>
              <Text style={styles.categoryCount}>{categorySettings.length}</Text>
            </View>

            {categorySettings.map(setting => (
              <View key={setting.id} style={styles.settingCard}>
                <View style={styles.settingHeader}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingKey}>{setting.key}</Text>
                    {setting.description && (
                      <Text style={styles.settingDescription}>{setting.description}</Text>
                    )}
                  </View>
                  <View style={styles.settingBadges}>
                    <View style={[styles.typeBadge, { backgroundColor: getTypeBadgeColor(setting.type) }]}>
                      <Text style={styles.typeBadgeText}>{setting.type}</Text>
                    </View>
                    {isModified(setting.key) && (
                      <View style={styles.modifiedBadge}>
                        <MaterialIcons name="edit" size={12} color="#F59E0B" />
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.settingInput}>
                  {renderSettingInput(setting)}
                </View>
              </View>
            ))}
          </View>
        ))}

        {filteredSettings.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="settings" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No settings found</Text>
            <Text style={styles.emptySubtext}>Try selecting a different category</Text>
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <MaterialIcons name="save" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : `Save ${Object.keys(changes).length} Change(s)`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function getTypeBadgeColor(type: string): string {
  switch (type) {
    case 'BOOLEAN': return '#DBEAFE';
    case 'NUMBER': return '#FEF3C7';
    case 'JSON': return '#E0E7FF';
    default: return '#F3F4F6';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  resetButton: {
    marginLeft: 8,
  },
  filterContainer: {
    maxHeight: 50,
    marginVertical: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingKey: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  settingBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
  modifiedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  settingInput: {
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  inputModified: {
    borderColor: '#F59E0B',
    borderWidth: 2,
    backgroundColor: '#FFFBEB',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#0F172A',
    fontFamily: 'monospace',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    alignItems: 'flex-start',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
