import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCompany } from '../context/CompanyContext';
import { ReimbursementService } from '../api/reimbursementService';
import { useFocusEffect } from '@react-navigation/native';
import { useRole } from '../context/RoleContext';
import { canApproveExpenses, getRoleDisplayName, getRoleBadgeColor } from '../utils/permissions';

type Tab = 'pending' | 'approved' | 'rejected' | 'paid';

type Expense = {
  id: number;
  amount: number;
  currency: string;
  merchant: string;
  description?: string;
  occurredOn: string;
  reimbursementStatus: string;
  reimbursementRequestedAt: string;
  reimbursementNotes?: string;
  user: {
    id: number;
    name: string;
    email: string;
    role?: string;
  };
};

export default function ClaimsScreen() {
  const { activeCompanyId } = useCompany();
  const { role, isEmployee, isManager, isAdmin, isSuperAdmin } = useRole();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<Expense[]>([]);
  const [history, setHistory] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeCompanyId) {
      Alert.alert('Error', 'Please select a company first');
      return;
    }

    // Ensure companyId is a valid number
    const companyIdNum = Number(activeCompanyId);
    if (isNaN(companyIdNum) || companyIdNum <= 0) {
      Alert.alert('Error', 'Invalid company ID');
      return;
    }

    setLoading(true);
    try {
      console.log(`[ClaimsScreen] Loading data for tab: ${activeTab}, companyId: ${companyIdNum}`);
      if (activeTab === 'pending') {
        const data = await ReimbursementService.getPendingReimbursements(companyIdNum);
        console.log(`[ClaimsScreen] Received ${data.length} pending claims`);
        setPending(data);
      } else {
        const allHistory = await ReimbursementService.getReimbursementHistory(companyIdNum);
        console.log(`[ClaimsScreen] Received ${allHistory.length} history items`);
        const filtered = allHistory.filter(
          (e) => e.reimbursementStatus?.toLowerCase() === activeTab
        );
        console.log(`[ClaimsScreen] Filtered to ${filtered.length} items for tab: ${activeTab}`);
        setHistory(filtered);
      }
    } catch (error: any) {
      console.error('[ClaimsScreen] Error loading claims:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load claims');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCompanyId, activeTab]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    loadData();
  }, [activeTab, loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = async (expenseId: number) => {
    console.log('[ClaimsScreen] handleApprove called for expense ID:', expenseId);
    Alert.alert(
      'Approve Reimbursement',
      'Do you want to approve this reimbursement request?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('[ClaimsScreen] Approve cancelled'),
        },
        {
          text: 'Approve',
          onPress: async () => {
            console.log('[ClaimsScreen] Approve confirmed');
            try {
              console.log('[ClaimsScreen] Calling approveReimbursement API...');
              const result = await ReimbursementService.approveReimbursement(expenseId);
              console.log('[ClaimsScreen] Approve successful:', result);
              // Immediately remove from pending list
              setPending(prev => prev.filter(item => item.id !== expenseId));
              console.log('[ClaimsScreen] Removed from pending list');
              console.log('[ClaimsScreen] Reloading data...');
              await loadData();
              console.log('[ClaimsScreen] Data reloaded');
              Alert.alert('Success', 'Reimbursement approved! Switch to the Approved tab to see it.');
            } catch (error: any) {
              console.error('[ClaimsScreen] Error approving:', error);
              console.error('[ClaimsScreen] Error response:', error.response?.data);
              Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to approve reimbursement');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (expenseId: number) => {
    console.log('[ClaimsScreen] handleReject called for expense ID:', expenseId);
    Alert.alert(
      'Reject Reimbursement',
      'Are you sure you want to reject this reimbursement request?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('[ClaimsScreen] Reject cancelled'),
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            console.log('[ClaimsScreen] Reject confirmed');
            try {
              console.log('[ClaimsScreen] Calling rejectReimbursement API...');
              const result = await ReimbursementService.rejectReimbursement(expenseId, 'Rejected by admin');
              console.log('[ClaimsScreen] Reject successful:', result);
              // Immediately remove from pending list
              setPending(prev => prev.filter(item => item.id !== expenseId));
              console.log('[ClaimsScreen] Removed from pending list');
              console.log('[ClaimsScreen] Reloading data...');
              await loadData();
              console.log('[ClaimsScreen] Data reloaded');
              Alert.alert('Rejected', 'Reimbursement rejected. Switch to the Rejected tab to see it.');
            } catch (error: any) {
              console.error('[ClaimsScreen] Error rejecting:', error);
              console.error('[ClaimsScreen] Error response:', error.response?.data);
              Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to reject reimbursement');
            }
          },
        },
      ]
    );
  };

  const handleMarkPaid = async (expenseId: number) => {
    Alert.alert('Confirm', 'Mark this reimbursement as paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: async () => {
          try {
            await ReimbursementService.markAsPaid(expenseId);
            Alert.alert('Success', 'Marked as paid!');
            loadData();
          } catch (error: any) {
            console.error('Error marking paid:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to mark as paid');
          }
        },
      },
    ]);
  };

  const renderClaim = ({ item }: { item: Expense }) => {
    const formattedDate = new Date(item.occurredOn).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedRequestDate = new Date(item.reimbursementRequestedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // Check if current user can approve this expense
    // Manager can only approve EMPLOYEE expenses
    // Admin can approve all expenses
    const expenseOwnerRole = item.user?.role?.toUpperCase();
    const canApprove = isAdmin || isSuperAdmin || 
      (isManager && expenseOwnerRole === 'EMPLOYEE');
    
    // Show permission message for managers trying to approve non-employee expenses
    const showPermissionWarning = isManager && expenseOwnerRole !== 'EMPLOYEE' && activeTab === 'pending';

    return (
      <View style={styles.claimCard}>
        <View style={styles.claimHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.merchant}>{item.merchant || 'Expense'}</Text>
            <Text style={styles.employee}>{item.user?.name || item.user?.email}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amount}>
              {item.currency} {item.amount.toFixed(2)}
            </Text>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialIcons name="access-time" size={14} color="#6b7280" />
            <Text style={styles.metaText}>Requested: {formattedRequestDate}</Text>
          </View>
        </View>

        {item.reimbursementNotes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.reimbursementNotes}</Text>
          </View>
        )}

        {activeTab === 'pending' && (
          <>
            {showPermissionWarning && (
              <View style={styles.permissionWarning}>
                <MaterialIcons name="info-outline" size={16} color="#f59e0b" />
                <Text style={styles.permissionWarningText}>
                  Managers can only approve employee expenses. This expense is from a {expenseOwnerRole?.toLowerCase() || 'user'}.
                </Text>
              </View>
            )}
            {canApprove ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApprove(item.id)}
                >
                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleReject(item.id)}
                >
                  <MaterialIcons name="cancel" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            ) : !showPermissionWarning && (
              <View style={styles.permissionDenied}>
                <MaterialIcons name="block" size={16} color="#ef4444" />
                <Text style={styles.permissionDeniedText}>
                  You don't have permission to approve this expense
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'approved' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.paidButton]}
            onPress={() => handleMarkPaid(item.id)}
          >
            <MaterialIcons name="payments" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Mark as Paid</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const data = activeTab === 'pending' ? pending : history;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reimbursement Claims</Text>
      </View>

      {/* Role Approval Indicator */}
      {role && (isManager || isAdmin || isSuperAdmin) && (
        <View style={styles.roleIndicator}>
          <MaterialIcons 
            name="verified-user" 
            size={16} 
            color={getRoleBadgeColor(role)} 
          />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.roleIndicatorTitle}>
              {getRoleDisplayName(role)} Approval Rights
            </Text>
            <Text style={styles.roleIndicatorText}>
              {isAdmin || isSuperAdmin 
                ? 'You can approve all reimbursement requests' 
                : 'You can approve employee reimbursement requests only'}
            </Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['pending', 'approved', 'rejected', 'paid'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading claims...</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderClaim}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No {activeTab} claims</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  roleIndicatorTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  roleIndicatorText: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 14,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#6366F1',
  },
  listContent: {
    padding: 16,
  },
  claimCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  merchant: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  employee: {
    fontSize: 14,
    color: '#6b7280',
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6366F1',
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  notesBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#0f172a',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  paidButton: {
    backgroundColor: '#6366F1',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  permissionWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
  permissionDenied: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  permissionDeniedText: {
    flex: 1,
    fontSize: 12,
    color: '#991b1b',
    lineHeight: 16,
  },
});
