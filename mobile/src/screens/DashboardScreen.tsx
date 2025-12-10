import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
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
  Dimensions,
  Modal,
  Animated,
  Easing,
  Alert,
  TextInput,
  StatusBar,
  Platform
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { companiesService } from '../api/companyService';
import { CompanyMemberService } from '../api/companyMemberService';
import { useNotifications } from '../context/NotificationsContext';
import { useTheme } from '../components/ThemeView';
import { radius, space } from '../theme/tokens';
import { api } from '../api/client';
import { getTransactions as getApiTransactions, Transaction as ApiTransaction } from '../api/transactionService';
import { ExpenseService, Expense as ApiExpense } from '../api/expenseService';
import { LineChart, PieChart } from 'react-native-chart-kit';
 

// Module-scoped guards to stop repeated fetches across remounts
let DASHBOARD_FETCH_INFLIGHT = false;
let DASHBOARD_LAST_FETCH_MS = 0;
let DASHBOARD_PREV_SNAPSHOT = "";
let DASHBOARD_LAST_MOUNT_MS = 0;
let DASHBOARD_MOUNT_COUNT = 0;

// Types
type DashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

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
const CHART_COLORS = [
  '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336',
  '#00BCD4', '#673AB7', '#FF5722', '#607D8B', '#8BC34A'
];
const SHOW_HEAVY = true; // re-enable charts and lists now that update loop is mitigated


