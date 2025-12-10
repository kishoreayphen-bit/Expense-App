import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  ScrollView,
  TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useIsFocused, useFocusEffect, CommonActions, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuthToken } from '../api/client';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { format, subMonths } from 'date-fns';
import { Expense, ExpenseService } from '../api/expenseService';
import { isAuthenticated, clearAuthTokens, api } from '../api/client';
import { styles } from './ExpensesScreen.styles';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../components/ThemeView';
import { radius, space } from '../theme/tokens';
import { canViewAllExpenses, canApproveExpenses, canViewEmployeeExpenses, getPermissionContext, getRoleDisplayName, getRoleBadgeColor } from '../utils/permissions';
import { useRole } from '../context/RoleContext';

// Add navigation types
type RootStackParamList = {
  Expenses: undefined;
  ExpenseDetail: { id: number };
  AddExpense: undefined;
  Login: undefined;
};

type ExpensesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Expenses'>;

// Add filter state interface
interface FilterState {
  minAmount?: number;
  maxAmount?: number;
  categories: string[];
  status?: string;
  type?: 'ALL' | 'INCOME' | 'EXPENSE';
  currency?: string | 'ALL';
}

export default function ExpensesScreen({ navigation }: { navigation: ExpensesScreenNavigationProp }) {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { activeCompanyId, activeCompany } = useCompany();
  const { theme, isCompanyMode: themeMode } = useTheme();
  const { role, isEmployee, isManager, isAdmin, isSuperAdmin } = useRole();
  const fromCompany = route?.params?.fromCompany === true;
  const passedCompanyId = route?.params?.companyId;
  // Determine if we're in company mode: check both route params and context
  const isCompanyRoute = fromCompany && Number(passedCompanyId) > 0;
  // Company mode is active if we have a valid activeCompanyId in context (regardless of route)
  const isCompanyMode = !!activeCompanyId && Number(activeCompanyId) > 0;
  const [items, setItems] = useState<Expense[]>([]);
  // UI-only mode flag: prefer route/company signal, else context; treat any non-null activeCompanyId (including negative demo IDs) as company mode
  const hasRouteCompany = fromCompany === true || (passedCompanyId !== undefined && passedCompanyId !== null && !Number.isNaN(Number(passedCompanyId)));
  const hasContextCompany = activeCompanyId !== null && activeCompanyId !== undefined;
  const isCompanyUI = hasRouteCompany || hasContextCompany;
  const modeAccent = isCompanyUI ? '#16a34a' : '#3b82f6';
  const modeBg = isCompanyUI ? '#ECFDF5' : '#EFF6FF';
  const modeBorder = isCompanyUI ? '#A7F3D0' : '#BFDBFE';
  const modeText = isCompanyUI ? '#065F46' : '#1E40AF';
  const modeName = isCompanyUI ? (activeCompany?.companyName ? `Company: ${activeCompany.companyName}` : 'Company Mode') : 'Personal Mode';
  const chipBg = isCompanyUI ? '#DCFCE7' : '#DBEAFE';
  const chipBorder = isCompanyUI ? '#22C55E' : '#3B82F6';
  const chipText = isCompanyUI ? '#065F46' : '#1E40AF';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    total: 0,
    transactions: 0,
    categories: 0,
  });

  const today = new Date();
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    type: 'ALL',
    currency: 'ALL',
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [groupFilter, setGroupFilter] = useState<'ALL'|'GROUP'|'NON_GROUP'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [bulkApproving, setBulkApproving] = useState(false);
  
  // Role-based permissions
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyRole, setCompanyRole] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'MY'|'ALL'>('MY'); // MY = own expenses, ALL = all company expenses
  
  // Load roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const storedRole = await AsyncStorage.getItem('userRole');
        setUserRole(storedRole);
        
        if (activeCompany && (activeCompany as any).userRole) {
          setCompanyRole((activeCompany as any).userRole);
        } else {
          setCompanyRole(null);
        }
      } catch (error) {
        console.error('[ExpensesScreen] Failed to load roles:', error);
      }
    };
    loadRoles();
  }, [activeCompany]);
  
  // Check if user can view all expenses
  const canUserViewAll = canViewAllExpenses(
    getPermissionContext(userRole as any, companyRole as any)
  );
  
  // Check if user can approve expenses
  const canUserApprove = canApproveExpenses(
    getPermissionContext(userRole as any, companyRole as any)
  );

  // Test function to fetch expenses directly
  const testFetchExpenses = async () => {
    try {
      console.log('[ExpensesScreen] Testing direct expense fetch...');
      const token = await getAuthToken();
      console.log('[ExpensesScreen] Auth token:', token ? 'exists' : 'missing');
      
      const response = await fetch(`${api.defaults.baseURL}/api/v1/expenses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      console.log('[ExpensesScreen] Direct fetch response:', {
        status: response.status,
        data,
        count: Array.isArray(data) ? data.length : (data.content ? data.content.length : 0)
      });
      
      return data;
    } catch (error) {
      console.error('[ExpensesScreen] Error in testFetchExpenses:', error);
      throw error;
    }
  };

  const loadExpenses = useCallback(async (isRefreshing = false) => {
    console.log('[ExpensesScreen] loadExpenses called, isRefreshing:', isRefreshing);
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);
      
      const authenticated = await isAuthenticated();
      console.log('[ExpensesScreen] User authenticated:', authenticated);
      
      if (!authenticated) {
        console.log('[ExpensesScreen] User not authenticated, redirecting to login');
        await clearAuthTokens();
        
        if (nav.getState()?.routes[0].name !== 'Login') {
          nav.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          );
        }
        return;
      }
      
      console.log('[ExpensesScreen] Loading expenses with date range:', dateRange);
      
      // STRICT ISOLATION: Determine scope parameters
      const scopeOpts = isCompanyMode 
        ? { fromCompany: true, companyId: Number(activeCompanyId) }
        : { fromCompany: false, companyId: undefined };
      
      console.log('[ExpensesScreen] ===== STRICT ISOLATION DEBUG =====');
      console.log('[ExpensesScreen] Context activeCompanyId:', activeCompanyId, 'Type:', typeof activeCompanyId);
      console.log('[ExpensesScreen] isCompanyMode:', isCompanyMode);
      console.log('[ExpensesScreen] scopeOpts:', JSON.stringify(scopeOpts));
      console.log('[ExpensesScreen] Will fetch with:', scopeOpts.fromCompany ? `COMPANY ID ${scopeOpts.companyId}` : 'PERSONAL MODE');
      console.log('[ExpensesScreen] =====================================');
      
      const [expenses, summaryData] = await Promise.all([
        ExpenseService.getExpenses(dateRange, 0, 1000, scopeOpts),
        ExpenseService.getExpenseSummary(dateRange, scopeOpts)
      ]);
      
      const raw = Array.isArray(expenses) ? expenses : [];
      
      // STRICT CLIENT-SIDE FILTERING: Double-check server response
      const filtered = raw.filter((it: any) => {
        const cid = it?.companyId ?? it?.company_id ?? it?.company?.id;
        if (isCompanyMode) {
          // Company mode: ONLY expenses for this exact company
          const belongsToCompany = cid != null && Number(cid) === Number(activeCompanyId);
          if (!belongsToCompany) {
            console.warn('[ExpensesScreen] VIOLATION: Company mode received expense with wrong companyId', {
              expenseId: it.id,
              expenseCompanyId: cid,
              expectedCompanyId: activeCompanyId
            });
          }
          return belongsToCompany;
        } else {
          // Personal mode: ONLY expenses with NO company
          const isPersonal = cid == null || Number(cid) === 0;
          if (!isPersonal) {
            console.warn('[ExpensesScreen] VIOLATION: Personal mode received company expense', {
              expenseId: it.id,
              expenseCompanyId: cid
            });
          }
          return isPersonal;
        }
      });
      console.log(`[ExpensesScreen] Loaded ${raw.length} expenses, visible after scope filter: ${filtered.length}`);
      
      // Enrich expenses with split shares
      const enrichedExpenses = await Promise.all(
        filtered.map(async (expense: any) => {
          try {
            // Try to fetch split shares for each expense
            const splitResponse = await api.get(`/api/v1/expenses/${expense.id}/splits`, {
              _suppressErrorLog: true as any,
            } as any);
            if (splitResponse.data?.splitShares) {
              return { ...expense, splitShares: splitResponse.data.splitShares };
            }
          } catch (err) {
            // Ignore errors - expense just won't have split shares
          }
          return expense;
        })
      );
      
      setItems(enrichedExpenses);
      setSummary(summaryData || { total: 0, transactions: 0, categories: 0 });
      
    } catch (err: any) {
      console.error('Error loading expenses:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load expenses';
      setError(errorMessage);
      
      if (err.response?.status === 401) {
        await clearAuthTokens();
        nav.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, nav, activeCompanyId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadExpenses(true);
  }, [loadExpenses]);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );


  // Place Filters button in the navigation header to avoid extra vertical space
  React.useLayoutEffect(() => {
    if (selectionMode) {
      nav.setOptions({
        headerRightContainerStyle: { paddingRight: 16 },
        headerTitle: `${selectedIds.size} selected`,
        headerRight: () => (
          <View style={{ flexDirection:'row', gap: 8 }}>
            <TouchableOpacity 
              onPress={() => {
                const allIds = new Set<number>((visibleItems || []).map((it:any)=> Number(it.id)));
                setSelectedIds(allIds);
              }} 
              style={{ 
                backgroundColor: '#e5e7eb',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <MaterialIcons name="select-all" size={18} color="#111827" />
              <Text style={{ marginLeft: 6, color: '#111827', fontWeight: '700', fontSize: 13 }}>Select All</Text>
            </TouchableOpacity>
            {canUserApprove && selectedIds.size > 0 && (
              <TouchableOpacity 
                onPress={async () => {
                  if (selectedIds.size === 0) return;
                  Alert.alert('Bulk Approve', `Approve ${selectedIds.size} selected expenses?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Approve', onPress: async () => {
                      try {
                        setBulkApproving(true);
                        const ids = Array.from(selectedIds);
                        const results = await Promise.allSettled(
                          ids.map(id => 
                            api.post(`/api/v1/expenses/${id}/approve`, {
                              notes: 'Bulk approved'
                            })
                          )
                        );
                        
                        const successful = results.filter(r => r.status === 'fulfilled').length;
                        const failed = results.filter(r => r.status === 'rejected').length;
                        
                        Alert.alert(
                          'Bulk Approval Complete',
                          `${successful} approved, ${failed} failed`
                        );
                        
                        setSelectedIds(new Set());
                        setSelectionMode(false);
                        loadExpenses(true);
                      } catch (e) {
                        Alert.alert('Error', 'Failed to approve expenses');
                      } finally {
                        setBulkApproving(false);
                      }
                    } }
                  ]);
                }} 
                disabled={bulkApproving}
                style={{ 
                  backgroundColor: '#16A34A',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  opacity: bulkApproving ? 0.6 : 1,
                }}
              >
                {bulkApproving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="done-all" size={18} color="#ffffff" />
                    <Text style={{ marginLeft: 6, color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Approve ({selectedIds.size})</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={async () => {
                if (selectedIds.size === 0) return;
                Alert.alert('Delete selected', `Delete ${selectedIds.size} expenses?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                      const scopeOpts = isCompanyMode 
                        ? { fromCompany: true, companyId: Number(activeCompanyId) }
                        : { fromCompany: false, companyId: undefined };
                      const ids = Array.from(selectedIds);
                      await Promise.all(ids.map(id => ExpenseService.deleteExpense(id, scopeOpts)));
                      setSelectedIds(new Set());
                      setSelectionMode(false);
                      loadExpenses(true);
                    } catch (e) {}
                  } }
                ]);
              }} 
              style={{ 
                backgroundColor: '#ef4444',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <MaterialIcons name="delete-outline" size={18} color="#ffffff" />
              <Text style={{ marginLeft: 6, color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        ),
        headerLeft: () => (
          <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedIds(new Set()); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color:'#2563eb', fontWeight:'700' }}>Cancel</Text>
          </TouchableOpacity>
        ),
      });
    } else {
      nav.setOptions({
        headerRightContainerStyle: { paddingRight: 16 },
        headerTitle: undefined,
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => setShowFilterModal(true)} 
            style={{ 
              backgroundColor: '#3b82f6',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#3b82f6',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <MaterialIcons name="tune" size={18} color="#ffffff" />
            <Text style={{ 
              marginLeft: 6, 
              color: '#ffffff', 
              fontWeight: '700',
              fontSize: 14,
              letterSpacing: 0.3
            }}>
              Filter
            </Text>
          </TouchableOpacity>
        ),
        headerLeft: undefined,
      });
    }
  }, [nav, selectionMode, selectedIds]);

  const openDetail = (id: number) => nav.navigate('ExpenseDetail', { id });

  // Compute visible items based on client-side filters
  const categoryOptions = React.useMemo(() => {
    const set = new Set<string>();
    items?.forEach((it: any) => {
      const name = it?.category?.name || it?.categoryName;
      if (name) set.add(String(name));
    });
    return Array.from(set).sort();
  }, [items]);

  const visibleItems = React.useMemo(() => {
    return (items || []).filter((it: any) => {
      // type filter
      const catLower = String(it?.category?.name || it?.categoryName || '').toLowerCase();
      const isIncome = it?.type === 'INCOME' || it?.isIncome === true || ['income','salary','refund','reimbursement'].includes(catLower);
      if (filters.type === 'INCOME' && !isIncome) return false;
      if (filters.type === 'EXPENSE' && isIncome) return false;

      // currency filter
      if (filters.currency && filters.currency !== 'ALL') {
        if ((it?.currency || '').toUpperCase() !== String(filters.currency).toUpperCase()) return false;
      }

      // amount range on original amount
      const amt = Number(it?.amount);
      if (filters.minAmount !== undefined && !isNaN(filters.minAmount) && amt < (filters.minAmount as number)) return false;
      if (filters.maxAmount !== undefined && !isNaN(filters.maxAmount) && amt > (filters.maxAmount as number)) return false;

      // categories (any of selected)
      if (filters.categories && filters.categories.length > 0) {
        const cat = it?.category?.name || it?.categoryName;
        if (!cat || !filters.categories.includes(String(cat))) return false;
      }
      // group filter - check for groupId OR hasSplitShares flag OR splitShares array
      const hasGroupId = it?.groupId != null || it?.group?.id != null || it?.group_id != null;
      const hasSplitSharesFlag = it?.hasSplitShares === true;
      const hasSplitSharesArray = it?.splitShares != null && Array.isArray(it.splitShares) && it.splitShares.length > 0;
      const isGroup = hasGroupId || hasSplitSharesFlag || hasSplitSharesArray;
      if (groupFilter === 'GROUP' && !isGroup) return false;
      if (groupFilter === 'NON_GROUP' && isGroup) return false;
      
      // Search text filter (merchant and description)
      if (searchText.trim()) {
        const search = searchText.trim().toLowerCase();
        const merchant = String(it?.merchant || '').toLowerCase();
        const description = String(it?.description || '').toLowerCase();
        if (!merchant.includes(search) && !description.includes(search)) return false;
      }
      
      return true;
    });
  }, [items, filters, groupFilter, searchText]);

  // Derive counts based on the same filtered set powering the Total card
  const visibleTransactions = React.useMemo(() => visibleItems.length, [visibleItems]);
  const visibleCategories = React.useMemo(() => {
    const set = new Set<string>();
    visibleItems.forEach((it:any)=>{
      const name = it?.category?.name || it?.categoryName;
      if (name) set.add(String(name));
    });
    return set.size;
  }, [visibleItems]);

  // Historical FX-aware INR total for visible items
  const [fxLoading, setFxLoading] = useState(false);
  const [totalInINR, setTotalInINR] = useState(0);
  useEffect(() => {
    const compute = async () => {
      try {
        if (!visibleItems || visibleItems.length === 0) { setTotalInINR(0); return; }
        setFxLoading(true);
        // collect needed (currency,date)
        const needed = new Set<string>();
        const key = (c:string,d:string)=>`${c}|${d}`;
        visibleItems.forEach((it:any)=>{
          const cur = String(it?.currency||'').toUpperCase();
          const dt = String(it?.occurredOn || it?.date || '').slice(0,10);
          const hasBase = typeof it?.baseAmount === 'number' && String(it?.baseCurrency||'').toUpperCase() === 'INR';
          if (cur && cur !== 'INR' && dt && !hasBase) needed.add(key(cur, dt));
        });
        const rateMap = new Map<string, number>();
        await Promise.all(Array.from(needed).map(async (k)=>{
          const [cur, dt] = k.split('|');
          try {
            const r = await fetch(`https://api.exchangerate.host/${dt}?base=${encodeURIComponent(cur)}&symbols=INR`);
            const j = await r.json();
            const rate = Number(j?.rates?.INR);
            if (rate && isFinite(rate) && rate > 0) rateMap.set(k, rate);
          } catch {}
        }));
        // sum
        let sum = 0;
        visibleItems.forEach((it:any)=>{
          const base = typeof it?.baseAmount === 'number' ? it.baseAmount : Number(it?.baseAmount);
          if (!isNaN(base)) { sum += base; return; }
          const cur = String(it?.currency||'').toUpperCase();
          const amt = typeof it?.amount === 'number' ? it.amount : Number(it?.amount);
          const dt = String(it?.occurredOn || it?.date || '').slice(0,10);
          if (cur === 'INR') sum += isNaN(amt) ? 0 : amt;
          else {
            const r = rateMap.get(key(cur, dt));
            sum += !isNaN(amt) ? (r ? amt * r : amt) : 0;
          }
        });
        setTotalInINR(sum);
      } finally {
        setFxLoading(false);
      }
    };
    compute();
  }, [visibleItems]);

  const onStartDateChange = (_: any, selected?: Date) => {
    setShowStartPicker(false);
    if (selected) {
      const from = selected.toISOString().split('T')[0];
      setDateRange(prev => ({ ...prev, from }));
      loadExpenses(true);
    }
  };
  const onEndDateChange = (_: any, selected?: Date) => {
    setShowEndPicker(false);
    if (selected) {
      const to = selected.toISOString().split('T')[0];
      setDateRange(prev => ({ ...prev, to }));
      loadExpenses(true);
    }
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const amount = parseFloat(item.amount) || 0;
    const currency = item.currency || 'USD';
    const merchant = item.merchant || 'Expense';
    const occurredOn = item.occurredOn ? new Date(item.occurredOn) : new Date();
    const categoryName = item.category?.name || item.categoryName || 'Uncategorized';

    // Infer income vs expense
    const catLower = String(categoryName).toLowerCase();
    const isIncome = item.type === 'INCOME'
      || item.isIncome === true
      || ['income', 'salary', 'refund', 'reimbursement'].includes(catLower);

    const displayAmount = Math.abs(amount).toFixed(2);
    const sign = isIncome ? '+' : '-';
    const amountStyle = isIncome ? styles.positiveAmount : styles.negativeAmount;

    const isSelected = selectionMode && selectedIds.has(Number(item.id));
    const hasGroupId = Boolean(item?.groupId || item?.group?.id || item?.group_id);
    const hasSplitSharesFlag = item?.hasSplitShares === true;
    const hasSplitSharesArray = item?.splitShares != null && Array.isArray(item.splitShares) && item.splitShares.length > 0;
    const isGroupExpense = hasGroupId || hasSplitSharesFlag || hasSplitSharesArray;
    return (
      <TouchableOpacity 
        onLongPress={() => {
          if (!selectionMode) {
            const next = new Set<number>();
            next.add(Number(item.id));
            setSelectedIds(next);
            setSelectionMode(true);
          }
        }}
        onPress={() => {
          if (selectionMode) {
            const next = new Set<number>(selectedIds);
            const id = Number(item.id);
            if (next.has(id)) next.delete(id); else next.add(id);
            setSelectedIds(next);
            if (next.size === 0) setSelectionMode(false);
          } else {
            openDetail(item.id);
          }
        }} 
        style={[
          styles.item,
          isSelected && { backgroundColor: '#DBEAFE' },
          isGroupExpense && { borderLeftWidth: 4, borderLeftColor: '#A78BFA', paddingLeft: 12 }
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.itemIcon}>
          <MaterialIcons 
            name={getCategoryIcon(categoryName)} 
            size={26} 
            color={isGroupExpense ? '#7C3AED' : (isIncome ? "#059669" : "#3b82f6")} 
          />
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.merchant} numberOfLines={1}>
              {merchant}
            </Text>
            <Text style={[styles.amount, amountStyle]}>
              {sign}₹{displayAmount}
            </Text>
          </View>
          <View style={styles.itemDetails}>
            <Text style={styles.sub}>
              {format(occurredOn, 'MMM d')} · {categoryName}
            </Text>
            {isGroupExpense && (
              <View style={{ marginLeft: 8, backgroundColor:'#EEF2FF', paddingHorizontal:8, paddingVertical:2, borderRadius:999 }}>
                <Text style={{ color:'#4F46E5', fontWeight:'700', fontSize:11 }}>
                  {item?.group?.name ? String(item.group.name) : 'Group'}
                </Text>
              </View>
            )}
            {item.status && (
              <View style={[
                styles.statusBadge,
                item.status === 'PENDING' && styles.statusPending,
                item.status === 'APPROVED' && styles.statusApproved,
                item.status === 'REJECTED' && styles.statusRejected
              ]}>
                <Text style={[
                  styles.statusText,
                  item.status === 'PENDING' && { color: '#d97706' },
                  item.status === 'APPROVED' && { color: '#059669' },
                  item.status === 'REJECTED' && { color: '#dc2626' }
                ]}>
                  {item.status.toLowerCase()}
                </Text>
              </View>
            )}
          </View>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getCategoryIcon = (categoryName?: string): keyof typeof MaterialIcons.glyphMap => {
    if (!categoryName) return 'receipt';
    
    const categoryIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
      'food': 'restaurant',
      'transport': 'directions-car',
      'shopping': 'shopping-bag',
      'entertainment': 'movie',
      'utilities': 'home',
      'health': 'favorite',
      'travel': 'flight',
      'education': 'school',
      'income': 'attach-money',
      'salary': 'attach-money',
      'refund': 'undo',
      'reimbursement': 'undo',
      'other': 'receipt',
    };
    
    const lowerCategory = categoryName.toLowerCase();
    return categoryIcons[lowerCategory] || 'receipt';
  };

  const renderEmptyState = () => {
    return (
      <View style={[styles.emptyState, { justifyContent: 'flex-start', paddingTop: 24 }]}>
        <View style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: '#f1f5f9',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <MaterialIcons name="receipt-long" size={48} color="#94a3b8" />
        </View>
        <Text style={styles.emptyStateText}>
          {loading ? 'Loading expenses...' : 'No expenses yet'}
        </Text>
        {!loading && (
          <Text style={styles.emptyStateSubtext}>
            {error || 'Tap the + button to add your first expense'}
          </Text>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading expenses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#f44336" />
        <Text style={styles.errorText}>Failed to load expenses</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => loadExpenses()}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Mode banner */}
      {isCompanyUI ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <View style={{ flexDirection:'row', alignItems:'center', alignSelf:'flex-start', backgroundColor: modeBg, borderColor: modeBorder, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
            <MaterialIcons name={isCompanyUI ? 'business' : 'person-outline'} size={14} color={isCompanyUI ? '#059669' : '#2563EB'} />
            <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '800', color: modeText }}>{modeName}</Text>
          </View>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <View style={{ flexDirection:'row', alignItems:'center', alignSelf:'flex-start', backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
            <MaterialIcons name='person-outline' size={14} color={'#2563EB'} />
            <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '800', color: '#1E40AF' }}>Personal Mode</Text>
          </View>
        </View>
      )}

      {/* Role Visibility Indicator - Only show in company mode */}
      {isCompanyUI && role && (
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: '#F9FAFB', 
            borderColor: '#E5E7EB', 
            borderWidth: 1, 
            paddingHorizontal: 12, 
            paddingVertical: 8, 
            borderRadius: 8 
          }}>
            <MaterialIcons 
              name={isAdmin || isSuperAdmin ? 'visibility' : isManager ? 'remove-red-eye' : 'visibility-off'} 
              size={16} 
              color={getRoleBadgeColor(role)} 
            />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 2 }}>
                {getRoleDisplayName(role)} View
              </Text>
              <Text style={{ fontSize: 10, color: '#6B7280' }}>
                {isAdmin || isSuperAdmin 
                  ? 'Viewing all company expenses' 
                  : isManager 
                    ? 'Viewing your expenses + employee expenses' 
                    : 'Viewing only your expenses'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Enhanced Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>
            ₹{Math.abs(totalInINR).toFixed(0)}
          </Text>
          {fxLoading && (
            <Text style={{ color:'#64748b', fontSize: 11, marginTop: 4, fontWeight: '500' }}>
              Converting...
            </Text>
          )}
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Items</Text>
          <Text style={styles.summaryValue}>{visibleTransactions}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Categories</Text>
          <Text style={styles.summaryValue}>{visibleCategories}</Text>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          contentContainerStyle={[
            styles.listContent,
            visibleItems.length === 0 ? { paddingTop: 6, paddingBottom: 80 } : { paddingBottom: 80 }
          ]}
          style={{ flex: 1 }}
          ListHeaderComponent={
            <View style={{ paddingVertical: 6, paddingHorizontal: 4, marginBottom: visibleItems.length === 0 ? 12 : 0 }}>
              {/* Search Input */}
              <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
                  <MaterialIcons name="search" size={20} color="#9ca3af" />
                  <TextInput
                    style={{ flex: 1, marginLeft: 8, fontSize: 15, color: '#1f2937' }}
                    placeholder="Search by merchant or description..."
                    placeholderTextColor="#9ca3af"
                    value={searchText}
                    onChangeText={setSearchText}
                  />
                  {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                      <MaterialIcons name="close" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {/* Role Badge and View Mode Tabs for ADMIN */}
              {isCompanyMode && companyRole && (
                <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Role Badge */}
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      backgroundColor: getRoleBadgeColor(companyRole as any),
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                      opacity: 0.9
                    }}>
                      <MaterialIcons name="badge" size={14} color="#fff" />
                      <Text style={{ 
                        marginLeft: 4, 
                        fontSize: 11, 
                        fontWeight: '700', 
                        color: '#fff',
                        letterSpacing: 0.5
                      }}>
                        {getRoleDisplayName(companyRole as any)}
                      </Text>
                    </View>
                    
                    {/* View Mode Tabs (Only for ADMIN) */}
                    {canUserViewAll && (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity 
                          onPress={() => setViewMode('MY')}
                          style={{ 
                            paddingHorizontal: 14, 
                            paddingVertical: 6, 
                            borderRadius: 8,
                            backgroundColor: viewMode === 'MY' ? '#3B82F6' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: viewMode === 'MY' ? '#2563EB' : '#E2E8F0'
                          }}
                        >
                          <Text style={{ 
                            fontSize: 12, 
                            fontWeight: '700', 
                            color: viewMode === 'MY' ? '#fff' : '#64748B' 
                          }}>
                            My Expenses
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => setViewMode('ALL')}
                          style={{ 
                            paddingHorizontal: 14, 
                            paddingVertical: 6, 
                            borderRadius: 8,
                            backgroundColor: viewMode === 'ALL' ? '#3B82F6' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: viewMode === 'ALL' ? '#2563EB' : '#E2E8F0'
                          }}
                        >
                          <Text style={{ 
                            fontSize: 12, 
                            fontWeight: '700', 
                            color: viewMode === 'ALL' ? '#fff' : '#64748B' 
                          }}>
                            All Expenses
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}
              
              <Text style={{ 
                color: '#64748b', 
                fontSize: 13, 
                textAlign: 'center',
                fontWeight: '500',
                letterSpacing: 0.3
              }}>
                {visibleItems.length} {visibleItems.length === 1 ? 'expense' : 'expenses'}
                {items.length !== visibleItems.length && ` of ${items.length}`}
                {canUserViewAll && viewMode === 'ALL' && ' (All Company)'}
                {canUserViewAll && viewMode === 'MY' && ' (My Own)'}
              </Text>
              <View style={{ flexDirection:'row', justifyContent:'center', gap:8, marginTop:8 }}>
                {(['ALL','GROUP','NON_GROUP'] as const).map(gf => (
                  <TouchableOpacity key={gf} onPress={() => setGroupFilter(gf)} style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:999, backgroundColor: groupFilter===gf ? '#1E293B' : '#E2E8F0' }}>
                    <Text style={{ fontSize:12, fontWeight:'700', color: groupFilter===gf ? '#fff' : '#0F172A' }}>
                      {gf === 'ALL' ? 'All' : gf === 'GROUP' ? 'Group' : 'Non-group'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3b82f6']}
              tintColor="#3b82f6"
              title="Pull to refresh"
              titleColor="#3b82f6"
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            console.log('[ExpensesScreen] Reached end of list, loading more...');
          }}
          ListFooterComponent={
            visibleItems.length > 5 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <View style={{
                  width: 40,
                  height: 4,
                  backgroundColor: '#e2e8f0',
                  borderRadius: 2,
                  marginBottom: 8,
                }} />
                <Text style={{ 
                  color: '#94a3b8', 
                  fontSize: 12,
                  fontWeight: '500',
                  letterSpacing: 0.3
                }}>
                  End of list
                </Text>
              </View>
            ) : null
          }
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.addButton, { backgroundColor: modeAccent }]}
          onPress={() => nav.navigate('AddExpense')}
        >
          <MaterialIcons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Expenses</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowFilterModal(false)}
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {/* Filter content */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              <Text style={{ 
                marginTop: 6, 
                fontSize: 14, 
                color: '#64748b',
                fontWeight: '500',
                backgroundColor: '#f8fafc',
                padding: 8,
                borderRadius: 8,
                textAlign: 'center'
              }}>
                {format(new Date(dateRange.from), 'MMM d')} - {format(new Date(dateRange.to), 'MMM d, yyyy')}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
                <TouchableOpacity style={styles.chip}
                  onPress={() => setDateRange({ from: subMonths(new Date(), 1).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] })}>
                  <Text style={styles.chipText}>Last 30 days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chip}
                  onPress={() => setDateRange({ from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] })}>
                  <Text style={styles.chipText}>This month</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Type</Text>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                {(['ALL','INCOME','EXPENSE'] as const).map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, filters.type === t && styles.chipSelected, filters.type === t && { backgroundColor: chipBg, borderColor: chipBorder }]}
                    onPress={() => setFilters(prev => ({ ...prev, type: t }))}>
                    <Text style={[styles.chipText, filters.type === t && styles.chipTextSelected]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Currency</Text>
              <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
                {(['ALL', ...Array.from(new Set(items.map(i => String(i.currency).toUpperCase())))] as const).map((c: any) => (
                  <TouchableOpacity key={c} style={[styles.chip, filters.currency === c && styles.chipSelected, filters.currency === c && { backgroundColor: chipBg, borderColor: chipBorder }]}
                    onPress={() => setFilters(prev => ({ ...prev, currency: c }))}>
                    <Text style={[styles.chipText, filters.currency === c && { color: chipText }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Amount Range</Text>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity style={[styles.chip, filters.minAmount !== undefined && styles.chipSelected, filters.minAmount !== undefined && { backgroundColor: chipBg, borderColor: chipBorder }]}
                  onPress={() => setFilters(prev => ({ ...prev, minAmount: prev.minAmount !== undefined ? undefined : 0 }))}>
                  <Text style={[styles.chipText, filters.minAmount !== undefined && styles.chipTextSelected]}>Min 0</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, filters.maxAmount !== undefined && styles.chipSelected, filters.maxAmount !== undefined && { backgroundColor: chipBg, borderColor: chipBorder }]}
                  onPress={() => setFilters(prev => ({ ...prev, maxAmount: prev.maxAmount !== undefined ? undefined : 5000 }))}>
                  <Text style={[styles.chipText, filters.maxAmount !== undefined && styles.chipTextSelected]}>Max 5000</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Categories</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                {categoryOptions.length === 0 && (
                  <Text style={{ color: '#777' }}>No categories in this range</Text>
                )}
                {categoryOptions.map(cat => {
                  const selected = filters.categories.includes(cat);
                  return (
                    <TouchableOpacity key={cat}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setFilters(prev => ({
                        ...prev,
                        categories: selected
                          ? prev.categories.filter(c => c !== cat)
                          : [...prev.categories, cat]
                      }))}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  // Reset filters
                  setFilters({ categories: [], type: 'ALL', currency: 'ALL' });
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Reset</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.buttonPrimary]}
                onPress={() => {
                  // Apply filters (already bound), just close
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.buttonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Inline pickers
// Note: Position after component to keep main JSX clean
