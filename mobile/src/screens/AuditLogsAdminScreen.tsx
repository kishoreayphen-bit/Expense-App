import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';

interface AuditLog {
  id: number;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId: number | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  companyId: number | null;
  createdAt: string;
}

export default function AuditLogsAdminScreen() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const loadLogs = useCallback(async () => {
    try {
      console.log('[AuditLogsAdminScreen] Loading audit logs');
      const response = await api.get('/api/v1/audit/logs', {
        params: { page: 0, size: 100 }
      });
      console.log('[AuditLogsAdminScreen] Response:', response.data);
      
      // Handle different response formats
      let logsData = [];
      if (response.data.content && Array.isArray(response.data.content)) {
        logsData = response.data.content;
      } else if (Array.isArray(response.data)) {
        logsData = response.data;
      }
      
      console.log('[AuditLogsAdminScreen] Logs loaded:', logsData.length);
      setLogs(logsData);
      setFilteredLogs(logsData);
    } catch (error: any) {
      console.error('[AuditLogsAdminScreen] Error loading logs:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load audit logs');
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    filterLogs();
  }, [searchQuery, actionFilter, logs]);

  const filterLogs = () => {
    // Ensure logs is an array
    if (!Array.isArray(logs)) {
      setFilteredLogs([]);
      return;
    }

    let filtered = logs;

    // Filter by action
    if (actionFilter !== 'ALL') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.userEmail?.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.resourceType?.toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  const handleLogPress = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
      case 'INSERT':
        return '#10B981';
      case 'UPDATE':
        return '#F59E0B';
      case 'DELETE':
        return '#EF4444';
      case 'LOGIN':
        return '#06B6D4';
      case 'LOGOUT':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
      case 'INSERT':
        return 'add-circle';
      case 'UPDATE':
        return 'edit';
      case 'DELETE':
        return 'delete';
      case 'LOGIN':
        return 'login';
      case 'LOGOUT':
        return 'logout';
      default:
        return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const renderLogCard = ({ item }: { item: AuditLog }) => (
    <TouchableOpacity
      style={styles.logCard}
      onPress={() => handleLogPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.actionBadge, { backgroundColor: getActionColor(item.action) + '20' }]}>
        <MaterialIcons name={getActionIcon(item.action) as any} size={20} color={getActionColor(item.action)} />
        <Text style={[styles.actionText, { color: getActionColor(item.action) }]}>
          {item.action}
        </Text>
      </View>

      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <MaterialIcons name="person" size={16} color="#6B7280" />
          <Text style={styles.userEmail}>{item.userEmail || 'System'}</Text>
        </View>

        <View style={styles.logDetails}>
          <Text style={styles.resourceType}>{item.resourceType}</Text>
          {item.resourceId && (
            <Text style={styles.resourceId}>ID: {item.resourceId}</Text>
          )}
        </View>

        <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
      </View>

      <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const renderDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Audit Log Details</Text>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {selectedLog && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Action:</Text>
                  <View style={[styles.actionBadge, { backgroundColor: getActionColor(selectedLog.action) + '20' }]}>
                    <Text style={[styles.actionText, { color: getActionColor(selectedLog.action) }]}>
                      {selectedLog.action}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>User:</Text>
                  <Text style={styles.detailValue}>{selectedLog.userEmail || 'System'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Resource Type:</Text>
                  <Text style={styles.detailValue}>{selectedLog.resourceType}</Text>
                </View>

                {selectedLog.resourceId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Resource ID:</Text>
                    <Text style={styles.detailValue}>{selectedLog.resourceId}</Text>
                  </View>
                )}

                {selectedLog.companyId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Company ID:</Text>
                    <Text style={styles.detailValue}>{selectedLog.companyId}</Text>
                  </View>
                )}

                {selectedLog.ipAddress && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>IP Address:</Text>
                    <Text style={styles.detailValue}>{selectedLog.ipAddress}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Timestamp:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedLog.createdAt)}</Text>
                </View>

                {selectedLog.oldValue && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Old Value:</Text>
                    <View style={styles.codeBlock}>
                      <Text style={styles.codeText}>{selectedLog.oldValue}</Text>
                    </View>
                  </View>
                )}

                {selectedLog.newValue && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>New Value:</Text>
                    <View style={styles.codeBlock}>
                      <Text style={styles.codeText}>{selectedLog.newValue}</Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const actions = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Audit Logs</Text>
          <Text style={styles.subtitle}>{filteredLogs.length} logs</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by user, action, or resource..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {actions.map(action => (
          <TouchableOpacity
            key={action}
            style={[
              styles.filterChip,
              actionFilter === action && styles.filterChipActive
            ]}
            onPress={() => setActionFilter(action)}
          >
            <Text style={[
              styles.filterChipText,
              actionFilter === action && styles.filterChipTextActive
            ]}>
              {action}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Logs List */}
      <FlatList
        data={filteredLogs}
        renderItem={renderLogCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="history" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No audit logs found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || actionFilter !== 'ALL'
                ? 'Try adjusting your filters'
                : 'Audit logs will appear here'}
            </Text>
          </View>
        }
      />

      {renderDetailsModal()}
    </SafeAreaView>
  );
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#0F172A',
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  listContent: {
    padding: 16,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  logContent: {
    flex: 1,
    marginLeft: 12,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  logDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  resourceType: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  resourceId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
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
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  codeBlock: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#374151',
  },
});
