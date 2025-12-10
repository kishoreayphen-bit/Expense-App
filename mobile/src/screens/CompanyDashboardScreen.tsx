import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCompany } from '../context/CompanyContext';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';

export default function CompanyDashboardScreen() {
  const { activeCompany, activeCompanyId, setActiveCompanyId, refreshActiveCompany } = useCompany();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [stats, setStats] = useState({
    expenses: 0,
    totalSpent: 0,
    budgets: 0,
    splits: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Set active company when navigating with companyId param
  useEffect(() => {
    const id = route?.params?.companyId as number | undefined;
    if (id && id !== activeCompanyId) {
      setActiveCompanyId(id);
      refreshActiveCompany();
    }
  }, [route?.params?.companyId]);

  const loadDashboardData = useCallback(async (isRefreshing = false) => {
    if (!activeCompanyId) return;
    
    try {
      if (!isRefreshing) setLoading(true);

      // Fetch company-specific data in parallel
      const [expensesRes, budgetsRes] = await Promise.allSettled([
        api.get('/api/v1/expenses'),
        api.get('/api/v1/budgets', { params: { period: getCurrentPeriod() } }),
      ]);

      let expenseCount = 0;
      let totalSpent = 0;
      if (expensesRes.status === 'fulfilled') {
        const expenses = Array.isArray(expensesRes.value.data) ? expensesRes.value.data : [];
        expenseCount = expenses.length;
        totalSpent = expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
      }

      let budgetCount = 0;
      if (budgetsRes.status === 'fulfilled') {
        const budgets = Array.isArray(budgetsRes.value.data) ? budgetsRes.value.data : [];
        budgetCount = budgets.length;
      }

      setStats({
        expenses: expenseCount,
        totalSpent,
        budgets: budgetCount,
        splits: 0, // TODO: Fetch splits count when endpoint is ready
      });
    } catch (error) {
      console.error('[Dashboard] Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    if (activeCompanyId) {
      loadDashboardData();
    }
  }, [activeCompanyId]);

  useFocusEffect(
    useCallback(() => {
      if (activeCompanyId) {
        loadDashboardData(true);
      }
    }, [activeCompanyId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(true);
  };

  const getCurrentPeriod = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: activeCompany?.currency || 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (!activeCompany && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <MaterialIcons name="business" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Company Selected</Text>
          <Text style={styles.emptyText}>Please select a company from the Companies tab</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Companies' })}
          >
            <Text style={styles.primaryButtonText}>Go to Companies</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Company Header */}
        <View style={styles.companyHeader}>
          <View style={styles.companyHeaderLeft}>
            <View style={styles.companyIcon}>
              <MaterialIcons name="business" size={32} color="#22C55E" />
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{activeCompany?.companyName || 'Company'}</Text>
              <Text style={styles.companyDetails}>
                {activeCompany?.companyCode} • {activeCompany?.industryType || 'Business'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Companies' })}
          >
            <MaterialIcons name="swap-horiz" size={24} color="#22C55E" />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
                <MaterialIcons name="receipt-long" size={28} color="#6366F1" />
                <Text style={styles.statValue}>{stats.expenses}</Text>
                <Text style={styles.statLabel}>Expenses</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                <MaterialIcons name="account-balance-wallet" size={28} color="#F59E0B" />
                <Text style={styles.statValue}>{stats.budgets}</Text>
                <Text style={styles.statLabel}>Budgets</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
                <MaterialIcons name="trending-up" size={28} color="#3B82F6" />
                <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FCE7F3' }]}>
                <MaterialIcons name="group" size={28} color="#EC4899" />
                <Text style={styles.statValue}>{stats.splits}</Text>
                <Text style={styles.statLabel}>Splits</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.push('AddExpense', { fromCompany: true, companyId: activeCompanyId })}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
                    <MaterialIcons name="add" size={24} color="#16A34A" />
                  </View>
                  <Text style={styles.actionLabel}>Add Expense</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('MainTabs' as never, { screen: 'Budgets', params: { openCreate: true, fromCompany: true } } as never)}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                    <MaterialIcons name="savings" size={24} color="#CA8A04" />
                  </View>
                  <Text style={styles.actionLabel}>Create Budget</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.push('SplitCreate')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#E0E7FF' }]}>
                    <MaterialIcons name="call-split" size={24} color="#4F46E5" />
                  </View>
                  <Text style={styles.actionLabel}>Split Expense</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('MainTabs' as never, { screen: 'Expenses', params: { fromCompany: true, companyId: activeCompanyId } } as never)}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
                    <MaterialIcons name="assessment" size={24} color="#2563EB" />
                  </View>
                  <Text style={styles.actionLabel}>View Reports</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Navigation Cards */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Manage</Text>
              
              <TouchableOpacity
                style={styles.navCard}
                onPress={() => navigation.navigate('MainTabs' as never, { screen: 'Expenses', params: { fromCompany: true, companyId: activeCompanyId } } as never)}
              >
                <View style={styles.navCardLeft}>
                  <View style={[styles.navIcon, { backgroundColor: '#DCFCE7' }]}>
                    <MaterialIcons name="receipt" size={22} color="#16A34A" />
                  </View>
                  <View>
                    <Text style={styles.navTitle}>Expenses</Text>
                    <Text style={styles.navSubtitle}>{stats.expenses} expenses tracked</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navCard}
                onPress={() => navigation.navigate('MainTabs' as never, { screen: 'Budgets', params: { fromCompany: true } } as never)}
              >
                <View style={styles.navCardLeft}>
                  <View style={[styles.navIcon, { backgroundColor: '#FEF3C7' }]}>
                    <MaterialIcons name="account-balance-wallet" size={22} color="#CA8A04" />
                  </View>
                  <View>
                    <Text style={styles.navTitle}>Budgets</Text>
                    <Text style={styles.navSubtitle}>{stats.budgets} budgets active</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navCard}
                onPress={() => navigation.push('MainTabs', { screen: 'Splits', params: { fromCompany: true } })}
              >
                <View style={styles.navCardLeft}>
                  <View style={[styles.navIcon, { backgroundColor: '#FCE7F3' }]}>
                    <MaterialIcons name="group" size={22} color="#EC4899" />
                  </View>
                  <View>
                    <Text style={styles.navTitle}>Splits</Text>
                    <Text style={styles.navSubtitle}>Shared expenses</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Company Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company Information</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{activeCompany?.companyEmail || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{activeCompany?.contactNumber || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>
                    {activeCompany?.city}, {activeCompany?.state}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Currency</Text>
                  <Text style={styles.infoValue}>{activeCompany?.currency || 'INR'}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 80 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  primaryButton: { backgroundColor: '#22C55E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 24 },
  primaryButtonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  companyHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  companyIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  companyInfo: { flex: 1 },
  companyName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  companyDetails: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  iconButton: { padding: 8, borderRadius: 10, backgroundColor: '#F0FDF4' },
  
  loadingContainer: { alignItems: 'center', padding: 48 },
  loadingText: { marginTop: 12, color: '#6B7280' },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 14, marginTop: 4 },
  
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', textAlign: 'center' },
  
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  navCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  navSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  infoCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '700' },
});
