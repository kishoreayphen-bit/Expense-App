import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { View, Text, StyleSheet, TextInput, Switch, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, Modal, Alert, Share, LayoutAnimation, Platform, UIManager, StatusBar } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { getThemeColors, userColors, companyColors, radius, space } from '../theme/tokens';
import { canCreateBudget, getPermissionContext, PERMISSION_HINTS } from '../utils/permissions';

export default function BudgetsScreen() {
  const { logout, user } = useAuth();
  const { activeCompanyId, activeCompany } = useCompany();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyRole, setCompanyRole] = useState<string | null>(null);
  // Theme will be computed after isCompanyMode is determined below
  // isCompanyMode will be computed after we declare 'route' below to avoid duplicate declarations
  const [period, setPeriod] = useState<string>(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  });
  // Custom range support (YYYY-MM)
  const [rangeMode, setRangeMode] = useState<boolean>(false);
  const [startPeriod, setStartPeriod] = useState<string>(period);
  const [endPeriod, setEndPeriod] = useState<string>(period);
  const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const [startDate, setStartDate] = useState<string>(() => { const d=new Date(); d.setDate(1); return toYmd(d); });
  const [endDate, setEndDate] = useState<string>(() => { const d=new Date(); d.setMonth(d.getMonth()+1,0); return toYmd(d); });
  const [base, setBase] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [predicted, setPredicted] = useState<any[]>([]);
  const [variance, setVariance] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [totalSpentINR, setTotalSpentINR] = useState<number>(0);
  const [fxLoading, setFxLoading] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ 
    categoryId: '', 
    amount: '', 
    alertThreshold: '80',
    alert80: true,
    alert100: true,
    groupId: undefined as number | undefined,
  });
  const [teams, setTeams] = useState<any[]>([]);
  const [showTeamPicker, setShowTeamPicker] = useState<boolean>(false);
  const [applyToRange, setApplyToRange] = useState<boolean>(false);
  const [showRangeSummary, setShowRangeSummary] = useState<boolean>(false);
  const [rangeSummaryLoading, setRangeSummaryLoading] = useState<boolean>(false);
  const [rangeSummary, setRangeSummary] = useState<Array<{ key: string; categoryName: string; spent: number; budget: number; currency: string }>>([]);
  const [showRangePicker, setShowRangePicker] = useState<boolean>(false);
  const [tmpStart, setTmpStart] = useState<string>('');
  const [tmpEnd, setTmpEnd] = useState<string>('');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isCompanyRoute = route?.params?.fromCompany === true;
  // Company mode is active if we have a valid activeCompanyId in context (regardless of route)
  const isCompanyMode = !!activeCompanyId && Number(activeCompanyId) > 0;
  const theme = getThemeColors(isCompanyMode);
  const [budgetQuery, setBudgetQuery] = useState<string>('');
  const [budgetSort, setBudgetSort] = useState<string>('amount_desc');
  const [insightsTab, setInsightsTab] = useState<string>('variance');
  // Filters & Modals (stubs to avoid reference errors; wire as needed)
  const [showBudgetFilters, setShowBudgetFilters] = useState<boolean>(false);
  const [budgetCurrency, setBudgetCurrency] = useState<string>('INR');
  const [budgetMinAmount, setBudgetMinAmount] = useState<string>('');
  const [budgetMaxAmount, setBudgetMaxAmount] = useState<string>('');
  const [budgetCategoryFilters, setBudgetCategoryFilters] = useState<string[]>([]);
  const [overrunsOnly, setOverrunsOnly] = useState<boolean>(false);
  const [varianceSort, setVarianceSort] = useState<string>('impact_desc');
  const [showBudgetDetails, setShowBudgetDetails] = useState<boolean>(false);
  const [selectedBudget, setSelectedBudget] = useState<any | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [categoryQuery, setCategoryQuery] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [creatingCategory, setCreatingCategory] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  // Inline quick create
  const [qcCategory, setQcCategory] = useState<string>('');
  const [qcAmount, setQcAmount] = useState<string>('');
  const [qcSaving, setQcSaving] = useState<boolean>(false);
  const amountRef = React.useRef<TextInput>(null);
  // Insights tips
  const [insightTips, setInsightTips] = useState<any[]>([]);
  // Drill-down trend for selected budget
  const [budgetTrend, setBudgetTrend] = useState<Array<{ period: string; spent: number; budget: number; currency: string }>>([]);
  const [trendLoading, setTrendLoading] = useState<boolean>(false);
  const scrollRef = React.useRef<ScrollView>(null);
  const [budgetsSectionY, setBudgetsSectionY] = useState<number>(0);
  const [showResetToast, setShowResetToast] = useState<boolean>(false);
  const [lastMonthSpent, setLastMonthSpent] = useState<number>(0);
  const alerted80Ref = React.useRef<Record<string, boolean>>({}); // deprecated (client alerts removed)

  // Load user and company roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        // Get system role from AsyncStorage
        const storedRole = await AsyncStorage.getItem('userRole');
        setUserRole(storedRole);
        
        // Get company role from active company
        if (activeCompany && (activeCompany as any).userRole) {
          setCompanyRole((activeCompany as any).userRole);
        } else {
          setCompanyRole(null);
        }
      } catch (error) {
        console.error('[Budgets] Failed to load roles:', error);
      }
    };
    loadRoles();
  }, [activeCompany]);

  // Check if user can create budgets
  const canUserCreateBudget = canCreateBudget(
    getPermissionContext(userRole as any, companyRole as any)
  );
  
  // Debug logging for permission issues
  React.useEffect(() => {
    console.log('[BudgetsScreen] Permission Debug:', {
      userRole,
      companyRole,
      canUserCreateBudget,
      isCompanyMode,
      activeCompanyId,
      activeCompany: activeCompany ? {
        id: activeCompany.id,
        name: activeCompany.companyName,
        userRole: (activeCompany as any).userRole
      } : null
    });
  }, [userRole, companyRole, canUserCreateBudget, isCompanyMode, activeCompanyId, activeCompany]);
  const alerted100Ref = React.useRef<Record<string, boolean>>({}); // deprecated (client alerts removed)

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount || 0);
  };

  const loadTeams = useCallback(async () => {
    if (!isCompanyMode || !activeCompanyId) {
      setTeams([]);
      return;
    }
    try {
      const res = await api.get('/api/v1/groups', { 
        params: { companyId: activeCompanyId },
        _skipCompany: false 
      });
      const groupsList = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.content || []);
      setTeams(groupsList);
    } catch (error) {
      console.error('[BudgetsScreen] Failed to load teams:', error);
      setTeams([]);
    }
  }, [isCompanyMode, activeCompanyId]);

  useEffect(() => {
    if (qcCategory) {
      try { amountRef.current?.focus(); } catch {}
    }
  }, [qcCategory]);

  useEffect(() => {
    if (showBudgetModal && isCompanyMode) {
      loadTeams();
    }
  }, [showBudgetModal, isCompanyMode, loadTeams]);

  const load = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);
      // In company mode, require an active company id; otherwise clear and stop
      if (isCompanyMode && !activeCompanyId) {
        setBudgets([]);
        setPredicted([]);
        setVariance([]);
        setAnomalies([]);
        return;
      }

      // Normalize & validate period as YYYY-MM
      let safePeriod = (period || '').trim();
      const m = safePeriod.match(/^(\d{4})-(\d{1,2})$/);
      if (!m) {
        throw new Error('Invalid period format. Use YYYY-MM');
      }
      const year = Number(m[1]);
      let monthNum = Number(m[2]);
      if (!(monthNum >= 1 && monthNum <= 12)) {
        throw new Error('Invalid month in period. Use 01-12');
      }
      const paddedMonth = String(monthNum).padStart(2, '0');
      safePeriod = `${year}-${paddedMonth}`;
      if (safePeriod !== period) setPeriod(safePeriod);

      // STRICT ISOLATION: Build params for backend
      const params = { period: safePeriod } as any;
      const ts = Date.now();
      // compute previous period
      const [py, pm] = (safePeriod || '').split('-').map(Number);
      const prevDate = new Date(py, (pm||1)-2, 1);
      const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;
      
      // Strict scoping parameters (backend expects groupId as query param for company mode)
      const groupParams = isCompanyMode 
        ? { groupId: Number(activeCompanyId) }
        : {};
      const requestCfg = { _skipCompany: !isCompanyMode } as any;
      
      console.log('[BudgetsScreen] STRICT ISOLATION - Loading budgets:', {
        isCompanyMode,
        activeCompanyId,
        groupParams,
        requestCfg
      });
      const ac = api.get('/api/v1/budgets/anomalies', { params: { ...params, ...groupParams, _ts: ts }, _suppressErrorLog: true, ...requestCfg });
      const pr = api.get('/api/v1/budgets/predicted', { params: { ...params, ...groupParams, _ts: ts }, _suppressErrorLog: true, ...requestCfg });
      const va = api.get('/api/v1/budgets/variance', { params: { ...params, ...groupParams, _ts: ts }, _suppressErrorLog: true, ...requestCfg });
      const bl = api.get('/api/v1/budgets', { params: { ...params, ...groupParams, _ts: ts }, ...requestCfg });
      const cl = api.get('/api/v1/expense/categories');
      const ti = api.get('/api/v1/insights/tips', { params: { period: safePeriod, _ts: ts }, _suppressErrorLog: true, ...requestCfg });
      const pv = api.get('/api/v1/budgets/variance', { params: { period: prevPeriod, ...groupParams, _ts: ts }, _suppressErrorLog: true, ...requestCfg });
      const results = await Promise.allSettled([ac, pr, va, bl, cl, ti, pv]);
      const [ra, rp, rv, rb, rc, rt, rpv] = results;
      const norm = (data: any) => Array.isArray(data) ? data : (data?.items || data?.content || data?.records || []);

      // Track if any 401 occurred
      let saw401 = false;

      if (ra.status === 'fulfilled') {
        const items = norm(ra.value.data);
        const filtered = Array.isArray(items) && activeCompanyId
          ? items.filter((r:any) => {
              const cid = (r?.companyId ?? r?.company_id);
              return cid != null && Number(cid) === Number(activeCompanyId);
            })
          : items;
        setAnomalies(filtered);
      } else {
        const res = (ra as any)?.reason?.response;
        if (res?.status === 401) saw401 = true;
        if (res?.status === 400 && res?.data?.message) {
          setError(String(res.data.message));
        }
      }

      if (rp.status === 'fulfilled') {
        const items = norm(rp.value.data);
        const filtered = Array.isArray(items) && activeCompanyId
          ? items.filter((r:any) => {
              const cid = (r?.companyId ?? r?.company_id);
              return cid != null && Number(cid) === Number(activeCompanyId);
            })
          : items;
        setPredicted(filtered);
      } else {
        const res = (rp as any)?.reason?.response;
        if (res?.status === 401) saw401 = true;
        if (res?.status === 400 && res?.data?.message) {
          setError(String(res.data.message));
        }
      }

      if (rv.status === 'fulfilled') {
        const items = norm(rv.value.data);
        const filtered = Array.isArray(items) && activeCompanyId
          ? items.filter((r:any) => {
              const cid = (r?.companyId ?? r?.company_id);
              return cid != null && Number(cid) === Number(activeCompanyId);
            })
          : items;
        setVariance(filtered);
      } else {
        const res = (rv as any)?.reason?.response;
        if (res?.status === 401) saw401 = true;
        if (res?.status === 400 && res?.data?.message) {
          setError(String(res.data.message));
        }
      }

      if (rb.status === 'fulfilled') {
        const items = norm(rb.value.data);
        const filtered = Array.isArray(items)
          ? (activeCompanyId
              // Company mode: only budgets for active company
              ? items.filter((b:any) => {
                  const cid = (b?.companyId ?? b?.company_id);
                  return cid != null && Number(cid) === Number(activeCompanyId);
                })
              // Personal mode: only budgets with no company
              : items.filter((b:any) => {
                  const cid = (b?.companyId ?? b?.company_id);
                  return cid == null || Number(cid) <= 0;
                })
            )
          : [];
        setBudgets(filtered);
      }
      else if ((rb as any)?.reason?.response?.status === 401) saw401 = true;

      if (rc.status === 'fulfilled') setCategories(Array.isArray(rc.value.data) ? rc.value.data : []);
      if (rt.status === 'fulfilled') setInsightTips(Array.isArray(rt.value.data) ? rt.value.data : (rt as any)?.value?.data?.tips || []);
      else if ((rc as any)?.reason?.response?.status === 401) saw401 = true;

      // Previous month total spent for delta badge (after 'norm' exists)
      if (rpv.status === 'fulfilled') {
        const items = norm(rpv.value.data);
        const prevSpent = items.reduce((s: number, it: any) => s + (Number(it?.spent) || 0), 0);
        setLastMonthSpent(prevSpent);
      } else {
        setLastMonthSpent(0);
      }

      // Decide error banner
      const allRejected = results.every(r => r.status === 'rejected');
      if (allRejected) {
        setError(saw401 ? 'Session expired. Please log in again.' : 'Failed to load budgets');
      } else if (saw401) {
        // Show session warning while still rendering whatever we could load
        setError('Session expired. Please log in again.');
      }
      // Trigger server-side budget alerts for the current period
      // TEMPORARILY DISABLED FOR DEBUGGING
      // try { await triggerServerAlerts(safePeriod); } catch {}
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) setError('Session expired. Please log in again.');
      else setError(e?.response?.data?.message || e?.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, base, activeCompanyId]);

  useEffect(() => { load(); }, [load]);

  // Enable LayoutAnimation on Android
  useEffect(() => {
    try {
      if (Platform.OS === 'android' && (UIManager as any)?.setLayoutAnimationEnabledExperimental) {
        (UIManager as any).setLayoutAnimationEnabledExperimental(true);
      }
    } catch {}
  }, []);
  const monthOf = React.useCallback((ymd: string) => String(ymd || '').slice(0,7), []);
  const fromYmd = React.useCallback((s: string) => {
    try { const [y,m,d] = String(s||'').split('-').map(Number); return new Date(y, (m||1)-1, d||1); } catch { return new Date(); }
  }, []);

  const openStartDatePicker = React.useCallback(() => {
    try {
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: fromYmd(startDate || `${startPeriod}-01`),
          onChange: (_e, d) => {
            if (!d) return;
            const ymd = toYmd(d);
            setStartDate(ymd);
            const m = monthOf(ymd);
            setStartPeriod(m);
            // constrain
            const s = fromYmd(ymd).getTime();
            const e = fromYmd(endDate || `${endPeriod}-01`).getTime();
            if (s > e) { setEndDate(ymd); setEndPeriod(m); }
          },
          mode: 'date',
          is24Hour: true,
        });
      }
    } catch {}
  }, [startDate, startPeriod, endDate, endPeriod, fromYmd, monthOf]);

  const openEndDatePicker = React.useCallback(() => {
    try {
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: fromYmd(endDate || `${endPeriod}-01`),
          onChange: (_e, d) => {
            if (!d) return;
            const ymd = toYmd(d);
            setEndDate(ymd);
            const m = monthOf(ymd);
            setEndPeriod(m);
            // constrain
            const s = fromYmd(startDate || `${startPeriod}-01`).getTime();
            const e = fromYmd(ymd).getTime();
            if (e < s) { setStartDate(ymd); setStartPeriod(m); }
          },
          mode: 'date',
          is24Hour: true,
        });
      }
    } catch {}
  }, [endDate, endPeriod, startDate, startPeriod, fromYmd, monthOf]);

  // moved below

  // When company changes, clear previous company's data immediately to avoid flash of stale budgets
  useEffect(() => {
    setBudgets([]);
    setPredicted([]);
    setVariance([]);
    setAnomalies([]);
  }, [activeCompanyId]);
  
  // Auto-open create modal if navigated with openCreate param
  useEffect(() => {
    if (route.params?.openCreate) {
      setEditingBudget(null);
      setBudgetForm({ categoryId:'', amount:'', alertThreshold:'80', alert80: true, alert100: true, groupId: undefined });
      setShowBudgetModal(true);
      // Clear the param to prevent re-opening on subsequent renders
      navigation.setParams({ openCreate: undefined } as any);
    }
  }, [route.params?.openCreate]);
  
  useFocusEffect(useCallback(() => {
    if (activeCompanyId) {
      // Reload when screen gains focus within a company context
      load();
    }
  }, [load, activeCompanyId]));

  const onRefresh = useCallback(() => {
    try { Haptics.selectionAsync(); } catch {}
    setRefreshing(true);
    load(true);
  }, [load]);

  // If Range mode is enabled, default to applying to the full range on create
  useEffect(() => {
    setApplyToRange(rangeMode);
  }, [rangeMode]);

  // Helpers to step months safely
  const bumpMonth = React.useCallback((ym: string, delta: number) => {
    try {
      const [y, m] = (ym || '').split('-').map(Number);
      const d = new Date(y || new Date().getFullYear(), (m||1)-1, 1);
      d.setMonth(d.getMonth() + delta);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    } catch { return ym; }
  }, []);
  const monthsBetween = React.useCallback((a: string, b: string) => {
    try {
      const [ya, ma] = (a||'').split('-').map(Number);
      const [yb, mb] = (b||'').split('-').map(Number);
      let start = new Date(ya, (ma||1)-1, 1);
      let end = new Date(yb, (mb||1)-1, 1);
      if (start > end) { const tmp = start; start = end; end = tmp; }
      const arr: string[] = [];
      let d = new Date(start);
      while (d <= end) {
        arr.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
        d.setMonth(d.getMonth()+1);
      }
      return arr;
    } catch { return [a]; }
  }, []);

  // Normalize category names to improve matching between budgets and variance
  const normalizeCat = React.useCallback((val: any) => {
    return String(val || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }, []);

  // Range summary loader (placed after monthsBetween and normalizeCat)
  const loadRangeSummary = useCallback(async () => {
    try {
      setRangeSummaryLoading(true);
      const months = monthsBetween(startPeriod, endPeriod);
      const reqs = months.map(p => api.get('/api/v1/budgets/variance', {
        params: { period: p, ...(isCompanyMode && activeCompanyId ? { companyId: Number(activeCompanyId), company_id: Number(activeCompanyId) } : {}) },
        _suppressErrorLog: true,
        _skipCompany: !isCompanyMode as any,
      } as any));
      const res = await Promise.allSettled(reqs);
      const acc: Record<string, { key: string; categoryName: string; spent: number; budget: number; currency: string }> = {};
      const rowsFor = (r: any) => Array.isArray(r?.value?.data) ? r.value.data : (r as any)?.value?.data?.items || [];
      res.forEach((r) => {
        if (r.status !== 'fulfilled') return;
        const arr = rowsFor(r);
        (arr || []).forEach((v: any) => {
          const idKey = v?.categoryId ? `id:${String(v.categoryId)}` : '';
          const nameRaw = String(v?.categoryName || '');
          const nameKey = `name:${nameRaw.toLowerCase()}`;
          const normKey = `norm:${normalizeCat(nameRaw)}`;
          const key = idKey || normKey || nameKey || nameRaw || Math.random().toString(36).slice(2);
          if (!acc[key]) acc[key] = { key, categoryName: nameRaw || 'Uncategorized', spent: 0, budget: 0, currency: v?.currency || '' };
          acc[key].spent += Number(v?.spent || 0);
          acc[key].budget += Number(v?.budget || 0);
          if (!acc[key].currency) acc[key].currency = v?.currency || '';
          if (!acc[key].categoryName && nameRaw) acc[key].categoryName = nameRaw;
        });
      });
      const out = Object.values(acc).sort((a,b)=> a.categoryName.localeCompare(b.categoryName));
      setRangeSummary(out);
    } catch {
      setRangeSummary([]);
    } finally {
      setRangeSummaryLoading(false);
    }
  }, [startPeriod, endPeriod, monthsBetween, isCompanyMode, activeCompanyId, normalizeCat]);

  // Auto-load when opening summary
  useEffect(() => {
    if (showRangeSummary) loadRangeSummary();
  }, [showRangeSummary, loadRangeSummary]);

  // Quick-create: submit handler (after normalizeCat exists)
  const handleQuickAdd = React.useCallback(async () => {
    if (!qcCategory || !(Number(qcAmount) > 0) || qcSaving) return;
    try {
      try { Haptics.selectionAsync(); } catch {}
      setQcSaving(true);
      const category = (categories || []).find((c:any)=> normalizeCat(c?.name) === normalizeCat(qcCategory));
      if (!category || !category.id) {
        setError('Selected category is invalid. Please pick a category from the list.');
        return;
      }
      // Proceed; duplicates will be handled by server-side check to auto-update
      // Normalize period to YYYY-MM
      let p = String(period || '').trim();
      const mm = p.match(/^(\d{4})-(\d{1,2})$/);
      if (!mm) { setError('Invalid period'); return; }
      p = `${mm[1]}-${String(Number(mm[2])).padStart(2,'0')}`;

      // Check existing budgets on server to avoid duplicate create
      try {
        const dupParams: any = isCompanyMode ? { period: p, groupId: Number(activeCompanyId) } : { period: p };
        const existingListResp = await api.get('/api/v1/budgets', { params: dupParams, _skipCompany: !isCompanyMode as any } as any);
        const existingList = Array.isArray(existingListResp?.data) ? existingListResp.data : [];
        const match = existingList.find((b:any)=> Number(b?.categoryId ?? -1) === Number(category.id));
        if (match && match.id) {
          const putParams = (isCompanyMode && activeCompanyId) ? { companyId: Number(activeCompanyId), company_id: Number(activeCompanyId) } : undefined;
          const updatePayload:any = { amount: Number(qcAmount), alert80: true, alert100: true };
          await api.put(`/api/v1/budgets/${match.id}`, updatePayload, { params: putParams, _skipCompany: !isCompanyMode as any } as any);
          setBudgets(prev => [{ ...match, amount: Number(qcAmount) }, ...prev.filter((b:any)=> b.id !== match.id)]);
          setQcCategory(''); setQcAmount('');
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
          try { await triggerServerAlerts(p); } catch {}
          try { scrollRef.current?.scrollTo({ y: Math.max(0, budgetsSectionY - 20), animated: true }); } catch {}
          return;
        }
      } catch (preErr) {
        // Non-fatal; proceed to create
      }

      const basePayloadCat:any = { period: p, amount: Number(qcAmount), categoryId: Number(category.id), ...(isCompanyMode && activeCompanyId ? { groupId: Number(activeCompanyId) } : {}) };
      const extendedPayloadCat:any = { ...basePayloadCat, alert80: true, alert100: true, categoryName: category.name };
      const basePayloadAll:any = { period: p, amount: Number(qcAmount), categoryId: null, ...(isCompanyMode && activeCompanyId ? { groupId: Number(activeCompanyId) } : {}) };
      const extendedPayloadAll:any = { ...basePayloadAll, alert80: true, alert100: true };
      const postParams = (isCompanyMode && activeCompanyId)
        ? { companyId: Number(activeCompanyId), company_id: Number(activeCompanyId) }
        : undefined;
      const doPost = async (payload:any) => api.post('/api/v1/budgets', payload, { params: postParams, _skipCompany: !isCompanyMode as any } as any);
      let res;
      try {
        // Try minimal payload first
        res = await doPost(basePayloadCat);
      } catch (err:any) {
        // Retry once for network, else try extended payload
        if (err?.code === 'ERR_NETWORK') {
          await new Promise(r=>setTimeout(r, 400));
          res = await doPost(basePayloadCat);
        } else {
          try {
            res = await doPost(extendedPayloadCat);
          } catch (err2:any) {
            // If still failing, attempt creating an 'All Categories' budget (categoryId null)
            if (err2?.code === 'ERR_NETWORK') {
              await new Promise(r=>setTimeout(r, 400));
              try {
                res = await doPost(basePayloadAll);
              } catch (err3:any) {
                if (err3?.code === 'ERR_NETWORK') {
                  await new Promise(r=>setTimeout(r, 400));
                  res = await doPost(basePayloadAll);
                } else {
                  // Try extended-all once
                  try {
                    res = await doPost(extendedPayloadAll);
                  } catch (err4:any) {
                    if (err4?.code === 'ERR_NETWORK') {
                      await new Promise(r=>setTimeout(r, 400));
                      res = await doPost(extendedPayloadAll);
                    } else {
                      throw err4;
                    }
                  }
                }
              }
            } else {
              // Not a network error: fall back to all-categories path directly
              try {
                res = await doPost(basePayloadAll);
              } catch (err3b:any) {
                try {
                  res = await doPost(extendedPayloadAll);
                } catch (err4b:any) {
                  throw err4b;
                }
              }
            }
          }
        }
      }
      const created = res?.data;
      if (created && created.id) setBudgets(prev=>[created, ...prev]);
      setQcCategory(''); setQcAmount('');
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      // Ask server to (re)check alerts since a new budget may change thresholds
      try { await triggerServerAlerts(p); } catch {}
      try { scrollRef.current?.scrollTo({ y: Math.max(0, budgetsSectionY - 20), animated: true }); } catch {}
    } catch (e:any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to create budget';
      console.error('[Budgets quick-add] failed:', msg, e?.response?.data);
      // Fallback: if a budget exists for this category, try updating it instead
      try {
        const existing = (budgets || []).find((b:any)=> normalizeCat(b?.categoryName) === normalizeCat(qcCategory));
        if (existing && existing.id) {
          const putParams = (isCompanyMode && activeCompanyId)
            ? { companyId: Number(activeCompanyId), company_id: Number(activeCompanyId) }
            : undefined;
          const updatePayload:any = { amount: Number(qcAmount), alert80: true, alert100: true, categoryId: existing.categoryId };
          await api.put(`/api/v1/budgets/${existing.id}`, updatePayload, { params: putParams, _skipCompany: !isCompanyMode as any } as any);
          setBudgets(prev => prev.map((b:any)=> b.id === existing.id ? { ...b, amount: Number(qcAmount) } : b));
          setQcCategory(''); setQcAmount('');
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
          try { await triggerServerAlerts(period); } catch {}
          try { scrollRef.current?.scrollTo({ y: Math.max(0, budgetsSectionY - 20), animated: true }); } catch {}
          return;
        }
      } catch (fallbackErr) {
        console.error('[Budgets quick-add] fallback PUT failed:', fallbackErr);
      }
      setError(msg);
    } finally { setQcSaving(false); }
  }, [qcCategory, qcAmount, qcSaving, categories, period, isCompanyMode, activeCompanyId, normalizeCat]);

  // Derive id/name keys for a budget row
  // If the budget has no categoryId, infer it from categories only when there's a UNIQUE normalized-name match
  const getBudgetKeys = React.useCallback((b: any) => {
    const rawName = String(b?.categoryName || '');
    const norm = normalizeCat(rawName);
    let id: string | undefined = b?.categoryId ? String(b.categoryId) : undefined;
    if (!id && Array.isArray(categories) && categories.length > 0) {
      const matches = categories.filter((c:any) => normalizeCat(c?.name) === norm);
      if (matches.length === 1 && matches[0]?.id) id = String(matches[0].id);
    }
    const idKey = id ? `id:${id}` : '';
    const nameKey = `name:${rawName.toLowerCase()}`;
    const normKey = `norm:${norm}`;
    return { id, idKey, nameKey, normKey };
  }, [categories, normalizeCat]);

  // Strict variance resolver: prefer exact id match; otherwise unique normalized-name match; else undefined
  const getVarianceForBudget = React.useCallback((b: any) => {
    try {
      const { id } = getBudgetKeys(b);
      const rows = Array.isArray(variance) ? variance : [];
      if (id) {
        const byId = rows.find((r:any) => String(r?.categoryId || '') === id);
        if (byId) return byId;
      }
      const normName = normalizeCat(b?.categoryName);
      const byNorm = rows.filter((r:any) => normalizeCat(r?.categoryName) === normName);
      if (byNorm.length === 1) return byNorm[0];
      return undefined;
    } catch {
      return undefined;
    }
  }, [variance, getBudgetKeys, normalizeCat]);

  // Server-side notifications for 80%/100% thresholds
  const triggerServerAlerts = React.useCallback(async (p: string) => {
    try {
      const params = isCompanyMode && activeCompanyId ? { companyId: Number(activeCompanyId), company_id: Number(activeCompanyId) } : {};
      await api.post('/api/v1/budgets/check-alerts', null, { params: { period: p, ...params } } as any);
    } catch {}
  }, [isCompanyMode, activeCompanyId]);

  const shiftMonth = (offset: number) => {
    try {
      try { Haptics.selectionAsync(); } catch {}
      const [y, m] = (period || '').split('-').map((x) => Number(x));
      if (!y || !m) return;
      const d = new Date(y, m - 1, 1);
      d.setMonth(d.getMonth() + offset);
      const ny = d.getFullYear();
      const nm = String(d.getMonth() + 1).padStart(2, '0');
      setPeriod(`${ny}-${nm}`);
    } catch {}
  };

  const totals = React.useMemo(() => {
    const predictedArr = Array.isArray(predicted) ? predicted : [];
    const varianceArr = Array.isArray(variance) ? variance : [];
    const anomaliesArr = Array.isArray(anomalies) ? anomalies : [];
    const predTotal = predictedArr.reduce((s, it) => s + (Number(it?.amount) || 0), 0);
    const currency = (predictedArr[0]?.currency || (base ? 'INR' : '')) as string;
    const spentTotal = varianceArr.reduce((s, it) => s + (Number(it?.spent) || 0), 0);

    // Only count over/under using budget rows, resolving each to its variance via strict matcher
    // Only include budgets that are linked to a concrete categoryId to avoid name-based mis-matches
    const budgetRows = (Array.isArray(budgets) ? budgets : [])
      .filter((b: any) => Number(b?.amount) > 0 && !!b?.categoryId);
    let varianceOver = 0;
    let varianceUnder = 0;
    for (const b of budgetRows) {
      const v = getVarianceForBudget(b);
      const spent = Number(v?.spent || 0);
      const budgetAmt = Number(b?.amount || 0);
      if (spent > budgetAmt) varianceOver += (spent - budgetAmt);
      else varianceUnder += (budgetAmt - spent);
    }

    return { predTotal, currency, spentTotal, varianceOver, varianceUnder, anomaliesCount: anomaliesArr.length };
  }, [predicted, variance, anomalies, base, budgets, getVarianceForBudget]);

  // Compute overall INR total whenever variance changes
  useEffect(() => {
    const computeInr = async () => {
      try {
        setFxLoading(true);
        const rows = Array.isArray(variance) ? variance : [];
        const buckets: Record<string, number> = {};
        for (const r of rows) {
          const curr = String(r?.currency || 'INR').toUpperCase();
          const amt = Number(r?.spent || 0);
          buckets[curr] = (buckets[curr] || 0) + amt;
        }
        const others = Object.keys(buckets).filter(c => c && c !== 'INR');
        if (others.length === 0) {
          setTotalSpentINR(buckets['INR'] ?? (totals.spentTotal || 0));
          return;
        }
        // Fetch per-currency direct rate: base=<CURR>&symbols=INR
        let sumInr = Math.max(0, buckets['INR'] || 0);
        for (const c of others) {
          const amt = Math.max(0, buckets[c] || 0);
          if (amt <= 0) continue;
          const resp = await fetch(`https://api.exchangerate.host/latest?base=${encodeURIComponent(c)}&symbols=INR`);
          const data = await resp.json();
          const r = Number(data?.rates?.INR);
          // amount_in_INR = amount_in_curr * (curr->INR)
          sumInr += r > 0 && isFinite(r) ? amt * r : amt; // fallback: add raw if rate bad
        }
        setTotalSpentINR(sumInr);
      } catch (e) {
        // On failure, fall back to raw total
        setTotalSpentINR(totals.spentTotal || 0);
      } finally {
        setFxLoading(false);
      }
    };
    computeInr();
  }, [variance, totals.spentTotal]);

  // Animate layout changes when budgets/variance change or period shifts
  useEffect(() => {
    try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch {}
  }, [variance, budgets, period]);

  // Derived options for filters
  const budgetCurrencies = React.useMemo(() => {
    const set = new Set<string>();
    (budgets || []).forEach((b: any) => {
      const c = String(b?.currency || '').toUpperCase();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [budgets]);

  const categoryOptions = React.useMemo(() => {
    return (categories || []).map((c: any) => String(c.name || '')).filter(Boolean).sort();
  }, [categories]);

  // Coverage: how many categories have a budget set
  const coverage = React.useMemo(() => {
    const allNames = new Set<string>((categories || []).map((c:any)=>normalizeCat(c?.name)).filter(Boolean));
    const covered = new Set<string>();
    (budgets || []).forEach((b:any)=>{
      const name = normalizeCat(b?.categoryName);
      if (Number(b?.amount) > 0 && name) covered.add(name);
    });
    const total = allNames.size;
    const count = Array.from(allNames).filter(n => covered.has(n)).length;
    const missingNames = Array.from(allNames).filter(n => !covered.has(n));
    // Return display names for missing using original category names
    const missingDisplay = (categories || [])
      .map((c:any)=>String(c?.name||''))
      .filter(n=>n && missingNames.includes(normalizeCat(n)));
    return { count, total, missingDisplay };
  }, [categories, budgets, normalizeCat]);

  // Map for quick lookup of variance by category name
  const varianceByCategory = React.useMemo(() => {
    const map: Record<string, any> = {};
    (variance || []).forEach((v: any) => {
      const idKey = v?.categoryId ? `id:${String(v.categoryId)}` : null;
      const nameRaw = String(v?.categoryName || '');
      const nameKey = `name:${nameRaw.toLowerCase()}`;
      const normKey = `norm:${normalizeCat(nameRaw)}`;
      if (idKey) map[idKey] = v;
      map[nameKey] = v;
      map[normKey] = v;
    });
    return map;
  }, [variance, normalizeCat]);

  // Compute Top 3 risks (largest overruns)
  const topRisks = React.useMemo(() => {
    return ([...variance]
      .filter((it: any) => Number(it.spent || 0) > Number(it.budget || 0))
      .sort((a: any, b: any) => (Number(b.spent||0) - Number(b.budget||0)) - (Number(a.spent||0) - Number(a.budget||0)))
      .slice(0, 3));
  }, [variance]);

  // Load 3-month trend for selected budget (by id or normalized name)
  const loadBudgetTrend = useCallback(async (b: any) => {
    try {
      setTrendLoading(true);
      const [yy, mm] = (period || '').split('-').map(Number);
      const baseDate = new Date(yy, (mm||1)-1, 1);
      const months: string[] = [];
      for (let i=2;i>=0;i--) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth()-i, 1);
        const p = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        months.push(p);
      }
      const reqs = months.map(p => api.get('/api/v1/budgets/variance', { params: { period: p, ...(isCompanyMode && activeCompanyId ? { companyId: Number(activeCompanyId), company_id: Number(activeCompanyId) } : {}), _ts: Date.now() }, _suppressErrorLog: true, _skipCompany: !isCompanyMode as any } as any));
      const res = await Promise.allSettled(reqs);
      const normName = normalizeCat(b?.categoryName);
      const out: Array<{period:string; spent:number; budget:number; currency:string}> = [];
      res.forEach((r, idx) => {
        const p = months[idx];
        if (r.status === 'fulfilled') {
          const arr = Array.isArray(r.value.data) ? r.value.data : (r as any).value?.data?.items || [];
          const match = b?.categoryId
            ? arr.find((v:any)=> String(v?.categoryId||'') === String(b.categoryId))
            : arr.find((v:any)=> normalizeCat(v?.categoryName) === normName);
          out.push({ period: p, spent: Number(match?.spent||0), budget: Number(match?.budget||0), currency: match?.currency||'' });
        } else {
          out.push({ period: p, spent: 0, budget: 0, currency: '' });
        }
      });
      setBudgetTrend(out);
    } catch {
      setBudgetTrend([]);
    } finally {
      setTrendLoading(false);
    }
  }, [period, isCompanyMode, activeCompanyId, normalizeCat]);

  // Alerts preview: budgets projected to cross 80% soon or already >=80% and <100%
  const alertsPreview = React.useMemo(() => {
    const now = new Date();
    const [yy, mm] = (period || '').split('-').map(Number);
    const daysInMonth = new Date(yy, (mm||1), 0).getDate();
    const day = now.getMonth()+1 === mm && now.getFullYear() === yy ? now.getDate() : Math.ceil(daysInMonth/2);
    const monthProgress = Math.min(1, Math.max(0, day / (daysInMonth || 30)));
    // join budgets with variance by category name
    return (budgets || []).map((b:any) => {
      const key = String(b.categoryName || '').toLowerCase();
      const v = varianceByCategory[key];
      const spent = Number(v?.spent || 0);
      const budgetAmt = Number(b.amount || v?.budget || 0);
      const pct = budgetAmt > 0 ? spent / budgetAmt : 0;
      const projected = monthProgress > 0 ? (pct / monthProgress) : pct;
      return { name: b.categoryName || 'All Categories', pct, projected, budget: budgetAmt, spent };
    }).filter(x => x.budget > 0 && x.projected >= 0.8)
      .sort((a,b)=> b.projected - a.projected)
      .slice(0,5);
  }, [budgets, varianceByCategory, period]);

  const exportCsv = async () => {
    try {
      const header = ['Category','Budget','Spent','Variance','Currency'];
      const rows = (Array.isArray(variance) ? [...variance] : []).map((v:any) => {
        const spent = Number(v.spent||0);
        const budget = Number(v.budget||0);
        const diff = spent - budget;
        return [v.categoryName||'', budget.toFixed(2), spent.toFixed(2), diff.toFixed(2), v.currency||totals.currency||''];
      });
      const csv = [header, ...rows].map(r => r.map(val => `"${String(val).replace(/"/g,'""')}"`).join(',')).join('\n');
      await Share.share({ message: csv });
    } catch (e:any) {
      setError('Failed to export CSV');
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Loading budgets...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3b82f6"]} tintColor="#3b82f6" />}
        contentContainerStyle={{ paddingBottom: 16 }}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky Hero */}
        <View style={[styles.hero, { zIndex: 10, elevation: 3 }]}> 
          <LinearGradient
            colors={[ 'rgba(0,0,0,0)', 'rgba(0,0,0,0)' ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroRow}>
              <Text style={styles.heroTitle}>Budgets</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                <TouchableOpacity onPress={()=>shiftMonth(-1)} accessibilityLabel="Previous month">
                  <MaterialIcons name="chevron-left" size={22} color="#16a34a" />
                </TouchableOpacity>
                <TouchableOpacity
                  onLongPress={()=>{
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    const now = new Date();
                    const m = String(now.getMonth()+1).padStart(2,'0');
                    setPeriod(`${now.getFullYear()}-${m}`);
                    setShowResetToast(true);
                    setTimeout(()=> setShowResetToast(false), 2000);
                  }}
                >
                  <View style={styles.heroPill}><Text style={styles.heroPillText}>{period}</Text></View>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>shiftMonth(1)} accessibilityLabel="Next month">
                  <MaterialIcons name="chevron-right" size={22} color="#16a34a" />
                </TouchableOpacity>
              </View>
            {showResetToast && (
              <View style={styles.toast}>
                <Text style={styles.toastText}>Period reset to current month</Text>
              </View>
            )}
            </View>
            <View style={styles.heroRow}>
              <Text style={styles.heroSubtitle}>Totals</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => { try { Haptics.selectionAsync(); } catch {}; setShowBudgetFilters(true); setBudgetCategoryFilters(coverage.missingDisplay); }}
                  accessibilityLabel="Coverage: categories with budgets"
                >
                  <View style={styles.heroPill}><Text style={styles.heroPillText}>Cvr {coverage.count}/{coverage.total}</Text></View>
                </TouchableOpacity>
                <View style={styles.asOfPill}><Text style={styles.asOfText}>{totals.currency || 'INR'}</Text></View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.contentWrap}>

      {/* (Date range selector removed) */}


      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <MaterialIcons name="account-balance-wallet" size={18} color="#22C55E" />
            <Text style={styles.cardLabel}>Total Spent</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#0f172a' }]}>{formatINR(totalSpentINR ?? totals.spentTotal)}</Text>
          {fxLoading ? (<Text style={styles.dimSmall}>Converting to INR…</Text>) : null}
        </View>
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <MaterialIcons name="insights" size={18} color="#1976D2" />
            <Text style={styles.cardLabel}>Predicted Total</Text>
          </View>
          <Text style={styles.cardValue}>{totals.predTotal.toFixed(2)} {totals.currency}</Text>
        </View>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <MaterialIcons name="trending-up" size={18} color="#D32F2F" />
            <Text style={styles.cardLabel}>Over Budget</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#D32F2F' }]}>{totals.varianceOver.toFixed(2)} {totals.currency}</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <MaterialIcons name="trending-down" size={18} color="#388E3C" />
            <Text style={styles.cardLabel}>Under Budget</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#388E3C' }]}>{totals.varianceUnder.toFixed(2)} {totals.currency}</Text>
        </View>
      </View>

      {/* Budgets header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.section}>Budgets</Text>
        <TouchableOpacity onPress={() => { try { Haptics.selectionAsync(); } catch {}; setShowBudgetFilters(true); }} style={styles.ghostIconBtn}>
          <MaterialIcons name="tune" size={18} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Budgets list */}
      <View style={styles.listCard} onLayout={(e)=> setBudgetsSectionY(e.nativeEvent.layout.y)}>
        {/* Inline Quick Create */}
        <View style={[styles.rowBetween, styles.tightRow, { marginBottom: 6, gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }]}> 
          <TouchableOpacity onPress={() => { try { Haptics.selectionAsync(); } catch {}; setShowCategoryPicker(true); }} style={[styles.inputSm, { flex: 1 }]}>
            <Text style={{ color: qcCategory ? '#0f172a' : '#64748b' }}>{qcCategory || 'Pick category'}</Text>
          </TouchableOpacity>
          <View style={{ flexBasis: 110, flexGrow: 1 }}>
            <TextInput
              ref={amountRef}
              style={[styles.inputSm, { minWidth: 90 }]}
              keyboardType={Platform.OS === 'android' ? 'numeric' : 'decimal-pad'}
              placeholder="Amount"
              value={qcAmount}
              onChangeText={setQcAmount}
              returnKeyType="done"
              onSubmitEditing={handleQuickAdd}
            />
            {!!qcAmount && (
              <TouchableOpacity onPress={() => setQcAmount('')} style={styles.clearBtnInline} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={16} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity disabled={!qcCategory || !(Number(qcAmount)>0) || qcSaving}
            onPress={handleQuickAdd}
            style={[styles.saveBtn, { height: 38, paddingVertical: 0, paddingHorizontal: 12, minWidth: 72, borderRadius: 12, alignItems:'center', justifyContent:'center', alignSelf:'center', opacity: (!qcCategory || !(Number(qcAmount)>0) || qcSaving) ? 0.6 : 1 }]}
          >
            {qcSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>
        {(!qcCategory || !(Number(qcAmount)>0)) && (
          <Text style={{ color:'#D32F2F', fontSize: 12, marginBottom: 8, paddingHorizontal: 2 }}>
            { !qcCategory ? 'Pick a category' : 'Enter a valid amount > 0' }
          </Text>
        )}
        <View style={{ height: 1, backgroundColor: '#eee', marginBottom: 10, marginTop: 2 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
          <Text style={[styles.cardLabel, { fontSize: 13 }]}>Manage budgets</Text>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <TouchableOpacity onPress={() => { try { Haptics.selectionAsync(); } catch {}; exportCsv(); }} style={styles.ghostIconBtn}>
              <MaterialIcons name="file-download" size={18} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { try { Haptics.selectionAsync(); } catch {}; exportCsv(); }} style={[styles.ghostIconBtn, { marginLeft: 6 }]}>
              <MaterialIcons name="share" size={18} color="#1976D2" />
            </TouchableOpacity>
          </View>
        </View>
        <TextInput
          style={[styles.inputSm, { marginHorizontal: 0, marginBottom: 8 }]}
          placeholder="Search budgets by category"
          value={budgetQuery}
          onChangeText={setBudgetQuery}
        />
        <View style={[styles.rowChips, { marginBottom: 10 }]}>
          <TouchableOpacity onPress={() => { try { Haptics.selectionAsync(); } catch {}; setBudgetSort('amount_desc'); }} style={[styles.chip, budgetSort==='amount_desc' && styles.chipActive]}>
            <Text style={[styles.chipTextSmall, budgetSort==='amount_desc' && styles.chipTextActive]}>Amt▼</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { try { Haptics.selectionAsync(); } catch {}; setBudgetSort('name_asc'); }} style={[styles.chip, budgetSort==='name_asc' && styles.chipActive]}>
            <Text style={[styles.chipTextSmall, budgetSort==='name_asc' && styles.chipTextActive]}>A→Z</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              const miss = (coverage?.missingDisplay || []) as string[];
              setBudgetCategoryFilters((prev)=> (prev.length === miss.length ? [] : miss));
            }}
            style={[styles.chip, (budgetCategoryFilters.length>0 && budgetCategoryFilters.length === (coverage?.missingDisplay||[]).length) && styles.chipActive]}
          >
            <Text style={[styles.chipTextSmall, (budgetCategoryFilters.length>0 && budgetCategoryFilters.length === (coverage?.missingDisplay||[]).length) && styles.chipTextActive]}>Missing ({(coverage?.missingDisplay||[]).length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { try { Haptics.selectionAsync(); } catch {}; setOverrunsOnly(v=>!v); }}
            style={[styles.chip, overrunsOnly && styles.chipActive]}
          >
            <Text style={[styles.chipTextSmall, overrunsOnly && styles.chipTextActive]}>Overruns</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
            {[0,1,2,3].map((i)=> (
              <View key={i} style={{ marginBottom: 12 }}>
                <View style={{ height: 14, width: '60%', backgroundColor: '#E5E7EB', borderRadius: 8, marginBottom: 8 }} />
                <View style={{ height: 10, width: '100%', backgroundColor: '#F1F5F9', borderRadius: 999 }} />
              </View>
            ))}
          </View>
        ) : budgets.length === 0 ? (
          <Text style={styles.dim}>No budgets for this period</Text>
        ) : (
          ([...budgets]
            .filter(b => !budgetQuery || String(b.categoryName||'').toLowerCase().includes(budgetQuery.toLowerCase()))
            .filter(b => budgetCurrency === 'ALL' || String(b.currency || '').toUpperCase() === budgetCurrency)
            .filter(b => !budgetMinAmount || Number(b.amount || 0) >= Number(budgetMinAmount))
            .filter(b => !budgetMaxAmount || Number(b.amount || 0) <= Number(budgetMaxAmount))
            .filter(b => budgetCategoryFilters.length === 0 || budgetCategoryFilters.includes(String(b.categoryName || '')))
            .filter(b => {
              if (!overrunsOnly) return true;
              const v = getVarianceForBudget(b);
              const spent = Number(v?.spent || 0);
              const budgetAmt = Number(b.amount || v?.budget || 0);
              return spent > budgetAmt;
            })
            .sort((a,b)=>{
              if (budgetSort==='amount_desc') return Number(b.amount||0) - Number(a.amount||0);
              return String(a.categoryName||'').localeCompare(String(b.categoryName||''));
            })
          ).map((b) => (
            <Swipeable
              key={b.id}
              renderLeftActions={() => (
                <View style={{ backgroundColor:'#E8F5E9', justifyContent:'center', paddingHorizontal: 12 }}>
                  <Text style={{ color:'#4CAF50', fontWeight:'700' }}>Edit</Text>
                </View>
              )}
              onSwipeableLeftOpen={() => {
                setEditingBudget(b);
                setBudgetForm({
                  categoryId: b.categoryId ? String(b.categoryId) : undefined,
                  amount: String(b.amount || ''),
                  alertThreshold: budgetForm.alertThreshold || '80',
                  alert80: !!b.alert80,
                  alert100: !!b.alert100,
                  groupId: b.groupId ? Number(b.groupId) : undefined,
                });
                try { Haptics.selectionAsync(); } catch {}
                setShowBudgetModal(true);
              }}
              renderRightActions={() => (
                <View style={{ backgroundColor:'#FDECEA', justifyContent:'center', paddingHorizontal: 12 }}>
                  <Text style={{ color:'#D32F2F', fontWeight:'700' }}>Delete</Text>
                </View>
              )}
              onSwipeableRightOpen={() => {
                const name = b.categoryName || 'All Categories';
                Alert.alert(
                  'Delete budget?',
                  `Are you sure you want to delete the budget for ${name}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => {
                        try {
                          await api.delete(`/api/v1/budgets/${b.id}`, {
                            params: (isCompanyMode && activeCompanyId && Number(activeCompanyId) > 0)
                              ? { companyId: activeCompanyId, company_id: activeCompanyId }
                              : undefined,
                            _skipCompany: !isCompanyMode as any,
                          } as any);
                          load();
                        } catch (e) {
                          setError('Failed to delete budget');
                        }
                      } },
                  ]
                );
              }}
            >
            <View style={styles.budgetItem}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => { setSelectedBudget(b); loadBudgetTrend(b); setShowBudgetDetails(true); }}>
                <Text style={styles.rowLabel}>{b.categoryName || 'All Categories'}</Text>
                <View style={styles.inlineRow}>
                  <Text style={styles.dimSmall}>Alerts: {b.alert80 ? '80%' : '-'} {b.alert100 ? '/ 100%' : ''}</Text>
                  {/* Health badge */}
                  {(() => {
                    const v = getVarianceForBudget(b);
                    const overallNames = new Set(['all categories','overall','all']);
                    const isOverall = !b?.categoryId && overallNames.has(normalizeCat(b?.categoryName));
                    const spent = isOverall ? (base ? (totalSpentINR ?? totals.spentTotal) : totals.spentTotal) : Number(v?.spent || 0);
                    const budgetAmt = Number(b.amount || v?.budget || 0);
                    const pct = budgetAmt > 0 ? spent / budgetAmt : 0;
                    let badgeStyle = styles.badgeHealthy; let label = 'Healthy';
                    if (pct >= 1) { badgeStyle = styles.badgeOver; label = 'Overrun'; }
                    else if (pct >= 0.8) { badgeStyle = styles.badgeWatch; label = 'Watch'; }
                    return (
                      <View style={[styles.badge, badgeStyle]}>
                        <Text style={styles.badgeText}>{label}</Text>
                      </View>
                    );
                  })()}
                </View>
                {(() => {
                  const v = getVarianceForBudget(b);
                  const overallNames = new Set(['all categories','overall','all']);
                  const isOverall = !b?.categoryId && overallNames.has(normalizeCat(b?.categoryName));
                  const spent = isOverall ? (base ? (totalSpentINR ?? totals.spentTotal) : totals.spentTotal) : Number(v?.spent || 0);
                  const budgetAmt = Number(b.amount || v?.budget || 0);
                  const currency = b.currency || v?.currency || totals.currency || (base ? 'INR' : '');
                  const pct = budgetAmt > 0 ? Math.min(1, Math.max(0, spent / budgetAmt)) : 0;
                  const over = budgetAmt > 0 ? Math.max(0, spent - budgetAmt) : 0;
                  const remaining = budgetAmt > 0 ? Math.max(0, budgetAmt - spent) : 0;
                  const fillColor = spent >= budgetAmt ? '#D32F2F' : (spent >= 0.8 * budgetAmt ? '#FB8C00' : '#22C55E');
                  return (
                    <View style={{ marginTop: 6 }}>
                      {budgetAmt > 0 ? (
                        <>
                          <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${Math.round(pct*100)}%`, backgroundColor: fillColor }]} />
                          </View>
                          <View style={[styles.inlineRow, { justifyContent:'space-between', marginTop: 4 }]}>
                            <Text style={styles.dimSmall}>Spent {spent.toFixed(2)} {currency} of {budgetAmt.toFixed(2)} {currency}</Text>
                            {over > 0 ? (
                              <Text style={[styles.dimSmall, { color: '#D32F2F', fontWeight: '700' }]}>Over by {over.toFixed(2)} {currency}</Text>
                            ) : (
                              <Text style={[styles.dimSmall, { color: '#15803d', fontWeight: '700' }]}>Left {remaining.toFixed(2)} {currency}</Text>
                            )}
                          </View>
                        </>
                      ) : (
                        <Text style={styles.dimSmall}>No budget set</Text>
                      )}
                      {__DEV__ && !isOverall && (
                        <Text style={[styles.dimSmall, { marginTop: 2 }]}>
                          {`[debug] match: ${b?.categoryId ? 'id:'+b.categoryId : 'name:'+String(b?.categoryName||'')} -> ${(v?.categoryName || '—')} spent=${(Number(v?.spent||0)).toFixed(2)}`}
                        </Text>
                      )}
                    </View>
                  );
                })()}
              </TouchableOpacity>
              <View style={styles.inlineRow}>
                <Text style={styles.rowValue}>{Number(b.amount || 0).toFixed(2)} {b.currency || (base ? 'INR' : '')}</Text>
                <TouchableOpacity onPress={() => {
                  try { Haptics.selectionAsync(); } catch {}
                  setEditingBudget(b);
                  setBudgetForm({
                    categoryId: b.categoryId ? String(b.categoryId) : undefined,
                    amount: String(b.amount || ''),
                    alertThreshold: budgetForm.alertThreshold || '80',
                    alert80: !!b.alert80,
                    alert100: !!b.alert100,
                    groupId: b.groupId ? Number(b.groupId) : undefined,
                  });
                  setShowBudgetModal(true);
                }}>
                  <MaterialIcons name="edit" size={20} color="#4CAF50" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  const name = b.categoryName || 'All Categories';
                  Alert.alert(
                    'Delete budget?',
                    `Are you sure you want to delete the budget for ${name}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: async () => {
                          try {
                            try { Haptics.selectionAsync(); } catch {}
                            await api.delete(`/api/v1/budgets/${b.id}`);
                            load();
                          } catch (e) {
                            setError('Failed to delete budget');
                          }
                        } },
                    ]
                  );
                }}>
                  <MaterialIcons name="delete-outline" size={20} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            </View>
            </Swipeable>
          ))
        )}
      </View>
        {error && (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" color="#D32F2F" size={18} />
            <Text style={styles.errorText}>{error}</Text>
            {String(error).toLowerCase().includes('session expired') ? (
              <TouchableOpacity style={styles.retryBtn} onPress={() => logout()}>
                <Text style={styles.retryText}>Login</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {/* Top risks summary */}
        {topRisks.length > 0 && (
          <View style={[styles.listCard, { marginTop: 10 }]}>
            <View style={styles.cardTopRow}>
              <MaterialIcons name="warning" size={18} color="#FB8C00" />
              <Text style={styles.cardLabel}>Top risks (likely overruns)</Text>
            </View>
            {topRisks.map((r:any, idx:number)=>{
              const over = Number(r.spent||0) - Number(r.budget||0);
              return (
                <View key={`risk${idx}`} style={styles.rowBetween}>
                  <Text style={styles.rowLabel}>{r.categoryName||'—'}</Text>
                  <Text style={[styles.rowValue, { color:'#D32F2F' }]}>{over.toFixed(2)} {r.currency||totals.currency||''}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Alerts preview */}
        {alertsPreview.length > 0 && (
          <View style={[styles.listCard, { marginTop: 10 }]}>
            <View style={styles.cardTopRow}>
              <MaterialIcons name="notifications-active" size={18} color="#4CAF50" />
              <Text style={styles.cardLabel}>Alerts preview (projected ≥ 80%)</Text>
            </View>
            {alertsPreview.map((a:any, idx:number)=> (
              <View key={`alert${idx}`} style={styles.rowBetween}>
                <Text style={styles.rowLabel}>{a.name}</Text>
                <Text style={styles.dimSmall}>{Math.round(a.pct*100)}% now → {Math.round(a.projected*100)}% proj.</Text>
              </View>
            ))}
          </View>
        )}

        {/* Insights */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.section}>Insights</Text>
        </View>
        {Array.isArray(insightTips) && insightTips.length > 0 && (
          <View style={[styles.listCard, { marginBottom: 10 }]}>
            <View style={styles.cardTopRow}>
              <MaterialIcons name="tips-and-updates" size={18} color="#4CAF50" />
              <Text style={styles.cardLabel}>Tips</Text>
            </View>
            {insightTips.slice(0,3).map((t:any, idx:number)=> (
              <View key={`tip${idx}`} style={styles.rowBetween}>
                <Text style={styles.rowText}>{t?.message || t?.text || JSON.stringify(t)}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.segmentedBar}>
          <TouchableOpacity onPress={() => setInsightsTab('variance')} style={[styles.segmentedItem, insightsTab==='variance' && styles.segmentedItemActive]}>
            <Text style={[styles.segmentedText, insightsTab==='variance' && styles.segmentedTextActive]}>Variance</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setInsightsTab('predicted')} style={[styles.segmentedItem, insightsTab==='predicted' && styles.segmentedItemActive]}>
            <Text style={[styles.segmentedText, insightsTab==='predicted' && styles.segmentedTextActive]}>Predicted</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setInsightsTab('anomalies')} style={[styles.segmentedItem, insightsTab==='anomalies' && styles.segmentedItemActive]}>
            <Text style={[styles.segmentedText, insightsTab==='anomalies' && styles.segmentedTextActive]}>Anomalies</Text>
          </TouchableOpacity>
        </View>

        {insightsTab==='variance' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowH}>
              <TouchableOpacity onPress={() => setOverrunsOnly(v=>!v)} style={[styles.chipFilter, overrunsOnly && styles.chipActive]}>
                <MaterialIcons name="priority-high" size={14} color={overrunsOnly ? '#fff' : '#4CAF50'} />
                <Text style={[styles.chipText, overrunsOnly && styles.chipTextActive]}>Overruns</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVarianceSort('variance_desc')} style={[styles.chipFilter, varianceSort==='variance_desc' && styles.chipActive]}>
                <Text style={[styles.chipText, varianceSort==='variance_desc' && styles.chipTextActive]}>Var▼</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVarianceSort('amount_desc')} style={[styles.chipFilter, varianceSort==='amount_desc' && styles.chipActive]}>
                <Text style={[styles.chipText, varianceSort==='amount_desc' && styles.chipTextActive]}>Amt▼</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVarianceSort('name_asc')} style={[styles.chipFilter, varianceSort==='name_asc' && styles.chipActive]}>
                <Text style={[styles.chipText, varianceSort==='name_asc' && styles.chipTextActive]}>A→Z</Text>
              </TouchableOpacity>
            </ScrollView>
            {variance.length === 0 ? (
              <Text style={styles.dim}>No variance data</Text>
            ) : (
              <View style={styles.listCard}>
                {([...variance]
                  .filter((it)=>!overrunsOnly || Number(it.spent||0) > Number(it.budget||0))
                  .sort((a,b)=>{
                    if (varianceSort==='variance_desc') {
                      const va = Number(a.spent||0) - Number(a.budget||0);
                      const vb = Number(b.spent||0) - Number(b.budget||0);
                      return vb - va;
                    }
                    if (varianceSort==='amount_desc') {
                      return Number(b.spent||0) - Number(a.spent||0);
                    }
                    const na = String(a.categoryName||'');
                    const nb = String(b.categoryName||'');
                    return na.localeCompare(nb);
                  }))
                  .map((item, idx) => {
                  const spent = Number(item.spent || 0);
                  const budget = Number(item.budget || 0);
                  const over = spent - budget;
                  const color = over >= 0 ? '#D32F2F' : '#388E3C';
                  const pct = budget > 0 ? Math.min(1, Math.max(0, spent / budget)) : 0;
                  const barColor = pct >= 1 ? '#D32F2F' : pct >= 0.8 ? '#FB8C00' : '#4CAF50';
                  const resolvedName = (item.categoryName && String(item.categoryName).trim())
                    ? String(item.categoryName)
                    : (() => {
                        const id = item?.categoryId;
                        if (id && Array.isArray(categories)) {
                          const match = categories.find((c:any) => String(c.id) === String(id));
                          if (match && match.name) return String(match.name);
                        }
                        return 'Uncategorized';
                      })();
                  return (
                    <View key={`v${idx}`} style={{ paddingVertical: 8 }}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.rowLabel}>{resolvedName}</Text>
                        <Text style={[styles.rowValue, { color }] }>
                          {spent.toFixed(2)} / {budget.toFixed(2)} {item.currency || ''}
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {insightsTab==='predicted' && (
          predicted.length === 0 ? (
            <Text style={styles.dim}>No predictions</Text>
          ) : (
            <View style={styles.listCard}>
              {predicted.map((item, idx) => (
                <View key={`p${idx}`} style={styles.rowBetween}>
                  <Text style={styles.rowLabel}>{item.categoryName || '—'}</Text>
                  <Text style={styles.rowValue}>{Number(item.amount || 0).toFixed(2)} {item.currency || ''}</Text>
                </View>
              ))}
            </View>
          )
        )}

        {insightsTab==='anomalies' && (
          anomalies.length === 0 ? (
            <Text style={styles.dim}>No anomalies</Text>
          ) : (
            <View style={styles.listCard}>
              {anomalies.map((item, idx) => (
                <View key={`a${idx}`} style={styles.rowItem}>
                  <MaterialIcons name="warning-amber" color="#FB8C00" size={18} />
                  <Text style={styles.rowText}>{item.message || JSON.stringify(item)}</Text>
                </View>
              ))}
            </View>
          )
        )}
        </View>
      </ScrollView>

      {/* Budget Details Bottom Sheet */}
      <Modal
        visible={showBudgetDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBudgetDetails(false)}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheetBackdrop} onPress={() => setShowBudgetDetails(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{selectedBudget?.categoryName || 'Budget details'}</Text>
              <TouchableOpacity onPress={() => setShowBudgetDetails(false)}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            {(() => {
              const b = selectedBudget || {};
              const v = b ? getVarianceForBudget(b) : undefined;
              const overallNames = new Set(['all categories','overall','all']);
              const isOverall = b && !b.categoryId && overallNames.has(normalizeCat(b?.categoryName));
              const spent = b ? (isOverall ? (base ? (totalSpentINR ?? totals.spentTotal) : totals.spentTotal) : Number(v?.spent || 0)) : 0;
              const budgetAmt = Number(b?.amount || v?.budget || 0);
              const currency = b?.currency || v?.currency || totals.currency || (base ? 'INR' : '');
              const pct = budgetAmt > 0 ? Math.min(1, Math.max(0, spent / budgetAmt)) : 0;
              const over = budgetAmt > 0 ? Math.max(0, spent - budgetAmt) : 0;
              const remaining = budgetAmt > 0 ? Math.max(0, budgetAmt - spent) : 0;
              const fillColor = spent >= budgetAmt ? '#D32F2F' : (spent >= 0.8 * budgetAmt ? '#FB8C00' : '#22C55E');
              return (
                <>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(pct*100)}%`, backgroundColor: fillColor }]} />
                  </View>
                  <View style={[styles.rowBetween, { marginTop: 8 }]}>
                    <Text style={styles.dimSmall}>Spent</Text>
                    <Text style={styles.rowValue}>{spent.toFixed(2)} {currency}</Text>
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.dimSmall}>Budget</Text>
                    <Text style={styles.rowValue}>{budgetAmt.toFixed(2)} {currency}</Text>
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.dimSmall}>{over > 0 ? 'Over by' : 'Left'}</Text>
                    <Text style={[styles.rowValue, { color: over>0?'#D32F2F':'#15803d' }]}>{(over>0?over:remaining).toFixed(2)} {currency}</Text>
                  </View>
                  <View style={[styles.quickRow, { justifyContent:'flex-end' }]}>
                    <TouchableOpacity style={styles.filterBtnSecondary} onPress={() => setShowBudgetDetails(false)}>
                      <MaterialIcons name="close" size={18} color="#374151" />
                      <Text style={styles.filterBtnTextSecondary}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterBtnPrimary, { marginLeft: 8 }]} onPress={() => {
                      if (!selectedBudget) return;
                      setEditingBudget(selectedBudget);
                      setBudgetForm({
                        categoryId: selectedBudget.categoryId ? String(selectedBudget.categoryId) : undefined,
                        amount: String(selectedBudget.amount || ''),
                        alertThreshold: budgetForm.alertThreshold || '80',
                        alert80: !!selectedBudget.alert80,
                        alert100: !!selectedBudget.alert100,
                        groupId: selectedBudget.groupId ? Number(selectedBudget.groupId) : undefined,
                      });
                      setShowBudgetDetails(false);
                      setShowBudgetModal(true);
                    }}>
                      <MaterialIcons name="edit" size={18} color="#fff" />
                      <Text style={styles.filterBtnTextPrimary}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.listCard, { marginTop: 10 }]}>
                    <View style={styles.cardTopRow}>
                      <MaterialIcons name="show-chart" size={18} color="#1976D2" />
                      <Text style={styles.cardLabel}>Last 3 months</Text>
                    </View>
                    <View style={{ marginTop: 6 }}>
                      {trendLoading ? (
                        <ActivityIndicator size="small" color="#1976D2" />
                      ) : (
                        budgetTrend.length === 0 ? (
                          <Text style={styles.dimSmall}>No data</Text>
                        ) : budgetTrend.map((t, idx)=>{
                          const pct = t.budget > 0 ? Math.min(1, Math.max(0, t.spent / t.budget)) : 0;
                          const color = pct >= 1 ? '#D32F2F' : pct >= 0.8 ? '#FB8C00' : '#4CAF50';
                          return (
                            <View key={`tr${idx}`} style={{ marginBottom: 6 }}>
                              <View style={styles.rowBetween}>
                                <Text style={styles.dimSmall}>{t.period}</Text>
                                <Text style={styles.dimSmall}>{t.spent.toFixed(2)} / {t.budget.toFixed(2)} {t.currency || ''}</Text>
                              </View>
                              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct*100}%`, backgroundColor: color }]} /></View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </View>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Range Summary Modal */}
      <Modal
        visible={showRangeSummary}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRangeSummary(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.budgetModal, { width: '100%', maxWidth: 420 }] }>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Range Summary</Text>
              <TouchableOpacity onPress={() => setShowRangeSummary(false)}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            {rangeSummaryLoading ? (
              <ActivityIndicator size="small" color="#1976D2" />
            ) : rangeSummary.length === 0 ? (
              <Text style={styles.dim}>No data</Text>
            ) : (
              <View style={styles.listCard}>
                {rangeSummary.map((row, idx) => (
                  <View key={`rs${idx}`} style={styles.rowBetween}>
                    <Text style={styles.rowLabel}>{row.categoryName}</Text>
                    <Text style={styles.rowValue}>{row.spent.toFixed(2)} / {row.budget.toFixed(2)} {row.currency || ''}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={{ marginTop: 8 }}>
              <TouchableOpacity style={styles.filterBtnSecondary} onPress={loadRangeSummary}>
                <MaterialIcons name="refresh" size={18} color="#374151" />
                <Text style={styles.filterBtnTextSecondary}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Budget Modal */}
      <Modal
        visible={showBudgetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBudgetModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.budgetModal}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{editingBudget ? 'Edit Budget' : 'Add Budget'}</Text>
              <TouchableOpacity disabled={submitting} onPress={() => setShowBudgetModal(false)}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Period</Text>
            <View style={styles.monthBar}>
              <TouchableOpacity style={[styles.iconBtnSmall, styles.clearBtnSmall]} onPress={() => shiftMonth(-1)}>
                <MaterialIcons name="chevron-left" size={18} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.periodText}>{period}</Text>
              <TouchableOpacity style={[styles.iconBtnSmall, styles.clearBtnSmall]} onPress={() => shiftMonth(1)}>
                <MaterialIcons name="chevron-right" size={18} color="#111827" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              {/* Range toggle */}
              <TouchableOpacity onPress={() => setRangeMode(v=>!v)} style={[styles.chip, rangeMode && styles.chipActive, { paddingVertical: 6, paddingHorizontal: 10 }]}>
                <MaterialIcons name="date-range" size={14} color={rangeMode ? '#fff' : '#15803d'} />
                <Text style={[styles.chipTextSmall, rangeMode && styles.chipTextActive]}>Range</Text>
              </TouchableOpacity>
            </View>

            {rangeMode && (
              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <Text style={[styles.dimSmall, { width: 48 }]}>Start</Text>
                  <TouchableOpacity style={[styles.iconBtnSmall, styles.clearBtnSmall]} onPress={() => {
                    const next = bumpMonth(startPeriod, -1);
                    setStartPeriod(next);
                    if (new Date(next+'-01') > new Date(endPeriod+'-01')) setEndPeriod(next);
                  }}>
                    <MaterialIcons name="chevron-left" size={18} color="#111827" />
                  </TouchableOpacity>
                  <Text style={[styles.periodText, { minWidth: 88, textAlign: 'center' }]}>{startPeriod}</Text>
                  <TouchableOpacity style={[styles.iconBtnSmall, styles.clearBtnSmall]} onPress={() => {
                    const next = bumpMonth(startPeriod, 1);
                    setStartPeriod(next);
                    if (new Date(next+'-01') > new Date(endPeriod+'-01')) setEndPeriod(next);
                  }}>
                    <MaterialIcons name="chevron-right" size={18} color="#111827" />
                  </TouchableOpacity>
                  <View style={{ width: 8 }} />
                  <TouchableOpacity style={[styles.iconBtnSmall, styles.clearBtnSmall]} onPress={openStartDatePicker}>
                    <MaterialIcons name="event" size={18} color="#111827" />
                  </TouchableOpacity>
                  <Text style={[styles.dimSmall, { marginLeft: 6 }]}>{startDate}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={[styles.dimSmall, { width: 48 }]}>End</Text>
                  <TouchableOpacity style={[styles.iconBtnSmall, styles.clearBtnSmall]} onPress={() => {
                    const next = bumpMonth(endPeriod, -1);
                    setEndPeriod(next);
                    if (new Date(next+'-01') < new Date(startPeriod+'-01')) setStartPeriod(next);
                  }}>
                    <MaterialIcons name="chevron-left" size={18} color="#111827" />
                  </TouchableOpacity>
                  <Text style={[styles.periodText, { minWidth: 88, textAlign: 'center' }]}>{endPeriod}</Text>
                  <TouchableOpacity style={[styles.iconBtnSmall, styles.clearBtnSmall]} onPress={() => {
                    const next = bumpMonth(endPeriod, 1);
                    setEndPeriod(next);
                    if (new Date(next+'-01') < new Date(startPeriod+'-01')) setStartPeriod(next);
                  }}>
                    <MaterialIcons name="chevron-right" size={18} color="#111827" />
                  </TouchableOpacity>
                  <View style={{ width: 8 }} />
                  <TouchableOpacity style={[styles.iconBtnSmall, styles.clearBtnSmall]} onPress={openEndDatePicker}>
                    <MaterialIcons name="event" size={18} color="#111827" />
                  </TouchableOpacity>
                  <Text style={[styles.dimSmall, { marginLeft: 6 }]}>{endDate}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                  <TouchableOpacity style={[styles.filterBtnSecondary, { minWidth: undefined, paddingHorizontal: 12 }]} onPress={() => setShowRangeSummary(true)}>
                    <MaterialIcons name="summarize" size={18} color="#374151" />
                    <Text style={styles.filterBtnTextSecondary}>Summary</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={{ color: budgetForm.categoryId ? '#111827' : '#6b7280' }}>
                {budgetForm.categoryId
                  ? (categories.find(c=>String(c.id)===budgetForm.categoryId)?.name || `ID ${budgetForm.categoryId}`)
                  : 'Select category (optional)'}
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection:'row', justifyContent:'flex-end' }}>
              <TouchableOpacity onPress={() => { setNewCategoryName(''); setShowCategoryPicker(true); }}>
                <Text style={{ color:'#1976D2', fontWeight:'600' }}>+ Add new category</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Amount</Text>
            <TextInput style={styles.input} placeholder="Enter amount" value={budgetForm.amount || ''} onChangeText={(v)=>setBudgetForm(f=>({...f, amount: v}))} keyboardType="decimal-pad" />

            {rangeMode && !editingBudget && (
              <View style={styles.switchRow}>
                <Text style={styles.label}>Apply to full range</Text>
                <Switch value={applyToRange} onValueChange={setApplyToRange} />
              </View>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.label}>Alert at 80%</Text>
              <Switch value={budgetForm.alert80} onValueChange={(v)=>setBudgetForm(f=>({...f, alert80: v}))} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Alert at 100%</Text>
              <Switch value={budgetForm.alert100} onValueChange={(v)=>setBudgetForm(f=>({...f, alert100: v}))} />
            </View>

            {isCompanyMode ? (
              <>
                <Text style={styles.label}>Team (optional)</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowTeamPicker(true)}
                >
                  <Text style={{ color: budgetForm.groupId ? '#111827' : '#6b7280' }}>
                    {budgetForm.groupId
                      ? (teams.find(t=>t.id===budgetForm.groupId)?.name || `Team #${budgetForm.groupId}`)
                      : 'Select team (optional)'}
                  </Text>
                </TouchableOpacity>
                {budgetForm.groupId && (
                  <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: 4 }}>
                    <TouchableOpacity onPress={() => setBudgetForm(f=>({...f, groupId: undefined}))}>
                      <Text style={{ color:'#DC2626', fontWeight:'600', fontSize:13 }}>Clear selection</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.label}>Group ID (optional)</Text>
                <TextInput style={styles.input} placeholder="e.g. 10" value={String(budgetForm.groupId ?? '')} onChangeText={(v)=>setBudgetForm(f=>({...f, groupId: v ? Number(v) : undefined}))} keyboardType="number-pad" />
              </>
            )}

            {/* Save button with validation */}
            <TouchableOpacity
              style={[styles.saveBtn, (submitting || !(Number(budgetForm.amount) > 0)) && { opacity: 0.6 }]}
              disabled={submitting || !(Number(budgetForm.amount) > 0)}
              onPress={async ()=>{
                try {
                  try { Haptics.selectionAsync(); } catch {}
                  setSubmitting(true);
                  if (editingBudget) {
                    const updatePayload = {
                      amount: Number(budgetForm.amount || 0),
                      alert80: !!budgetForm.alert80,
                      alert100: !!budgetForm.alert100,
                    };
                    const res = await api.put(`/api/v1/budgets/${editingBudget.id}`, updatePayload);
                    const updated = res?.data;
                    if (updated && updated.id) setBudgets(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
                    Alert.alert('Success', 'Budget updated');
                  } else {
                    // Create for single period or full range
                    const payloadBase: any = {
                      amount: Number(budgetForm.amount || 0),
                      alert80: !!budgetForm.alert80,
                      alert100: !!budgetForm.alert100,
                    };
                    if (budgetForm.categoryId) payloadBase.categoryId = Number(budgetForm.categoryId);
                    if (budgetForm.groupId) payloadBase.groupId = Number(budgetForm.groupId);
                    // CRITICAL: Include companyId in body for proper scoping
                    // null = personal mode, number = company mode
                    if (isCompanyMode && activeCompanyId && Number(activeCompanyId) > 0) {
                      payloadBase.companyId = Number(activeCompanyId);
                    } else {
                      payloadBase.companyId = null;
                    }
                    const reqCfg: any = {
                      params: (isCompanyMode && activeCompanyId && Number(activeCompanyId) > 0)
                        ? { companyId: activeCompanyId, company_id: activeCompanyId }
                        : undefined,
                      _skipCompany: !isCompanyMode as any,
                    };
                    const months = applyToRange && rangeMode
                      ? monthsBetween(monthOf(startDate || (startPeriod+'-01')), monthOf(endDate || (endPeriod+'-01')))
                      : [period];
                    let createdCount = 0;
                    for (const p of months) {
                      const createPayload = { ...payloadBase, period: p };
                      try {
                        const res = await api.post('/api/v1/budgets', createPayload, reqCfg);
                        const created = res?.data;
                        if (created && created.id) { setBudgets(prev => [created, ...prev]); createdCount++; }
                      } catch (e:any) {
                        // continue others
                      }
                    }
                    Alert.alert('Success', createdCount > 1 ? `Created ${createdCount} budgets` : 'Budget created');
                  }
                  setShowBudgetModal(false);
                  setEditingBudget(null);
                  setBudgetForm({ categoryId:'', amount:'', alertThreshold:'80', alert80: true, alert100: true, groupId: undefined });
                  load();
                } catch (e:any) {
                  setError(e?.response?.data?.message || 'Failed to save budget');
                } finally { setSubmitting(false); }
              }}
            >
              <Text style={styles.saveBtnText}>{editingBudget ? 'Update Budget' : 'Create Budget'}</Text>
            </TouchableOpacity>
            {!(Number(budgetForm.amount) > 0) && (
              <Text style={{ color:'#D32F2F', textAlign:'center', marginTop: 6 }}>Enter a valid amount greater than 0</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Budgets Filters Modal */}
      <Modal visible={showBudgetFilters} transparent animationType="fade" onRequestClose={() => setShowBudgetFilters(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.budgetModal, { width: '100%', maxWidth: 420 }] }>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Budgets Filters</Text>
              <TouchableOpacity onPress={() => { try { Haptics.selectionAsync(); } catch {}; setShowBudgetFilters(false); }}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {/* (Period controls removed from filters) */}

            <Text style={styles.label}>Show</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color:'#0f172a' }}>Overruns only</Text>
              <Switch value={overrunsOnly} onValueChange={(v)=> setOverrunsOnly(v)} />
            </View>

            <Text style={styles.label}>Sort variance list</Text>
            <View style={{ flexDirection: 'row', marginTop: 6, marginBottom: 10 }}>
              <TouchableOpacity onPress={() => setVarianceSort('variance_desc')} style={[styles.chipFilter, varianceSort==='variance_desc' && styles.chipActive]}>
                <Text style={[styles.chipText, varianceSort==='variance_desc' && styles.chipTextActive]}>Var▼</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVarianceSort('amount_desc')} style={[styles.chipFilter, varianceSort==='amount_desc' && styles.chipActive]}>
                <Text style={[styles.chipText, varianceSort==='amount_desc' && styles.chipTextActive]}>Amt▼</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVarianceSort('name_asc')} style={[styles.chipFilter, varianceSort==='name_asc' && styles.chipActive]}>
                <Text style={[styles.chipText, varianceSort==='name_asc' && styles.chipTextActive]}>A→Z</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />

            <Text style={styles.label}>Currency</Text>
            <View style={{ flexDirection: 'row', flexWrap:'wrap', marginTop: 6, marginBottom: 10 }}>
              {["ALL", ...budgetCurrencies].map((c) => (
                <TouchableOpacity key={c} onPress={() => setBudgetCurrency(c as any)} style={[styles.chip, budgetCurrency===c && styles.chipActive]}>
                  <Text style={[styles.chipText, budgetCurrency===c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Amount range</Text>
            <View style={{ flexDirection: 'row', marginTop: 6, marginBottom: 10 }}>
              <TouchableOpacity style={[styles.chip, !!budgetMinAmount && styles.chipActive]} onPress={() => setBudgetMinAmount(budgetMinAmount ? '' : '0')}>
                <Text style={[styles.chipText, !!budgetMinAmount && styles.chipTextActive]}>Min 0</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, !!budgetMaxAmount && styles.chipActive]} onPress={() => setBudgetMaxAmount(budgetMaxAmount ? '' : '50000')}>
                <Text style={[styles.chipText, !!budgetMaxAmount && styles.chipTextActive]}>Max 50k</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Categories</Text>
            <View style={{ flexDirection: 'row', flexWrap:'wrap', marginTop: 6, marginBottom: 10 }}>
              {categoryOptions.length === 0 && (
                <Text style={{ color:'#777' }}>No categories available</Text>
              )}
              {categoryOptions.map((name) => {
                const selected = budgetCategoryFilters.includes(name);
                return (
                  <TouchableOpacity key={name} style={[styles.chip, selected && styles.chipActive]} onPress={() => setBudgetCategoryFilters(prev => selected ? prev.filter(c=>c!==name) : [...prev, name])}>
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />

            <Text style={styles.label}>Totals currency</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color:'#0f172a' }}>Use base currency (INR)</Text>
              <Switch value={base} onValueChange={(v)=> { setBase(v); load(true); }} />
            </View>

            <View style={styles.filterBtnRow}>
              <TouchableOpacity
                style={styles.filterBtnSecondary}
                onPress={() => {
                  // Reset
                  setBudgetCurrency('ALL');
                  setBudgetMinAmount('');
                  setBudgetMaxAmount('');
                  setBudgetCategoryFilters([]);
                }}
              >
                <MaterialIcons name="refresh" size={18} color="#374151" />
                <Text style={styles.filterBtnTextSecondary}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterBtnPrimary}
                onPress={() => { setShowBudgetFilters(false); load(true); }}
              >
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={styles.filterBtnTextPrimary}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button - Only show for ADMIN and SUPER_ADMIN */}
      {canUserCreateBudget && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => { 
            try { Haptics.selectionAsync(); } catch {}; 
            setEditingBudget(null); 
            setBudgetForm({ categoryId:'', amount:'', alertThreshold:'80', alert80: true, alert100: true, groupId: undefined }); 
            setShowBudgetModal(true); 
          }}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      )}
      
      {/* Permission hint for users who cannot create budgets */}
      {!canUserCreateBudget && isCompanyMode && (
        <View style={styles.permissionHint}>
          <MaterialIcons name="info-outline" size={18} color="#6B7280" />
          <Text style={styles.permissionHintText}>{PERMISSION_HINTS.CREATE_BUDGET}</Text>
        </View>
      )}

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.budgetModal, { maxHeight: '70%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select or Create Category</Text>
              <TouchableOpacity onPress={() => { try { Haptics.selectionAsync(); } catch {}; setShowCategoryPicker(false); }}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={[styles.input, { paddingVertical: 6 }]}> 
              <Text style={{ color:'#6b7280' }}>Tap a category to select</Text>
            </View>
            <Text style={styles.label}>Search</Text>
            <TextInput style={styles.input} placeholder="Type to filter categories" value={categoryQuery} onChangeText={setCategoryQuery} />
            <ScrollView style={{ marginTop: 8 }}>
              {categories.filter(c => !categoryQuery || String(c.name).toLowerCase().includes(categoryQuery.toLowerCase())).map((c) => (
                <TouchableOpacity key={c.id} style={styles.rowBetween} onPress={() => { try { Haptics.selectionAsync(); } catch {}; setBudgetForm(f=>({...f, categoryId: String(c.id)})); setShowCategoryPicker(false); }}>
                  <Text style={styles.rowLabel}>{c.name}</Text>
                  <MaterialIcons name={String(budgetForm.categoryId)===String(c.id)?'check-circle':'radio-button-unchecked'} size={18} color="#1976D2" />
                </TouchableOpacity>
              ))}
              {categories.length === 0 && (
                <Text style={styles.dim}>No categories yet</Text>
              )}
            </ScrollView>
            <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 10 }} />
            <Text style={styles.label}>Create new category</Text>
            <TextInput style={styles.input} placeholder="Category name" value={newCategoryName} onChangeText={setNewCategoryName} />
            <TouchableOpacity
              style={[styles.saveBtn, creatingCategory && { opacity: 0.6 }]}
              disabled={creatingCategory || !newCategoryName.trim()}
              onPress={async ()=>{
                try {
                  setCreatingCategory(true);
                  const { data } = await api.post('/api/v1/expense/categories', { name: newCategoryName.trim() });
                  // Refresh categories
                  const res = await api.get('/api/v1/expense/categories');
                  setCategories(Array.isArray(res.data) ? res.data : []);
                  setBudgetForm(f=>({...f, categoryId: data?.id ? String(data.id) : f.categoryId }));
                  setNewCategoryName('');
                  setShowCategoryPicker(false);
                } catch (e:any) {
                  setError(e?.response?.data?.message || 'Failed to create category');
                } finally {
                  setCreatingCategory(false);
                }
              }}
            >
              <Text style={styles.saveBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Team Picker Modal (Company Mode) */}
      <Modal visible={showTeamPicker} transparent animationType="fade" onRequestClose={() => setShowTeamPicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.budgetModal, { maxHeight: '70%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Team</Text>
              <TouchableOpacity onPress={() => { try { Haptics.selectionAsync(); } catch {}; setShowTeamPicker(false); }}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={[styles.input, { paddingVertical: 6 }]}> 
              <Text style={{ color:'#6b7280' }}>Select a team to set budget for</Text>
            </View>
            <ScrollView style={{ marginTop: 8 }}>
              <TouchableOpacity 
                style={styles.rowBetween} 
                onPress={() => { 
                  try { Haptics.selectionAsync(); } catch {}; 
                  setBudgetForm(f=>({...f, groupId: undefined})); 
                  setShowTeamPicker(false); 
                }}
              >
                <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                  <MaterialIcons name="business" size={20} color="#4F46E5" />
                  <Text style={[styles.rowLabel, { fontWeight:'700' }]}>Company-wide (No specific team)</Text>
                </View>
                <MaterialIcons name={!budgetForm.groupId?'check-circle':'radio-button-unchecked'} size={18} color="#4F46E5" />
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />
              {teams.map((team) => (
                <TouchableOpacity 
                  key={team.id} 
                  style={styles.rowBetween} 
                  onPress={() => { 
                    try { Haptics.selectionAsync(); } catch {}; 
                    setBudgetForm(f=>({...f, groupId: team.id})); 
                    setShowTeamPicker(false); 
                  }}
                >
                  <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                    <MaterialIcons name="groups" size={20} color="#6B7280" />
                    <View>
                      <Text style={styles.rowLabel}>{team.name}</Text>
                      <Text style={[styles.dim, { fontSize:12 }]}>{team.members?.length || 0} members</Text>
                    </View>
                  </View>
                  <MaterialIcons name={budgetForm.groupId===team.id?'check-circle':'radio-button-unchecked'} size={18} color="#4F46E5" />
                </TouchableOpacity>
              ))}
              {teams.length === 0 && (
                <View style={{ paddingVertical: 20, alignItems:'center' }}>
                  <MaterialIcons name="group-off" size={48} color="#ccc" />
                  <Text style={[styles.dim, { marginTop: 8 }]}>No teams created yet</Text>
                  <Text style={[styles.dim, { fontSize:12, marginTop: 4 }]}>Create teams from the Split screen</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentWrap: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingTop: 12 },
  // Hero styles
  hero: { backgroundColor:'#ECFDF5', borderBottomColor:'#DCFCE7', borderBottomWidth: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, shadowColor:'#0f172a', shadowOpacity:0.06, shadowRadius:10, shadowOffset:{width:0,height:6}, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  heroGradient: { position:'absolute', left:0, right:0, top:0, bottom:0, borderBottomLeftRadius:20, borderBottomRightRadius:20 },
  heroContent: { flexDirection:'column', gap: 6 },
  heroRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  heroTitle: { fontSize: 18, fontWeight: '900', color:'#065F46', letterSpacing: -0.2 },
  heroSubtitle: { fontSize: 12, color:'#047857' },
  heroPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#A7F3D0' },
  heroPillText: { color:'#065F46', fontWeight:'800', fontSize:12 },
  asOfPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  asOfText: { color:'#64748b', fontWeight:'700', fontSize: 11 },
  header: { 
    flexDirection:'row', 
    justifyContent:'space-between', 
    alignItems:'center', 
    paddingHorizontal:16, 
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 4 : 4, 
    paddingBottom:20, 
    backgroundColor:'#fff', 
    borderBottomWidth:1, 
    borderBottomColor:'#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerControlsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a202c', letterSpacing: -0.5 },
  controlsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  label: { color: '#64748b', fontSize: 13, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { 
    borderWidth: 1.5, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    padding: 14, 
    minWidth: 120, 
    backgroundColor: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  inputSm: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 90,
    backgroundColor: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    height: 38,
  },
  switchWrap: { alignItems: 'center', gap: 8 },
  refreshBtn: { padding: 10, borderRadius: 10, backgroundColor: '#E8F5E9' },
  monthBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 0, 
    marginHorizontal: 0, 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    backgroundColor: '#F9FAFB', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB',
    // subtle elevation when sticky
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    zIndex: 2,
  },
  iconBtnSmall: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', marginHorizontal: 4 },
  clearBtnSmall: { backgroundColor: '#F3F4F6' },
  periodText: { fontSize: 14, fontWeight: '700', color: '#111827', minWidth: 76, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 0, marginBottom: 12 },
  card: { 
    flex: 1, 
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    padding: 16, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardLabel: { color: '#64748b', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { color: '#1a202c', fontSize: 22, fontWeight: '800', marginTop: 6, letterSpacing: -0.3 },
  section: { marginTop: 16, marginBottom: 8, paddingHorizontal: 20, fontWeight: '800', color: '#1a202c', fontSize: 20, letterSpacing: -0.3 },
  listCard: { 
    backgroundColor: '#ffffff', 
    marginHorizontal: 20, 
    marginVertical: 8, 
    borderRadius: 16, 
    padding: 16, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 12 },
  rowText: { color: '#1a202c', flex: 1, fontSize: 15, fontWeight: '500' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
  tightRow: { paddingHorizontal: 0 },
  rowLabel: { color: '#1a202c', fontWeight: '700', fontSize: 16, letterSpacing: -0.1 },
  rowValue: { color: '#1a202c', fontWeight: '800', fontSize: 17, letterSpacing: -0.2 },
  dim: { color: '#64748b', paddingHorizontal: 12 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FDECEA', padding: 8, borderRadius: 10, marginHorizontal: 16, marginTop: 6 },
  errorText: { color: '#D32F2F' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748b', marginTop: 4 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 10, marginBottom: 4 },
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 6, marginBottom: 6 },
  addBudgetBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#22C55E', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  addBudgetBtnText: { color: '#fff', fontWeight: '700' },
  dimSmall: { color: '#64748b', fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 18 },
  budgetModal: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  saveBtn: { backgroundColor: '#22C55E', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800' },
  iconBtn: { padding: 4, borderRadius: 10, backgroundColor: '#E8F5E9', marginHorizontal: 2 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  budgetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#EEF2F7' },
  ghostIconBtn: { padding: 8, borderRadius: 999, backgroundColor: '#E8F5E9' },
  progressTrack: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#3b82f6' },
  monthPickerRow: { flexDirection:'row', alignItems:'center', gap: 8, marginBottom: 8 },
  periodDisplay: { fontSize: 18, fontWeight: '800', color: '#0f172a', minWidth: 90, textAlign:'center' },
  clearBtnInline: { position: 'absolute', right: 10, top: 0, height: 38, alignItems: 'center', justifyContent: 'center' },
  chip: { 
    flexDirection:'row', 
    alignItems:'center', 
    gap: 8, 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1.5, 
    borderColor: '#e2e8f0', 
    backgroundColor: '#f8fafc' 
  },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
  chipTextSmall: { color: '#64748b', fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#ffffff' },
  retryBtn: { marginLeft: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#22C55E' },
  retryText: { color: '#fff', fontWeight: '800' },
  // Filter modal buttons
  filterBtnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  filterBtnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#22C55E', borderRadius: 12, minWidth: 120, gap: 8 },
  filterBtnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F3F4F6', borderRadius: 12, minWidth: 120, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  filterBtnTextPrimary: { color: '#fff', fontWeight: '800' },
  filterBtnTextSecondary: { color: '#111827', fontWeight: '800' },
  fab: { 
    position: 'absolute', 
    right: 24, 
    bottom: 44, 
    backgroundColor: '#3b82f6', 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    alignItems: 'center', 
    justifyContent: 'center', 
    elevation: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  permissionHint: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  permissionHintText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingHorizontal: 16, marginBottom: 8 },
  insightsTabs: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingHorizontal: 16, marginBottom: 8, marginTop: 8 },
  smallChip: { paddingVertical: 6 },
  // Bottom sheet styles
  sheetBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '92%',
    alignSelf: 'center',
    marginBottom: 0,
    maxHeight: '70%',
    // shadow/elevation to separate from footer
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sheetHandle: { width: 48, height: 5, backgroundColor: '#E5E7EB', borderRadius: 999, alignSelf: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  badgeHealthy: { backgroundColor: '#22C55E' },
  badgeWatch: { backgroundColor: '#FB8C00' },
  badgeOver: { backgroundColor: '#D32F2F' },
  rowChips: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 },
  inlineRow: { flexDirection: 'row', alignItems: 'center' },
  insightsTabsH: { paddingHorizontal: 16, paddingVertical: 6 },
  filterRowH: { paddingHorizontal: 16, paddingVertical: 6 },
  chipTab: { flexDirection:'row', alignItems:'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#A7E0B5', backgroundColor: '#F3FBF6', marginRight: 10 },
  chipFilter: { flexDirection:'row', alignItems:'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: '#A7E0B5', backgroundColor: '#F3FBF6', marginRight: 10 },
  // Segmented control for Insights
  segmentedBar: { flexDirection: 'row', backgroundColor: '#F3FBF6', borderRadius: 999, padding: 6, marginHorizontal: 16, marginBottom: 8 },
  segmentedItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  segmentedItemActive: { backgroundColor: '#22C55E' },
  segmentedText: { color: '#15803d', fontWeight: '700' },
  segmentedTextActive: { color: '#fff', fontWeight: '800' },
  // Toast
  toast: { alignSelf:'flex-start', marginTop: 8, backgroundColor:'#111827', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  toastText: { color:'#ffffff', fontSize: 12, fontWeight:'700' },
})
;

// ... (rest of the code remains the same)
