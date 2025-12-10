import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  ActivityIndicator, 
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api, getAuthToken, clearAuthTokens } from '../api/client';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// Get screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  overBudgetText: {
    color: '#d32f2f',
    fontWeight: '500',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  section: {
    marginBottom: 20,
  },
  // Category item styles
  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  percentage: {
    fontSize: 12,
    color: '#666',
    marginLeft: 'auto',
  },
  // Transaction item styles
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionMerchant: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  transactionCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  // Empty state styles
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 4,
    marginTop: 16,
  },
  addButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 5,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyText: {
    marginRight: 4,
    fontSize: 14,
    color: '#333',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  dateText: {
    marginHorizontal: 4,
    fontSize: 14,
    color: '#333',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabItem: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  listContent: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
});

// Types
interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage?: number;
  color: string;
}

interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  date: string;
  currency: string;
}

interface Budget {
  categoryId: string;
  categoryName: string;
  budget: number;
  spent: number;
  currency: string;
}

interface DashboardSummary {
  totalSpent: number;
  currency: string;
  categoryTotals: CategoryTotal[];
  recentTransactions: Transaction[];
  monthlyTrend: { date: string; amount: number }[];
  budgets: Budget[];
  startDate: string;
  endDate: string;
}

// Constants
const LOADING_TIMEOUT = 15000; // 15 seconds

// Color palette for charts
const CHART_COLORS = [
  '#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0',
  '#00BCD4', '#FF9800', '#795548', '#607D8B', '#E91E63'
];

