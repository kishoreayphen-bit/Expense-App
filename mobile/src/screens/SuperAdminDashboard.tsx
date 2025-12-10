import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';

interface DashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  totalExpenses: number;
  pendingReimbursements: number;
  thisMonthExpenseCount: number;
  thisMonthExpenseTotal: number;
}

export default function SuperAdminDashboard() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      console.log('[SuperAdminDashboard] Loading dashboard stats');
      const response = await api.get('/api/v1/admin/dashboard');
      console.log('[SuperAdminDashboard] Stats loaded:', response.data);
      setStats(response.data);
    } catch (error: any) {
      console.error('[SuperAdminDashboard] Error loading stats:', error);
      console.error('[SuperAdminDashboard] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      let errorMessage = 'Failed to load dashboard stats';
      if (error.response?.status === 403) {
        errorMessage = 'Access denied. Super Admin role required.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Bad request. Please check your permissions.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const StatCard = ({ icon, label, value, color, onPress }: any) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={28} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value?.toLocaleString() || '0'}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const QuickActionButton = ({ icon, label, onPress, color }: any) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Super Admin</Text>
            <Text style={styles.subtitle}>System Overview</Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={() => Alert.alert('Coming Soon', 'System Settings feature is under development')}
          >
            <MaterialIcons name="settings" size={24} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="business"
            label="Total Companies"
            value={stats?.totalCompanies}
            color="#6366F1"
            onPress={() => navigation.navigate('AllCompanies')}
          />
          <StatCard
            icon="check-circle"
            label="Active Companies"
            value={stats?.activeCompanies}
            color="#10B981"
            onPress={() => navigation.navigate('AllCompanies')}
          />
          <StatCard
            icon="people"
            label="Total Users"
            value={stats?.totalUsers}
            color="#8B5CF6"
            onPress={() => navigation.navigate('AllUsers')}
          />
          <StatCard
            icon="receipt-long"
            label="Total Expenses"
            value={stats?.totalExpenses}
            color="#F59E0B"
            onPress={() => navigation.navigate('GlobalClaims')}
          />
          <StatCard
            icon="pending-actions"
            label="Pending Claims"
            value={stats?.pendingReimbursements}
            color="#EF4444"
            onPress={() => navigation.navigate('GlobalClaims', { status: 'PENDING' })}
          />
          <StatCard
            icon="calendar-today"
            label="This Month Expenses"
            value={stats?.thisMonthExpenseCount}
            color="#06B6D4"
            onPress={() => {}}
          />
        </View>

        {/* This Month Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialIcons name="trending-up" size={24} color="#6366F1" />
            <Text style={styles.summaryTitle}>This Month Summary</Text>
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={styles.summaryValue}>{stats?.thisMonthExpenseCount || 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryValue}>₹{stats?.thisMonthExpenseTotal?.toFixed(2) || '0.00'}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <QuickActionButton
              icon="business"
              label="Companies"
              color="#6366F1"
              onPress={() => navigation.navigate('AllCompanies')}
            />
            <QuickActionButton
              icon="people"
              label="Users"
              color="#8B5CF6"
              onPress={() => navigation.navigate('AllUsers')}
            />
            <QuickActionButton
              icon="receipt-long"
              label="Claims"
              color="#F59E0B"
              onPress={() => navigation.navigate('GlobalClaims')}
            />
            <QuickActionButton
              icon="history"
              label="Audit Logs"
              color="#06B6D4"
              onPress={() => navigation.navigate('AuditLogs')}
            />
            <QuickActionButton
              icon="settings"
              label="Settings"
              color="#10B981"
              onPress={() => navigation.navigate('SystemSettings')}
            />
            <QuickActionButton
              icon="bar-chart"
              label="Reports"
              color="#F59E0B"
              onPress={() => navigation.navigate('AdvancedReports')}
            />
            <QuickActionButton
              icon="playlist-add-check"
              label="Bulk Ops"
              color="#8B5CF6"
              onPress={() => navigation.navigate('BulkOperations')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
  },
  summaryContent: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
});
