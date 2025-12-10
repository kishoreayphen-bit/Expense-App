import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  enabled: boolean;
}

interface Company {
  id: number;
  companyName: string;
  status: string;
  memberCount: number;
}

interface BulkResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

type OperationType = 'users' | 'companies';
type UserAction = 'enable' | 'disable' | 'delete';
type CompanyAction = 'activate' | 'deactivate';

export default function BulkOperationsScreen() {
  const navigation = useNavigation();
  const [operationType, setOperationType] = useState<OperationType>('users');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [userAction, setUserAction] = useState<UserAction>('disable');

  // Companies
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());
  const [companyAction, setCompanyAction] = useState<CompanyAction>('deactivate');

  // Results Modal
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<BulkResult | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[BulkOps] Loading users');
      const response = await api.get('/api/v1/admin/users-summary');
      console.log('[BulkOps] Users loaded:', response.data.length);
      setUsers(response.data);
    } catch (error: any) {
      console.error('[BulkOps] Error loading users:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[BulkOps] Loading companies');
      const response = await api.get('/api/v1/admin/companies');
      console.log('[BulkOps] Companies loaded:', response.data.length);
      setCompanies(response.data);
    } catch (error: any) {
      console.error('[BulkOps] Error loading companies:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (operationType === 'users') {
      loadUsers();
    } else {
      loadCompanies();
    }
  }, [operationType, loadUsers, loadCompanies]);

  const handleRefresh = () => {
    setRefreshing(true);
    setSelectedUsers(new Set());
    setSelectedCompanies(new Set());
    if (operationType === 'users') {
      loadUsers();
    } else {
      loadCompanies();
    }
  };

  const toggleUserSelection = (userId: number) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleCompanySelection = (companyId: number) => {
    const newSelection = new Set(selectedCompanies);
    if (newSelection.has(companyId)) {
      newSelection.delete(companyId);
    } else {
      newSelection.add(companyId);
    }
    setSelectedCompanies(newSelection);
  };

  const selectAllUsers = () => {
    setSelectedUsers(new Set(users.map(u => u.id)));
  };

  const selectAllCompanies = () => {
    setSelectedCompanies(new Set(companies.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
    setSelectedCompanies(new Set());
  };

  const executeBulkUserOperation = async () => {
    if (selectedUsers.size === 0) {
      Alert.alert('No Selection', 'Please select at least one user');
      return;
    }

    const actionText = userAction === 'enable' ? 'Enable' : userAction === 'disable' ? 'Disable' : 'Delete';
    
    Alert.alert(
      'Confirm Bulk Operation',
      `${actionText} ${selectedUsers.size} user(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: userAction === 'delete' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setLoading(true);
              const userIds = Array.from(selectedUsers);
              
              let response;
              if (userAction === 'delete') {
                response = await api.post('/api/v1/admin/bulk/users/delete', { userIds });
              } else {
                response = await api.post('/api/v1/admin/bulk/users/status', {
                  userIds,
                  enabled: userAction === 'enable',
                });
              }

              setResults(response.data);
              setShowResults(true);
              setSelectedUsers(new Set());
              loadUsers();
            } catch (error: any) {
              console.error('[BulkOps] Error:', error);
              Alert.alert('Error', error.response?.data?.message || 'Bulk operation failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const executeBulkCompanyOperation = async () => {
    if (selectedCompanies.size === 0) {
      Alert.alert('No Selection', 'Please select at least one company');
      return;
    }

    const actionText = companyAction === 'activate' ? 'Activate' : 'Deactivate';
    
    Alert.alert(
      'Confirm Bulk Operation',
      `${actionText} ${selectedCompanies.size} company(ies)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          onPress: async () => {
            try {
              setLoading(true);
              const companyIds = Array.from(selectedCompanies);
              
              const response = await api.post('/api/v1/admin/bulk/companies/status', {
                companyIds,
                status: companyAction === 'activate' ? 'ACTIVE' : 'INACTIVE',
              });

              setResults(response.data);
              setShowResults(true);
              setSelectedCompanies(new Set());
              loadCompanies();
            } catch (error: any) {
              console.error('[BulkOps] Error:', error);
              Alert.alert('Error', error.response?.data?.message || 'Bulk operation failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderResultsModal = () => (
    <Modal
      visible={showResults}
      animationType="slide"
      transparent
      onRequestClose={() => setShowResults(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Operation Results</Text>
            <TouchableOpacity onPress={() => setShowResults(false)}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {results && (
            <View style={styles.modalBody}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Total:</Text>
                <Text style={styles.resultValue}>{results.total}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Success:</Text>
                <Text style={[styles.resultValue, { color: '#10B981' }]}>{results.success}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Failed:</Text>
                <Text style={[styles.resultValue, { color: '#EF4444' }]}>{results.failed}</Text>
              </View>

              {results.errors.length > 0 && (
                <View style={styles.errorsSection}>
                  <Text style={styles.errorsTitle}>Errors:</Text>
                  {results.errors.map((error, index) => (
                    <Text key={index} style={styles.errorText}>• {error}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowResults(false)}
          >
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const selectedCount = operationType === 'users' ? selectedUsers.size : selectedCompanies.size;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Bulk Operations</Text>
          <Text style={styles.subtitle}>
            {selectedCount} selected
          </Text>
        </View>
      </View>

      {/* Operation Type Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, operationType === 'users' && styles.tabActive]}
          onPress={() => setOperationType('users')}
        >
          <MaterialIcons
            name="people"
            size={20}
            color={operationType === 'users' ? '#6366F1' : '#6B7280'}
          />
          <Text style={[
            styles.tabText,
            operationType === 'users' && styles.tabTextActive
          ]}>
            Users
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, operationType === 'companies' && styles.tabActive]}
          onPress={() => setOperationType('companies')}
        >
          <MaterialIcons
            name="business"
            size={20}
            color={operationType === 'companies' ? '#6366F1' : '#6B7280'}
          />
          <Text style={[
            styles.tabText,
            operationType === 'companies' && styles.tabTextActive
          ]}>
            Companies
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Selector */}
      <View style={styles.actionBar}>
        <View style={styles.actionSelector}>
          {operationType === 'users' ? (
            <>
              {(['enable', 'disable', 'delete'] as UserAction[]).map(action => (
                <TouchableOpacity
                  key={action}
                  style={[
                    styles.actionButton,
                    userAction === action && styles.actionButtonActive,
                    action === 'delete' && styles.actionButtonDanger
                  ]}
                  onPress={() => setUserAction(action)}
                >
                  <Text style={[
                    styles.actionButtonText,
                    userAction === action && styles.actionButtonTextActive
                  ]}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              {(['activate', 'deactivate'] as CompanyAction[]).map(action => (
                <TouchableOpacity
                  key={action}
                  style={[
                    styles.actionButton,
                    companyAction === action && styles.actionButtonActive
                  ]}
                  onPress={() => setCompanyAction(action)}
                >
                  <Text style={[
                    styles.actionButtonText,
                    companyAction === action && styles.actionButtonTextActive
                  ]}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      </View>

      {/* Selection Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={operationType === 'users' ? selectAllUsers : selectAllCompanies}
        >
          <MaterialIcons name="check-box" size={20} color="#6366F1" />
          <Text style={styles.controlButtonText}>Select All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={clearSelection}
        >
          <MaterialIcons name="check-box-outline-blank" size={20} color="#6B7280" />
          <Text style={styles.controlButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} />
        }
      >
        {operationType === 'users' ? (
          users.map(user => (
            <TouchableOpacity
              key={user.id}
              style={styles.listItem}
              onPress={() => toggleUserSelection(user.id)}
            >
              <MaterialIcons
                name={selectedUsers.has(user.id) ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={selectedUsers.has(user.id) ? '#6366F1' : '#D1D5DB'}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{user.name}</Text>
                <Text style={styles.itemSubtext}>{user.email}</Text>
                <View style={styles.itemBadges}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{user.role}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: user.enabled ? '#D1FAE5' : '#FEE2E2' }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: user.enabled ? '#059669' : '#DC2626' }
                    ]}>
                      {user.enabled ? 'Active' : 'Disabled'}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          companies.map(company => (
            <TouchableOpacity
              key={company.id}
              style={styles.listItem}
              onPress={() => toggleCompanySelection(company.id)}
            >
              <MaterialIcons
                name={selectedCompanies.has(company.id) ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={selectedCompanies.has(company.id) ? '#6366F1' : '#D1D5DB'}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{company.companyName}</Text>
                <Text style={styles.itemSubtext}>{company.memberCount} members</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: company.status === 'ACTIVE' ? '#D1FAE5' : '#FEE2E2' }
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    { color: company.status === 'ACTIVE' ? '#059669' : '#DC2626' }
                  ]}>
                    {company.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Execute Button */}
      {selectedCount > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.executeButton}
            onPress={operationType === 'users' ? executeBulkUserOperation : executeBulkCompanyOperation}
            disabled={loading}
          >
            <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
            <Text style={styles.executeButtonText}>
              Execute on {selectedCount} {operationType === 'users' ? 'User(s)' : 'Company(ies)'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {renderResultsModal()}
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#6366F1',
    fontWeight: '700',
  },
  actionBar: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#6366F1',
  },
  actionButtonDanger: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  actionButtonTextActive: {
    color: '#FFFFFF',
  },
  controls: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  itemSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  itemBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E0E7FF',
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  executeButton: {
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
  executeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBody: {
    padding: 20,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorsSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
    marginBottom: 4,
  },
  modalButton: {
    margin: 20,
    marginTop: 0,
    paddingVertical: 12,
    backgroundColor: '#6366F1',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