const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { activeCompanyId, activeCompany, setActiveCompanyId } = useCompany();
  const route = useRoute<any>();
  const fromCompany = route?.params?.fromCompany === true;
  const passedCompanyId = route?.params?.companyId;
  const hasRouteCompany = fromCompany === true || (passedCompanyId !== undefined && passedCompanyId !== null && !Number.isNaN(Number(passedCompanyId)));
  const hasContextCompany = activeCompanyId !== null && activeCompanyId !== undefined; // allow any non-null (including demo IDs)
  const isCompanyMode = hasRouteCompany || hasContextCompany;
  // Ensure context reflects route to prevent badge flicker to Personal on first render
  useEffect(() => {
    if (hasRouteCompany && !hasContextCompany && passedCompanyId != null) {
      try { setActiveCompanyId(Number(passedCompanyId)); } catch {}
    }
  }, [hasRouteCompany, passedCompanyId, hasContextCompany, setActiveCompanyId]);
  const { theme } = useTheme();
  const { unreadCount, refreshUnread } = useNotifications();
  const auth = useAuth();
  const userEmail = auth?.email; // fallback if name not available
  const displayName = React.useMemo(() => {
    const rawName = (auth as any)?.name as string | undefined;
    if (rawName && String(rawName).trim().length > 0) return String(rawName).trim();
    if (!userEmail) return 'User';
    const namePart = String(userEmail).split('@')[0] || 'User';
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }, [auth, userEmail]);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'budgets'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<ApiTransaction | null>(null);
  const [showModeDetails, setShowModeDetails] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const detailScale = React.useRef(new Animated.Value(0.8)).current;
  const detailOpacity = React.useRef(new Animated.Value(0)).current;
  const [showCatDetails, setShowCatDetails] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [apiTransactions, setApiTransactions] = useState<ApiTransaction[]>([]);
  const [trendGranularity, setTrendGranularity] = useState<'day'|'week'|'month'|'year'>('month');
  const [trendData, setTrendData] = useState<{ date: string; amount: number }[]>([]);
  // Guards to prevent re-entrant fetches and state updates after unmount
  const isFetching = React.useRef(false);
  const isMounted = React.useRef(true);
  const isFetchingTx = React.useRef(false);
  const hasFetched = React.useRef(false);
  const prevSnapshot = React.useRef<string>("");
  const prevScopeKey = React.useRef<string>("");
  // Track notified budgets to prevent duplicate notifications
  const notifiedBudgets = React.useRef<Record<string, { threshold80: boolean; threshold90: boolean }>>({});
  
  // Format numbers in Indian Rupees
  const formatINR = useCallback((amt: number) => {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(amt||0));
    } catch {
      return `₹${Number(amt||0).toFixed(2)}`;
    }
  }, [activeCompanyId, isCompanyMode]);
  
  // Mock data - replace with actual API calls
  const [dashboardData, setDashboardData] = useState<DashboardSummary>({
    totalSpent: 0,
    currency: 'INR',
    categoryTotals: [],
    recentTransactions: [],
    monthlyTrend: [],
    budgets: [],
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Fetch expenses in range and compute INR totals, categories, monthly trend, recent list
  const fetchDashboardData = useCallback(async (force: boolean = false) => {
    // Allow concurrent fetches to be queued if scope changed
    const nowMs = Date.now();
    // Throttle repeated triggers within 3 seconds unless forced (e.g., on focus)
    if (!force) {
      if (nowMs - DASHBOARD_LAST_FETCH_MS < 3000) return;
      if (DASHBOARD_FETCH_INFLIGHT) return;
    }
    // Wait for any in-flight to finish
    while (isFetching.current) {
      await new Promise(r => setTimeout(r, 100));
    }
    isFetching.current = true;
    DASHBOARD_FETCH_INFLIGHT = true;
    if (isMounted.current) setLoading(true);
    try {
      // Current month range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const from = startOfMonth.toISOString().slice(0,10);
      const to = now.toISOString().slice(0,10);
      // Use Axios-based service so auth/token/handlers apply
      const params: any = { from, to };
      const expenses = await ExpenseService.getExpenses(params, 0, 1000, { fromCompany: isCompanyMode, companyId: activeCompanyId || undefined });

      // Build distinct (currency,date) where currency != INR and baseAmount missing
      const key = (c:string, d:string)=>`${c}|${d}`;
      const neededRates = new Set<string>();
      (expenses as any[]).forEach((e: any) => {
        const cur = String(e.currency||'').toUpperCase();
        const dt = String(e.occurredOn||e.date||'').slice(0,10);
        const hasBase = typeof e.baseAmount === 'number' && String(e.baseCurrency||'').toUpperCase() === 'INR';
        if (cur && cur !== 'INR' && dt && !hasBase) neededRates.add(key(cur, dt));
      });

      // Fetch historical FX per pair
      const rateMap = new Map<string, number>();
      await Promise.all(Array.from(neededRates).map(async (k) => {
        const [cur, dt] = k.split('|');
        try {
          const r = await fetch(`https://api.exchangerate.host/${dt}?base=${encodeURIComponent(cur)}&symbols=INR`);
          const j = await r.json();
          const rate = Number(j?.rates?.INR);
          if (rate && isFinite(rate) && rate > 0) rateMap.set(k, rate);
        } catch {}
      }));

      // Compute INR amount for each expense
      type CatAgg = { name: string; inr: number };
      const byCategory = new Map<string, CatAgg>();
      let totalInr = 0;
      const recent: Transaction[] = [];
      (expenses as any[]).sort((a,b)=> new Date(b.occurredOn||b.date||'').getTime() - new Date(a.occurredOn||a.date||'').getTime());
      for (const e of (expenses as any[])) {
        const cur = String(e.currency||'').toUpperCase();
        const dt = String(e.occurredOn||e.date||'').slice(0,10);
        let inr = 0;
        if (String(e.baseCurrency||'').toUpperCase() === 'INR' && typeof e.baseAmount === 'number') {
          inr = Number(e.baseAmount) || 0;
        } else if (cur === 'INR') {
          inr = Number(e.amount)||0;
        } else {
          const r = rateMap.get(key(cur, dt));
          inr = r ? (Number(e.amount)||0) * r : (Number(e.amount)||0);
        }
        totalInr += inr;
        const catName = e.category?.name || e.categoryName || 'Uncategorized';
        const agg = byCategory.get(catName) || { name: catName, inr: 0 };
        agg.inr += inr;
        byCategory.set(catName, agg);
      }

      // Category totals with percentages and colors
      const catTotals = Array.from(byCategory.values());
      const grand = totalInr || 1;
      const categoryTotals: CategoryTotal[] = catTotals.map((c, idx) => ({
        categoryId: String(idx+1),
        categoryName: c.name,
        total: c.inr,
        percentage: Math.round((c.inr/grand)*100),
        color: CHART_COLORS[idx % CHART_COLORS.length],
      })).sort((a,b)=> b.total - a.total);

      // Monthly trend: bucket by month (YYYY-MM) within range, sum INR
      const buckets = new Map<string, number>();
      for (const e of (expenses as any[])) {
        const dt = new Date(e.occurredOn||e.date||new Date());
        const ym = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
        let inr = 0;
        const cur = String(e.currency||'').toUpperCase();
        const d = String(e.occurredOn||e.date||'').slice(0,10);
        if (String(e.baseCurrency||'').toUpperCase() === 'INR' && typeof e.baseAmount === 'number') inr = Number(e.baseAmount)||0;
        else if (cur === 'INR') inr = Number(e.amount)||0;
        else {
          const r = rateMap.get(key(cur, d));
          inr = r ? (Number(e.amount)||0) * r : (Number(e.amount)||0);
        }
        buckets.set(ym, (buckets.get(ym)||0) + inr);
      }
      const monthlyTrend = Array.from(buckets.entries()).sort((a,b)=> a[0].localeCompare(b[0])).map(([date, amount]) => ({ date: `${date}-01`, amount }));

      // Recent transactions (top 10)
      const recentTransactions: Transaction[] = (expenses as any[]).slice(0,10).map((e: any)=>({
        id: String(e.id||Math.random()),
        amount: Number(e.amount)||0,
        merchant: e.merchant || e.description || 'Expense',
        category: e.category?.name || e.categoryName || 'Uncategorized',
        date: String(e.occurredOn||e.date||new Date()).slice(0,10),
        currency: String(e.currency||'INR')
      }));

      if (!isMounted.current) { return; }
      const next = {
        totalSpent: totalInr,
        currency: 'INR',
        categoryTotals,
        recentTransactions,
        monthlyTrend,
        budgets: [],
        startDate: from,
        endDate: to,
      } as const;
      // Always update state to ensure UI reflects current mode
      setDashboardData(next as any);
      // initialize trendData for default 'month' view
      setTrendData(next.monthlyTrend as any);
      const snapshot = JSON.stringify(next);
      prevSnapshot.current = snapshot;
      DASHBOARD_PREV_SNAPSHOT = snapshot;
      if (isMounted.current) setLoading(false);
      hasFetched.current = true;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Reset to empty state on error to avoid showing stale data
      if (isMounted.current) {
        setDashboardData({
          totalSpent: 0,
          currency: 'INR',
          categoryTotals: [],
          recentTransactions: [],
          monthlyTrend: [],
          budgets: [],
          startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        });
      }
      if (isMounted.current) setLoading(false);
    }
    finally {
      isFetching.current = false;
      DASHBOARD_FETCH_INFLIGHT = false;
      hasFetched.current = true;
      DASHBOARD_LAST_FETCH_MS = Date.now();
    }
  }, [isCompanyMode, activeCompanyId]);

  // Load trend with selected granularity and scope
  const loadTrend = useCallback(async (granularity: 'day'|'week'|'month'|'year') => {
    try {
      const now = new Date();
      let from: string;
      let to: string = now.toISOString().slice(0,10);
      if (granularity === 'day') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        from = startOfMonth.toISOString().slice(0,10);
      } else if (granularity === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7*11); // last 12 weeks approx
        from = start.toISOString().slice(0,10);
      } else if (granularity === 'month') {
        const start = new Date(now);
        start.setMonth(now.getMonth() - 11); // last 12 months
        start.setDate(1);
        from = start.toISOString().slice(0,10);
      } else { // year
        const start = new Date(now.getFullYear() - 4, 0, 1); // last 5 years
        from = start.toISOString().slice(0,10);
      }
      const params: any = { from, to };
      const expenses = await ExpenseService.getExpenses(params, 0, 2000, { fromCompany: isCompanyMode, companyId: activeCompanyId || undefined });
      const key = (c:string, d:string)=>`${c}|${d}`;
      const neededRates = new Set<string>();
      (expenses as any[]).forEach((e: any) => {
        const cur = String(e.currency||'').toUpperCase();
        const dt = String(e.occurredOn||e.date||'').slice(0,10);
        const hasBase = typeof e.baseAmount === 'number' && String(e.baseCurrency||'').toUpperCase() === 'INR';
        if (cur && cur !== 'INR' && dt && !hasBase) neededRates.add(key(cur, dt));
      });
      const rateMap = new Map<string, number>();
      await Promise.all(Array.from(neededRates).map(async (k) => {
        const [cur, dt] = k.split('|');
        try {
          const r = await fetch(`https://api.exchangerate.host/${dt}?base=${encodeURIComponent(cur)}&symbols=INR`);
          const j = await r.json();
          const rate = Number(j?.rates?.INR);
          if (rate && isFinite(rate) && rate > 0) rateMap.set(k, rate);
        } catch {}
      }));
      // bucket by granularity
      const buckets = new Map<string, number>();
      const addAmt = (k: string, amt: number) => buckets.set(k, (buckets.get(k)||0)+amt);
      for (const e of (expenses as any[])) {
        const dStr = String(e.occurredOn||e.date||'').slice(0,10);
        if (!dStr) continue;
        const d = new Date(dStr);
        const cur = String(e.currency||'').toUpperCase();
        let inr = 0;
        if (String(e.baseCurrency||'').toUpperCase() === 'INR' && typeof e.baseAmount === 'number') inr = Number(e.baseAmount)||0;
        else if (cur === 'INR') inr = Number(e.amount)||0;
        else {
          const r = rateMap.get(key(cur, dStr));
          inr = r ? (Number(e.amount)||0) * r : (Number(e.amount)||0);
        }
        if (granularity === 'day') {
          addAmt(dStr, inr);
        } else if (granularity === 'week') {
          // week key as YYYY-Www (ISO week-ish: use Thursday of this week)
          const wd = new Date(d);
          const day = (wd.getDay()+6)%7; // 0..6 Mon..Sun
          wd.setDate(wd.getDate()-day); // Monday
          const year = wd.getFullYear();
          const jan1 = new Date(year,0,1);
          const week = Math.floor((((wd.getTime()-jan1.getTime())/86400000)+jan1.getDay()+1)/7)+1;
          const keyW = `${year}-W${String(week).padStart(2,'0')}`;
          addAmt(keyW, inr);
        } else if (granularity === 'month') {
          const keyM = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          addAmt(keyM, inr);
        } else {
          const keyY = `${d.getFullYear()}`;
          addAmt(keyY, inr);
        }
      }
      const sorted = Array.from(buckets.entries()).sort((a,b)=> a[0].localeCompare(b[0]))
        .map(([k,v]) => {
          if (granularity === 'day') return { date: k, amount: v };
          if (granularity === 'week') return { date: `${k}`, amount: v };
          if (granularity === 'month') return { date: `${k}-01`, amount: v };
          return { date: `${k}-01-01`, amount: v };
        });
      setTrendData(sorted);
    } catch (e) {
      // non-fatal
    }
  }, [isCompanyMode, activeCompanyId]);

  useEffect(() => {
    loadTrend(trendGranularity);
  }, [trendGranularity, loadTrend]);

  // Load user's role in active company
  useFocusEffect(
    useCallback(() => {
      if (isCompanyMode && activeCompanyId) {
        loadUserRole();
      } else {
        setUserRole(null);
      }
    }, [isCompanyMode, activeCompanyId])
  );

  const loadUserRole = async () => {
    try {
      const companies = await CompanyMemberService.getMyCompanies();
      const currentCompany = companies.find(c => c.id === activeCompanyId);
      if (currentCompany) {
        setUserRole(currentCompany.userRole);
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error('[Dashboard] Error loading user role:', error);
      setUserRole(null);
    }
  };

  // Ensure the initial fetch runs only once per mount, even in dev remounts
  const didKickoff = React.useRef(false);
  // Re-fetch when screen gains focus or scope changes (personal/company)
  useFocusEffect(
    useCallback(() => {
      const scopeKey = isCompanyMode ? `company:${activeCompanyId}` : 'personal';
      if (prevScopeKey.current !== scopeKey) {
        // reset throttles/guards on scope switch
        DASHBOARD_LAST_FETCH_MS = 0;
        DASHBOARD_FETCH_INFLIGHT = false;
        hasFetched.current = false;
        isFetching.current = false;
        prevScopeKey.current = scopeKey;
        // Clear stale data immediately when switching modes
        setDashboardData({
          totalSpent: 0,
          currency: 'INR',
          categoryTotals: [],
          recentTransactions: [],
          monthlyTrend: [],
          budgets: [],
          startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        });
      }
      isMounted.current = true;
      setLoading(true);
      // Force a refetch on focus to avoid stale/empty state when re-entering
      fetchDashboardData(true);
      return () => { isMounted.current = false; };
    }, [isCompanyMode, activeCompanyId, fetchDashboardData])
  );

  // Fetch transactions when Transactions tab becomes active
  useEffect(() => {
    const fetchTx = async () => {
      if (activeTab !== 'transactions') return;
      if (isFetchingTx.current) return;
      isFetchingTx.current = true;
      try {
        if (isMounted.current) setLoadingTransactions(true);
        const tx = await getApiTransactions();
        if (isMounted.current) setApiTransactions(tx);
      } catch (e) {
        console.error('[Dashboard] Failed to load transactions', e);
      } finally {
        if (isMounted.current) setLoadingTransactions(false);
        isFetchingTx.current = false;
      }
    };
    fetchTx();
  }, [activeTab]);

  const openDetail = (tx: ApiTransaction) => {
    setSelectedTx(tx);
    setDetailVisible(true);
    // animate in
    Animated.parallel([
      Animated.timing(detailScale, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(detailOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeDetail = () => {
    Animated.parallel([
      Animated.timing(detailScale, {
        toValue: 0.9,
        duration: 140,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(detailOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      })
    ]).start(() => {
      setDetailVisible(false);
      setSelectedTx(null);
      detailScale.setValue(0.8);
      detailOpacity.setValue(0);
    });
  };

  const onRefresh = useCallback(() => {
    if (isFetching.current) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    const jobs: Promise<any>[] = [fetchDashboardData()];
    if (activeTab === 'transactions') {
      jobs.push(
        (async () => {
          try {
            const tx = await getApiTransactions();
            if (isMounted.current) setApiTransactions(tx);
          } catch (e) {
            console.error('[Dashboard] Refresh transactions failed', e);
          }
        })()
      );
    }
    Promise.allSettled(jobs).then(() => { if (isMounted.current) setRefreshing(false); });
  }, [fetchDashboardData]);

  // No date handlers on Dashboard; filters live on Expenses/Budgets screens

  // Render list items
  const renderCategoryItem = ({ item }: { item: CategoryTotal }) => (
    <View style={styles.categoryItem}>
      <View style={[styles.categoryColor, { backgroundColor: item.color }]} />
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.categoryName}</Text>
        <Text style={styles.categoryPercentage}>{item.percentage}%</Text>
      </View>
      <Text style={styles.categoryAmount}>${item.total.toFixed(2)}</Text>
    </View>
  );

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity 
      style={styles.transactionItem}
      onPress={() => navigation.navigate('Expenses')}
    >
      <View style={styles.transactionIcon}>
        <MaterialIcons name="receipt" size={24} color="#666" />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionMerchant}>{item.merchant}</Text>
        <Text style={styles.transactionCategory}>{item.category}</Text>
      </View>
      <View style={styles.transactionAmountContainer}>
        <Text style={styles.transactionAmount}>-${item.amount.toFixed(2)}</Text>
        <Text style={styles.transactionDate}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );

  // Renderer for API transactions from backend /api/v1/transactions
  const renderApiTransactionItem = ({ item }: { item: ApiTransaction }) => (
    <TouchableOpacity 
      style={styles.transactionItem}
      onPress={() => openDetail(item)}
    >
      <View style={styles.transactionIcon}>
        <MaterialIcons name="receipt" size={24} color="#666" />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionMerchant}>{item.description}</Text>
        <Text style={styles.transactionCategory}>{item.category} • {item.type}</Text>
      </View>
      <View style={styles.transactionAmountContainer}>
        <Text style={styles.transactionAmount}>{item.type === 'INCOME' ? '+' : item.type === 'EXPENSE' ? '-' : ''}{item.amount.toFixed(2)}</Text>
        <Text style={styles.transactionDate}>{new Date(item.transactionDate).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderBudgetItem = ({ item }: { item: Budget }) => {
    const progress = Math.min((item.spent / item.budget) * 100, 100);
    const isOverBudget = item.spent > item.budget;
    const percentage = (item.spent / item.budget) * 100;
    
    // Check for 80% and 90% thresholds and create notifications
    React.useEffect(() => {
      const checkThreshold = async () => {
        try {
          const budgetKey = `${item.categoryId}-${item.categoryName}`;
          
          // Initialize tracking for this budget if not exists
          if (!notifiedBudgets.current[budgetKey]) {
            notifiedBudgets.current[budgetKey] = { threshold80: false, threshold90: false };
          }
          
          // Check 80% threshold
          if (percentage >= 80 && percentage < 90 && !notifiedBudgets.current[budgetKey].threshold80) {
            // 80% threshold notification
            await api.post('/api/v1/notifications', {
              title: `Budget Alert: ${item.categoryName}`,
              message: `You've spent 80% of your ${item.categoryName} budget (${item.currency}${item.spent.toFixed(2)} of ${item.currency}${item.budget.toFixed(2)})`,
              type: 'BUDGET_ALERT',
              priority: 'MEDIUM',
              metadata: {
                categoryId: item.categoryId,
                categoryName: item.categoryName,
                spent: item.spent,
                budget: item.budget,
                percentage: 80
              }
            });
            notifiedBudgets.current[budgetKey].threshold80 = true;
            setTimeout(() => refreshUnread(), 500);
          } 
          // Check 90% threshold
          else if (percentage >= 90 && percentage < 100 && !notifiedBudgets.current[budgetKey].threshold90) {
            // 90% threshold notification
            await api.post('/api/v1/notifications', {
              title: `Budget Warning: ${item.categoryName}`,
              message: `You've spent 90% of your ${item.categoryName} budget (${item.currency}${item.spent.toFixed(2)} of ${item.currency}${item.budget.toFixed(2)})`,
              type: 'BUDGET_WARNING',
              priority: 'HIGH',
              metadata: {
                categoryId: item.categoryId,
                categoryName: item.categoryName,
                spent: item.spent,
                budget: item.budget,
                percentage: 90
              }
            });
            notifiedBudgets.current[budgetKey].threshold90 = true;
            setTimeout(() => refreshUnread(), 500);
          }
          // Reset flags if spending drops below thresholds
          else if (percentage < 80) {
            notifiedBudgets.current[budgetKey].threshold80 = false;
            notifiedBudgets.current[budgetKey].threshold90 = false;
          }
        } catch (error) {
          console.error('Error creating budget notification:', error);
        }
      };
      
      checkThreshold();
    }, [percentage, item.categoryId, item.categoryName]);
    
    return (
      <View style={styles.budgetItem}>
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetCategory}>{item.categoryName}</Text>
          <Text style={[
            styles.budgetSpent,
            isOverBudget ? styles.overBudget : {}
          ]}>
            ${item.spent.toFixed(2)} / ${item.budget.toFixed(2)}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${progress}%`,
                backgroundColor: isOverBudget ? '#F44336' : (percentage >= 90 ? '#FF9800' : percentage >= 80 ? '#FFC107' : '#4CAF50')
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {isOverBudget ? 'Over budget by ' : ''}${Math.abs(item.budget - item.spent).toFixed(2)} {isOverBudget ? 'over' : 'left'}
        </Text>
        {percentage >= 80 && percentage < 100 && (
          <View style={{ marginTop: 8, padding: 8, backgroundColor: percentage >= 90 ? '#FFF3E0' : '#FFF9C4', borderRadius: 8 }}>
            <Text style={{ fontSize: 12, color: percentage >= 90 ? '#E65100' : '#F57F17', fontWeight: '600' }}>
              ⚠️ {percentage >= 90 ? '90%' : '80%'} of budget used
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Render tab content
  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <ScrollView 
            style={styles.contentContainer}
            contentContainerStyle={{ paddingBottom: 32 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Spending Summary Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Spending Summary</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{formatINR(dashboardData.totalSpent)}</Text>
                  <Text style={styles.summaryLabel}>Total Spent</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#4CAF50' }]} numberOfLines={1}>
                    {dashboardData.categoryTotals.length}
                  </Text>
                  <Text style={styles.summaryLabel}>Categories</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {dashboardData.recentTransactions.length}
                  </Text>
                  <Text style={styles.summaryLabel}>Transactions</Text>
                </View>
              </View>
            </View>

            {/* Category Spending Pie Chart */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Spending by Category</Text>
              {hoveredCategory && (
                <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, marginBottom: 12, marginTop: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 4 }}>
                    {dashboardData.categoryTotals.find(c => c.categoryName === hoveredCategory)?.categoryName}
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#4CAF50' }}>
                    ₹{dashboardData.categoryTotals.find(c => c.categoryName === hoveredCategory)?.total.toFixed(2)}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                    {dashboardData.categoryTotals.find(c => c.categoryName === hoveredCategory)?.percentage?.toFixed(1)}% of total spending
                  </Text>
                </View>
              )}
              <View style={styles.chartContainer}>
                {(() => {
                  const pieData = dashboardData.categoryTotals.map((cat, index) => ({
                    name: cat.categoryName,
                    population: Number(cat.total) || 0,
                    color: cat.color || CHART_COLORS[index % CHART_COLORS.length],
                    legendFontColor: '#7F7F7F',
                    legendFontSize: 12,
                  }));
                  const totalPop = pieData.reduce((s, it) => s + (Number(it.population) || 0), 0);
                  if (!isFinite(totalPop) || totalPop <= 0) {
                    return (
                      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                        <MaterialIcons name="pie-chart" size={32} color="#ccc" />
                        <Text style={{ color: '#666', marginTop: 8 }}>No category data</Text>
                      </View>
                    );
                  }
                  return (
                    <PieChart
                      data={pieData as any}
                      width={Dimensions.get('window').width - 64}
                      height={220}
                      chartConfig={{
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: {
                          borderRadius: 16,
                        },
                      }}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      hasLegend={true}
                    />
                  );

                })()}
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setShowCatDetails(prev => !prev)}
                style={{ marginTop: 8 }}
              >
                <Text style={{ textAlign: 'center', color: '#4CAF50', fontWeight: '600' }}>
                  {showCatDetails ? 'Hide Details' : 'Show Details'}
                </Text>
              </TouchableOpacity>
              {showCatDetails && (
                <View style={styles.catDetailsContainer}>
                  {dashboardData.categoryTotals.map((cat, idx) => (
                    <TouchableOpacity
                      key={cat.categoryId + '-' + idx}
                      style={[
                        styles.catDetailRow,
                        hoveredCategory === cat.categoryName && { backgroundColor: '#F3F4F6' }
                      ]}
                      onPressIn={() => setHoveredCategory(cat.categoryName)}
                      onPressOut={() => setHoveredCategory(null)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.catDetailLeft}>
                        <View style={[styles.catDot, { backgroundColor: cat.color || CHART_COLORS[idx % CHART_COLORS.length] }]} />
                        <Text style={styles.catName}>{cat.categoryName}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  <View style={styles.catHintRow}>
                    <MaterialIcons name="touch-app" size={16} color="#6b7280" />
                    <Text style={styles.catHintText}>Tap category to highlight</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Spending Trend Line Chart with Granularity Selector */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.sectionTitle}>Spending Trend</Text>
                <View style={styles.granularityRow}>
                  {(['day','week','month','year'] as const).map(g => (
                    <TouchableOpacity key={g} onPress={() => setTrendGranularity(g)} style={[styles.granBtn, trendGranularity===g && styles.granBtnActive]}>
                      <Text style={[styles.granBtnText, trendGranularity===g && styles.granBtnTextActive]}>
                        {g === 'day' ? 'Day' : g === 'week' ? 'Week' : g === 'month' ? 'Month' : 'Year'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.chartContainer}>
                {(() => {
                  // Build entries from computed trendData based on selected granularity
                  const entries = (trendData || [])
                    .map(item => {
                      const d = new Date(item.date);
                      let label = '';
                      if (trendGranularity === 'day') label = `${d.getDate()} ${d.toLocaleString('default',{ month:'short' })}`;
                      else if (trendGranularity === 'week') label = item.date.replace(/^\d{4}-W/, 'W');
                      else if (trendGranularity === 'month') label = d.toLocaleString('default', { month: 'short' });
                      else label = String(d.getFullYear());
                      return { label, value: Number(item.amount) };
                    })
                    .filter(e => Number.isFinite(e.value));
                  if (entries.length < 2) {
                    return (
                      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                        <MaterialIcons name="show-chart" size={32} color="#ccc" />
                        <Text style={{ color: '#666', marginTop: 8 }}>Not enough data to plot trend</Text>
                      </View>
                    );
                  }
                  const labels = entries.map(e => e.label);
                  const data = entries.map(e => e.value);
                  const min = Math.min(...data);
                  const max = Math.max(...data);
                  if (!Number.isFinite(min) || !Number.isFinite(max) || max - min === 0) {
                    return (
                      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                        <MaterialIcons name="show-chart" size={32} color="#ccc" />
                        <Text style={{ color: '#666', marginTop: 8 }}>Not enough variance to plot trend</Text>
                      </View>
                    );
                  }
                  return (
                    <LineChart
                      data={{
                        labels,
                        datasets: [{
                          data,
                          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                          strokeWidth: 2
                        }]
                      }}
                      width={Dimensions.get('window').width - 64}
                      height={220}
                      chartConfig={{
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: {
                          borderRadius: 16,
                        },
                        propsForDots: {
                          r: '4',
                          strokeWidth: '2',
                          stroke: '#4CAF50'
                        }
                      }}
                      bezier
                      style={{
                        marginVertical: 8,
                        borderRadius: 16,
                      }}
                    />
                  );
                })()}
              </View>
            </View>

            {/* Recent Transactions */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              {dashboardData.recentTransactions.length > 0 ? (
                <FlatList
                  data={dashboardData.recentTransactions.slice(0, 5)}
                  renderItem={renderTransactionItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="receipt" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No recent transactions</Text>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'transactions':
        return (
          <ScrollView
            style={styles.contentContainer}
            contentContainerStyle={{ paddingBottom: 32 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Transactions</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
                  <MaterialIcons name="open-in-new" size={20} color="#4CAF50" />
                </TouchableOpacity>
              </View>
              {dashboardData.recentTransactions.length > 0 ? (
                <FlatList
                  data={dashboardData.recentTransactions}
                  renderItem={renderTransactionItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="receipt" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No transactions found</Text>
                  <TouchableOpacity
                    style={{ marginTop: 16, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#4CAF50', borderRadius: 8 }}
                    onPress={() => navigation.navigate('AddTransaction')}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Add Transaction</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'budgets':
        return (
          <View style={styles.contentContainer}>
            <FlatList
              data={dashboardData.budgets}
              renderItem={renderBudgetItem}
              keyExtractor={item => item.categoryId}
              contentContainerStyle={{ paddingBottom: 32 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialIcons name="account-balance-wallet" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No budgets set up</Text>
                </View>
              }
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Compact mode indicator on the left (tap for details) */}
        <TouchableOpacity
          onPress={() => setShowModeDetails(true)}
          activeOpacity={0.8}
          style={{ flexDirection:'row', alignItems:'center' }}
        >
          <MaterialIcons name={isCompanyMode ? 'business' : 'person-outline'} size={18} color={isCompanyMode ? '#16A34A' : '#2563EB'} />
          <View style={{ marginLeft: 8, maxWidth: 180 }}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}
            >
              {isCompanyMode ? (activeCompany?.companyName || 'Company') : 'Personal'}
            </Text>
            {isCompanyMode && userRole && (
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#7C3AED' }}>
                {userRole}
              </Text>
            )}
          </View>
          <MaterialIcons name="expand-more" size={18} color="#64748b" />
        </TouchableOpacity>
        {/* Right side actions */}
        <View style={{ flexDirection:'row', alignItems:'center', gap: 12 }}>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => { navigation.navigate('Notifications'); setTimeout(()=>refreshUnread(), 300); }}
          >
            <MaterialIcons name="notifications-none" size={24} color="#333" />
            {unreadCount > 0 && <View style={styles.notificationBadge} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <MaterialIcons 
            name="dashboard" 
            size={24} 
            color={activeTab === 'overview' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <MaterialIcons 
            name="receipt" 
            size={24} 
            color={activeTab === 'transactions' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            Transactions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'budgets' && styles.activeTab]}
          onPress={() => setActiveTab('budgets')}
        >
          <MaterialIcons 
            name="account-balance-wallet" 
            size={24} 
            color={activeTab === 'budgets' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'budgets' && styles.activeTabText]}>
            Budgets
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {renderTabContent()}

      {/* Quick Add FAB */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setShowQuickAdd(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {/* No date pickers on Dashboard */}

      {/* Transaction Detail Modal */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="none"
        onRequestClose={closeDetail}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalCard, { opacity: detailOpacity, transform: [{ scale: detailScale }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity onPress={closeDetail}>
                <MaterialIcons name="close" size={22} color="#111" />
              </TouchableOpacity>
            </View>
            {selectedTx ? (
              <View style={styles.modalBody}>
                <View style={styles.modalRow}><Text style={styles.modalLabel}>Description</Text><Text style={styles.modalValue}>{selectedTx.description}</Text></View>
                <View style={styles.modalRow}><Text style={styles.modalLabel}>Category</Text><Text style={styles.modalValue}>{selectedTx.category}</Text></View>
                <View style={styles.modalRow}><Text style={styles.modalLabel}>Type</Text><Text style={styles.modalValue}>{selectedTx.type}</Text></View>
                <View style={styles.modalRow}><Text style={styles.modalLabel}>Amount</Text><Text style={styles.modalValue}>{selectedTx.amount.toFixed(2)}</Text></View>
                <View style={styles.modalRow}><Text style={styles.modalLabel}>Date</Text><Text style={styles.modalValue}>{new Date(selectedTx.transactionDate).toLocaleString()}</Text></View>
                {selectedTx.notes ? (
                  <View style={[styles.modalRow, { alignItems: 'flex-start' }]}>
                    <Text style={styles.modalLabel}>Notes</Text>
                    <Text style={[styles.modalValue, { flex: 1 }]}>{selectedTx.notes}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={closeDetail}>
              <Text style={styles.modalPrimaryText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Mode Details Modal */}
      <Modal
        visible={showModeDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModeDetails(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { width: '88%', padding: 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isCompanyMode ? 'Company Mode' : 'Personal Mode'}</Text>
              <TouchableOpacity onPress={() => setShowModeDetails(false)}>
                <MaterialIcons name="close" size={22} color="#111" />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', marginBottom: 12 }}>
              <MaterialIcons name={isCompanyMode ? 'business' : 'person-outline'} size={22} color={isCompanyMode ? '#16A34A' : '#2563EB'} />
              <View style={{ marginLeft: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                  {isCompanyMode ? (activeCompany?.companyName || 'Company') : 'Personal'}
                </Text>
                {isCompanyMode && userRole && (
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#7C3AED', marginTop: 2 }}>
                    Your Role: {userRole}
                  </Text>
                )}
              </View>
            </View>
            {isCompanyMode && (
              <View style={{ gap: 8 }}>
                {activeCompany?.companyCode ? (
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Code</Text><Text style={styles.modalValue}>{activeCompany.companyCode}</Text></View>
                ) : null}
                {activeCompany?.companyEmail ? (
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Email</Text><Text style={styles.modalValue}>{activeCompany.companyEmail}</Text></View>
                ) : null}
                {activeCompany?.contactNumber ? (
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Phone</Text><Text style={styles.modalValue}>{activeCompany.contactNumber}</Text></View>
                ) : null}
                {activeCompany?.currency ? (
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Currency</Text><Text style={styles.modalValue}>{activeCompany.currency}</Text></View>
                ) : null}
                {activeCompany?.timeZone ? (
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Time Zone</Text><Text style={styles.modalValue}>{activeCompany.timeZone}</Text></View>
                ) : null}
              </View>
            )}
            {!isCompanyMode && (
              <View style={{ gap: 8 }}>
                <View style={styles.modalRow}><Text style={styles.modalLabel}>Name</Text><Text style={styles.modalValue}>{displayName}</Text></View>
                {userEmail ? (
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Email</Text><Text style={styles.modalValue}>{userEmail}</Text></View>
                ) : null}
              </View>
            )}
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: 12, gap: 8 }}>
              {isCompanyMode && (
                <TouchableOpacity
                  onPress={() => { setShowModeDetails(false); setActiveCompanyId(null as any); }}
                  style={[styles.modalPrimaryBtn, { backgroundColor: '#0EA5E9' }]}
                >
                  <Text style={styles.modalPrimaryText}>Switch to Personal</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowModeDetails(false)} style={styles.modalPrimaryBtn}>
                <Text style={styles.modalPrimaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Add Modal */}
      <Modal
        visible={showQuickAdd}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickAdd(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { padding: 16, width: '84%' }] }>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick add</Text>
              <TouchableOpacity onPress={() => setShowQuickAdd(false)}>
                <MaterialIcons name="close" size={22} color="#111" />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              <TouchableOpacity 
                style={{ flexDirection:'row', alignItems:'center', paddingVertical:12, paddingHorizontal:12, borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, backgroundColor:'#FFFFFF' }}
                onPress={() => { setShowQuickAdd(false); navigation.navigate('AddTransaction'); }}
              >
                <MaterialIcons name="receipt-long" size={18} color="#0F172A" />
                <Text style={{ marginLeft: 10, fontWeight:'700', color:'#0F172A' }}>New Transaction</Text>
              </TouchableOpacity>
              {/* Only show "New Company" in personal mode */}
              {!isCompanyMode && (
                <TouchableOpacity 
                  style={{ flexDirection:'row', alignItems:'center', paddingVertical:12, paddingHorizontal:12, borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, backgroundColor:'#FFFFFF' }}
                  onPress={() => { setShowQuickAdd(false); navigation.navigate('CompanyRegistration'); }}
                >
                  <MaterialIcons name="add-business" size={18} color="#0F172A" />
                  <Text style={{ marginLeft: 10, fontWeight:'700', color:'#0F172A' }}>New Company</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 2 : 2,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    elevation: 3,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 0,
    letterSpacing: -1,
  },
  // Sleek Date Range Bar styles
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0,
    marginHorizontal: 4,
    shadowColor: '#22C55E',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  chipText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  toSeparator: {
    color: '#6B7280',
    marginHorizontal: 4,
  },
  clearChip: {
    backgroundColor: '#F3F4F6',
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dateRangeText: {
    fontSize: 14,
    color: '#666',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 0,
    paddingHorizontal: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 0,
  },
  tabText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: '#22C55E',
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  granularityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    padding: 2,
    marginLeft: 12,
  },
  granBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  granBtnActive: {
    backgroundColor: '#ffffff',
  },
  granBtnText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '700'
  },
  granBtnTextActive: {
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.6,
  },
  seeAllText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chartContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 14,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  categoryPercentage: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 12,
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  transactionDetails: {
    flex: 1,
  },
  transactionMerchant: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  transactionDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    fontWeight: '500',
  },
  budgetItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 0,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  budgetSpent: {
    fontSize: 15,
    fontWeight: '700',
    color: '#22C55E',
  },
  overBudget: {
    color: '#F44336',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    marginVertical: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 12,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 26,
    lineHeight: 30,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    marginTop: 6,
    marginBottom: 12,
    gap: 8,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalLabel: {
    color: '#6b7280',
    fontSize: 12,
    width: 96,
  },
  modalValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  modalPrimaryBtn: {
    marginTop: 4,
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
    fontSize: 14,
    color: '#111827',
  },
  // Inline Category Details styles
  catDetailsContainer: {
    marginTop: 12,
  },
  catDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  catDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  catName: {
    color: '#111827',
  },
  catDetailRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catPct: {
    color: '#6b7280',
    fontSize: 12,
    marginRight: 8,
  },
  catAmount: {
    color: '#111827',
    fontWeight: '600',
  },
  catHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  catHintText: {
    color: '#6b7280',
    fontSize: 12,
    marginLeft: 6,
  },
});

export default DashboardScreen;
