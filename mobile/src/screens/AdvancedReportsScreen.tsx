import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';

const { width } = Dimensions.get('window');

interface MonthlyData {
  month: string;
  count: number;
  total: number;
}

interface CompanyData {
  companyId: number;
  companyName: string;
  memberCount: number;
  expenseCount: number;
  totalExpenses: number;
  pendingReimbursements: number;
}

interface UserActivityData {
  userId: number;
  userName: string;
  userEmail: string;
  role: string;
  expenseCount: number;
  totalAmount: number;
}

type ReportType = 'monthly' | 'companies' | 'users';

export default function AdvancedReportsScreen() {
  const navigation = useNavigation();
  const [activeReport, setActiveReport] = useState<ReportType>('monthly');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Monthly Report Data
  const [monthlyPeriod, setMonthlyPeriod] = useState(6);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState({ expenses: 0, amount: 0 });

  // Company Report Data
  const [companyData, setCompanyData] = useState<CompanyData[]>([]);

  // User Activity Data
  const [topN, setTopN] = useState(10);
  const [userData, setUserData] = useState<UserActivityData[]>([]);

  const loadMonthlyReport = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Reports] Loading monthly report:', monthlyPeriod);
      const response = await api.get(`/api/v1/admin/reports/monthly?months=${monthlyPeriod}`);
      console.log('[Reports] Monthly data loaded:', response.data);
      
      setMonthlyData(response.data.data || []);
      setMonthlyTotal({
        expenses: response.data.totalExpenses || 0,
        amount: response.data.totalAmount || 0,
      });
    } catch (error: any) {
      console.error('[Reports] Error loading monthly:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load monthly report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthlyPeriod]);

  const loadCompanyReport = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Reports] Loading company report');
      const response = await api.get('/api/v1/admin/reports/companies');
      console.log('[Reports] Company data loaded:', response.data.length);
      setCompanyData(response.data || []);
    } catch (error: any) {
      console.error('[Reports] Error loading companies:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load company report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadUserReport = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Reports] Loading user report:', topN);
      const response = await api.get(`/api/v1/admin/reports/users?top=${topN}`);
      console.log('[Reports] User data loaded:', response.data.length);
      setUserData(response.data || []);
    } catch (error: any) {
      console.error('[Reports] Error loading users:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load user report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [topN]);

  useEffect(() => {
    switch (activeReport) {
      case 'monthly':
        loadMonthlyReport();
        break;
      case 'companies':
        loadCompanyReport();
        break;
      case 'users':
        loadUserReport();
        break;
    }
  }, [activeReport, loadMonthlyReport, loadCompanyReport, loadUserReport]);

  const handleRefresh = () => {
    setRefreshing(true);
    switch (activeReport) {
      case 'monthly':
        loadMonthlyReport();
        break;
      case 'companies':
        loadCompanyReport();
        break;
      case 'users':
        loadUserReport();
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const renderMonthlyReport = () => (
    <View style={styles.reportContent}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <MaterialIcons name="receipt" size={32} color="#6366F1" />
          <Text style={styles.summaryValue}>{monthlyTotal.expenses}</Text>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
        </View>
        <View style={styles.summaryCard}>
          <MaterialIcons name="attach-money" size={32} color="#10B981" />
          <Text style={styles.summaryValue}>{formatCurrency(monthlyTotal.amount)}</Text>
          <Text style={styles.summaryLabel}>Total Amount</Text>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {[3, 6, 12].map(months => (
          <TouchableOpacity
            key={months}
            style={[
              styles.periodButton,
              monthlyPeriod === months && styles.periodButtonActive
            ]}
            onPress={() => setMonthlyPeriod(months)}
          >
            <Text style={[
              styles.periodButtonText,
              monthlyPeriod === months && styles.periodButtonTextActive
            ]}>
              {months} Months
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Monthly Data */}
      <View style={styles.dataSection}>
        <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
        {monthlyData.map((item, index) => (
          <View key={index} style={styles.dataRow}>
            <View style={styles.dataLeft}>
              <MaterialIcons name="calendar-today" size={20} color="#6366F1" />
              <Text style={styles.dataMonth}>{item.month}</Text>
            </View>
            <View style={styles.dataRight}>
              <Text style={styles.dataCount}>{item.count} expenses</Text>
              <Text style={styles.dataAmount}>{formatCurrency(item.total)}</Text>
            </View>
          </View>
        ))}
        {monthlyData.length === 0 && (
          <Text style={styles.emptyText}>No data available for this period</Text>
        )}
      </View>
    </View>
  );

  const renderCompanyReport = () => (
    <View style={styles.reportContent}>
      <View style={styles.dataSection}>
        <Text style={styles.sectionTitle}>Company Comparison</Text>
        {companyData.map((company, index) => (
          <View key={company.companyId} style={styles.companyCard}>
            <View style={styles.companyHeader}>
              <View style={styles.companyRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{company.companyName}</Text>
                <View style={styles.companyStats}>
                  <View style={styles.statItem}>
                    <MaterialIcons name="people" size={14} color="#6B7280" />
                    <Text style={styles.statText}>{company.memberCount} members</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialIcons name="receipt" size={14} color="#6B7280" />
                    <Text style={styles.statText}>{company.expenseCount} expenses</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.companyMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Expenses</Text>
                <Text style={styles.metricValue}>{formatCurrency(company.totalExpenses)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Pending Reimbursements</Text>
                <Text style={[styles.metricValue, { color: '#F59E0B' }]}>
                  {company.pendingReimbursements}
                </Text>
              </View>
            </View>
          </View>
        ))}
        {companyData.length === 0 && (
          <Text style={styles.emptyText}>No companies found</Text>
        )}
      </View>
    </View>
  );

  const renderUserReport = () => (
    <View style={styles.reportContent}>
      {/* Top N Selector */}
      <View style={styles.periodSelector}>
        {[5, 10, 20].map(n => (
          <TouchableOpacity
            key={n}
            style={[
              styles.periodButton,
              topN === n && styles.periodButtonActive
            ]}
            onPress={() => setTopN(n)}
          >
            <Text style={[
              styles.periodButtonText,
              topN === n && styles.periodButtonTextActive
            ]}>
              Top {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.dataSection}>
        <Text style={styles.sectionTitle}>Most Active Users</Text>
        {userData.map((user, index) => (
          <View key={user.userId} style={styles.userCard}>
            <View style={styles.userRank}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.userName}</Text>
              <Text style={styles.userEmail}>{user.userEmail}</Text>
              <View style={styles.userStats}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{user.role}</Text>
                </View>
                <Text style={styles.userCount}>{user.expenseCount} expenses</Text>
              </View>
            </View>
            <View style={styles.userAmount}>
              <Text style={styles.amountValue}>{formatCurrency(user.totalAmount)}</Text>
            </View>
          </View>
        ))}
        {userData.length === 0 && (
          <Text style={styles.emptyText}>No user data available</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Advanced Reports</Text>
          <Text style={styles.subtitle}>Analytics & Insights</Text>
        </View>
      </View>

      {/* Report Type Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeReport === 'monthly' && styles.tabActive]}
          onPress={() => setActiveReport('monthly')}
        >
          <MaterialIcons
            name="trending-up"
            size={20}
            color={activeReport === 'monthly' ? '#6366F1' : '#6B7280'}
          />
          <Text style={[
            styles.tabText,
            activeReport === 'monthly' && styles.tabTextActive
          ]}>
            Monthly Trends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeReport === 'companies' && styles.tabActive]}
          onPress={() => setActiveReport('companies')}
        >
          <MaterialIcons
            name="business"
            size={20}
            color={activeReport === 'companies' ? '#6366F1' : '#6B7280'}
          />
          <Text style={[
            styles.tabText,
            activeReport === 'companies' && styles.tabTextActive
          ]}>
            Companies
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeReport === 'users' && styles.tabActive]}
          onPress={() => setActiveReport('users')}
        >
          <MaterialIcons
            name="people"
            size={20}
            color={activeReport === 'users' ? '#6366F1' : '#6B7280'}
          />
          <Text style={[
            styles.tabText,
            activeReport === 'users' && styles.tabTextActive
          ]}>
            Users
          </Text>
        </TouchableOpacity>
      </View>

      {/* Report Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} />
        }
      >
        {activeReport === 'monthly' && renderMonthlyReport()}
        {activeReport === 'companies' && renderCompanyReport()}
        {activeReport === 'users' && renderUserReport()}
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  reportContent: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  dataSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dataLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  dataRight: {
    alignItems: 'flex-end',
  },
  dataCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  dataAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 2,
  },
  companyCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  companyHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  companyRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  companyStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  companyMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  userRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#E0E7FF',
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
  },
  userCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  userAmount: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9CA3AF',
    paddingVertical: 32,
  },
});