const DashboardScreen: React.FC = () => {
  // Refs
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadInProgress = useRef(false);
  
  // State
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseCurrency, setBaseCurrency] = useState<'USD' | 'EUR'>('USD');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)), // Default: last month
    end: new Date()
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'budgets'>('overview');
  
  // Navigation
  const navigation = useNavigation();

  // Format date for API
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Handle navigation to login screen
  const navigateToLogin = useCallback(async () => {
    try {
      await clearAuthTokens();
      navigation.dispatch(
        StackActions.replace('Login')
      );
    } catch (err) {
      console.error('Error during logout:', err);
    }
  }, [navigation]);

  // Load data from API
  const loadData = useCallback(async (isPullToRefresh = false) => {
    if (loadInProgress.current) {
      console.log('[Dashboard] Load already in progress, skipping');
      return;
    }
    
    console.log('[Dashboard] Loading data, isPullToRefresh:', isPullToRefresh);
    
    try {
      loadInProgress.current = true;
      setError(null);
      
      if (!isPullToRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      // Abort any existing requests
      if (abortControllerRef.current) {
        console.log('[Dashboard] Aborting previous request');
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      // Set a timeout to abort the request if it takes too long
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          console.log('[Dashboard] Request timeout');
          abortControllerRef.current.abort();
        }
      }, LOADING_TIMEOUT);
      
      // Get auth token
      const token = await getAuthToken();
      if (!token) {
        console.log('[Dashboard] No auth token, redirecting to login');
        await navigateToLogin();
        return;
      }
      
      console.log('[Dashboard] Making API request');
      
      // Format dates for API
      const fromDate = formatDate(dateRange.start);
      const toDate = formatDate(dateRange.end);
      
      // Make the API request
      console.log('[Dashboard] Making API request to /api/v1/dashboard/summary with params:', {
        from: fromDate,
        to: toDate,
        base: baseCurrency
      });
      
      const response = await api.get('/api/v1/dashboard/summary', {
        params: { 
          from: fromDate, 
          to: toDate, 
          base: baseCurrency 
        },
        signal: abortControllerRef.current.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('[Dashboard] API response received:', {
        status: response.status,
        data: response.data,
        headers: response.headers
      });
      
      if (isMounted.current) {
        console.log('[Dashboard] Updating state with new data');
        console.log('Summary data:', response.data);
        console.log('Category totals:', response.data?.categoryTotals);
        setSummary(response.data);
      }
    } catch (err) {
      console.error('[Dashboard] Error loading data:', err);
      
      if (isMounted.current) {
        if (err.name === 'AbortError') {
          console.log('[Dashboard] Request was aborted');
          if (isPullToRefresh) {
            setError('Request was cancelled');
          }
        } else if (err.response?.status === 401) {
          console.log('[Dashboard] Unauthorized, logging out');
          await clearAuthTokens();
          await navigateToLogin();
        } else {
          const errorMessage = err.response?.data?.message || 'Failed to load dashboard data. Please try again.';
          console.log(`[Dashboard] Error: ${errorMessage}`);
          setError(errorMessage);
        }
      }
    } finally {
      console.log('[Dashboard] Cleaning up');
      
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
      
      loadInProgress.current = false;
    }
  }, [baseCurrency, navigateToLogin]);

  // Handle pull to refresh
  const handleRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  // Toggle base currency
  const toggleBaseCurrency = useCallback(() => {
    setBaseCurrency(prev => prev === 'USD' ? 'EUR' : 'USD');
  }, []);

  // Handle date change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateRange(prev => ({
        ...prev,
        [showDatePicker ? 'end' : 'start']: selectedDate
      }));
    }
  };

  // Render chart data
  const getChartData = () => {
    if (!summary?.categoryTotals?.length) return [];
    
    return summary.categoryTotals.map((cat, index) => ({
      name: cat.categoryName,
      amount: cat.total,
      color: CHART_COLORS[index % CHART_COLORS.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }));
  };

  // Render trend data
  const getTrendData = () => {
    if (!summary?.monthlyTrend?.length) return [];
    
    return {
      labels: summary.monthlyTrend.map(item => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [{
        data: summary.monthlyTrend.map(item => item.amount),
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };

  // Render budget progress
  const renderBudgetItem = (budget: Budget) => {
    const progress = (budget.spent / budget.budget) * 100;
    const isOverBudget = progress > 100;
    
    return (
      <View key={budget.categoryId} style={styles.budgetItem}>
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetCategory}>{budget.categoryName}</Text>
          <Text style={styles.budgetAmount}>
            {budget.spent.toFixed(2)} / {budget.budget.toFixed(2)} {budget.currency}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, progress)}%`,
                backgroundColor: isOverBudget ? '#F44336' : '#4CAF50',
              },
            ]}
          />
        </View>
        <Text style={[
          styles.budgetProgressText,
          isOverBudget && styles.overBudgetText
        ]}>
          {progress.toFixed(1)}% {isOverBudget ? '(Over Budget)' : ''}
        </Text>
      </View>
    );
  };

  // Initial load and cleanup
  useEffect(() => {
    console.log('[Dashboard] Component mounted');
    isMounted.current = true;
    
    // Flag to prevent state updates after unmount
    let isSubscribed = true;
    
    // Load data if component is still mounted after a short delay
    const loadDataIfMounted = async () => {
      if (isSubscribed) {
        await loadData();
      }
    };
    
    loadDataIfMounted();
    
    return () => {
      console.log('[Dashboard] Component unmounting');
      isMounted.current = false;
      isSubscribed = false;
      
      // Abort any pending requests
      if (abortControllerRef.current) {
        console.log('[Dashboard] Aborting pending requests');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Reset loading states
      setLoading(false);
      setRefreshing(false);
    };
  }, [loadData]);

  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => loadData()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {/* Date Range Selector */}
            <View style={styles.dateRangeContainer}>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="date-range" size={20} color="#4CAF50" />
                <Text style={styles.dateText}>
                  {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Spent</Text>
                <Text style={styles.summaryAmount}>
                  {summary?.totalSpent?.toFixed(2) || '0.00'} {summary?.currency || baseCurrency}
                </Text>
                <Text style={styles.summarySubtext}>
                  {summary?.categoryTotals?.length || 0} categories
                </Text>
              </View>
              
              <View style={[styles.summaryCard, styles.budgetCard]}>
                <Text style={styles.summaryLabel}>Budget Status</Text>
                <Text style={styles.summaryAmount}>
                  {summary?.budgets?.reduce((acc, b) => acc + b.spent, 0)?.toFixed(2) || '0.00'}
                  <Text style={styles.currencySymbol}> {summary?.currency || baseCurrency}</Text>
                </Text>
                <Text style={styles.summarySubtext}>
                  of {summary?.budgets?.reduce((acc, b) => acc + b.budget, 0)?.toFixed(2) || '0.00'} budgeted
                </Text>
              </View>
            </View>

            {/* Expense Trend */}
            {summary?.monthlyTrend?.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.sectionTitle}>Spending Trend</Text>
                <LineChart
                  data={getTrendData()}
                  width={SCREEN_WIDTH - 40}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#4CAF50'
                    }
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            )}

            {/* Categories Breakdown */}
            {summary?.categoryTotals?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Spending by Category</Text>
                <PieChart
                  data={getChartData()}
                  width={SCREEN_WIDTH - 40}
                  height={200}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                  style={styles.chart}
                />
                <FlatList
                  data={summary.categoryTotals}
                  keyExtractor={(item) => item.categoryId}
                  renderItem={({ item, index }) => (
                    <View style={styles.categoryItem}>
                      <View style={styles.categoryColor} 
                        backgroundColor={CHART_COLORS[index % CHART_COLORS.length]} />
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {item.categoryName}
                      </Text>
                      <Text style={styles.categoryAmount}>
                        {item.total.toFixed(2)} {summary.currency}
                        <Text style={styles.percentage}>
                          {' '}({item.percentage?.toFixed(1) || 0}%)
                        </Text>
                      </Text>
                    </View>
                  )}
                />
              </View>
            )}
          </>
        );

      case 'transactions':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {summary?.recentTransactions?.length > 0 ? (
              <FlatList
                data={summary.recentTransactions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.transactionItem}>
                    <View style={styles.transactionIcon}>
                      <MaterialIcons name="receipt" size={24} color="#4CAF50" />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionMerchant} numberOfLines={1}>
                        {item.merchant}
                      </Text>
                      <Text style={styles.transactionCategory} numberOfLines={1}>
                        {item.category}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {new Date(item.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.transactionAmount}>
                      {item.amount.toFixed(2)} {item.currency}
                    </Text>
                  </View>
                )}
              />
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="receipt" size={48} color="#E0E0E0" />
                <Text style={styles.emptyStateText}>No recent transactions</Text>
              </View>
            )}
          </View>
        );

      case 'budgets':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Overview</Text>
            {summary?.budgets?.length > 0 ? (
              <FlatList
                data={summary.budgets}
                keyExtractor={(item) => item.categoryId}
                renderItem={({ item }) => renderBudgetItem(item)}
              />
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="account-balance-wallet" size={48} color="#E0E0E0" />
                <Text style={styles.emptyStateText}>No budgets set up</Text>
                <TouchableOpacity style={styles.addButton}>
                  <Text style={styles.addButtonText}>Create Budget</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.currencyButton} 
            onPress={toggleBaseCurrency}
          >
            <Text style={styles.currencyButtonText}>
              {baseCurrency}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <MaterialIcons 
            name="dashboard" 
            size={20} 
            color={activeTab === 'overview' ? '#4CAF50' : '#757575'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'overview' && styles.activeTabText
          ]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <MaterialIcons 
            name="receipt" 
            size={20} 
            color={activeTab === 'transactions' ? '#4CAF50' : '#757575'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'transactions' && styles.activeTabText
          ]}>
            Transactions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'budgets' && styles.activeTab]}
          onPress={() => setActiveTab('budgets')}
        >
          <MaterialIcons 
            name="account-balance-wallet" 
            size={20} 
            color={activeTab === 'budgets' ? '#4CAF50' : '#757575'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'budgets' && styles.activeTabText
          ]}>
            Budgets
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {renderTabContent()}
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={dateRange.start}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <FlatList
        data={summary?.categoryTotals || []}
        keyExtractor={(item) => item.categoryId}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={styles.summaryAmount}>
              {summary?.totalSpent?.toFixed(2) || '0.00'} {summary?.currency || baseCurrency}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.categoryCard}>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{item.categoryName}</Text>
              <Text style={styles.categoryAmount}>
                {item.total.toFixed(2)} {summary?.currency || baseCurrency}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (item.total / (summary?.totalSpent || 1)) * 100)}%`,
                    backgroundColor: '#4CAF50',
                  },
                ]}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No expenses found</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddExpense')}>
              <Text style={styles.addButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  // Section styles
  section: {
    marginBottom: 20,
  },
  // Category item styles
  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  percentage: {
    fontSize: 12,
    color: '#666',
    marginLeft: 'auto',
  },
  // Transaction item styles
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionMerchant: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  transactionCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  // Empty state styles
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 4,
    marginTop: 16,
  },
  addButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 5,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  
  // Date Range
  dateRangeContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  // Summary Cards
  summaryRow: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 0,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  budgetCard: {
    marginRight: 0,
    marginLeft: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  summarySubtext: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  listContent: {
    paddingBottom: 20,
  },
  categoryCard: {
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4CAF50',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default DashboardScreen;
