import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Alert, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Share, Animated, Easing, Platform, Switch, NativeSyntheticEvent, NativeScrollEvent, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Lazy AsyncStorage import with safe fallback to avoid missing-module errors in dev
let AsyncStorage: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = { getItem: async () => null, setItem: async () => {} };
}

export default function FXScreen() {
  const navigation = useNavigation<any>();
  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Foreign Exchange', tabBarLabel: 'FX' });
  }, [navigation]);
  const todayStr = new Date().toISOString().slice(0,10);
  const [date, setDate] = useState<string>(todayStr);
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0,10);
  });
  const [toDate, setToDate] = useState<string>(todayStr);
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('INR');
  const [amount, setAmount] = useState<string>('100');
  const [toBase, setToBase] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<any>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [pickerFor, setPickerFor] = useState<'from'|'to'|null>(null);
  const [currencyQuery, setCurrencyQuery] = useState('');
  const currencyOptions = ['USD','EUR','GBP','JPY','AED','AUD','CAD','CHF','CNY','INR','SGD','ZAR'];
  const [rateAsOf, setRateAsOf] = useState<string | null>(null);
  const [rateValue, setRateValue] = useState<number | null>(null); // from->to rate
  const [recent, setRecent] = useState<Array<{ date:string; currency:string; amount:string; toBase:string; rateDate?:string }>>([]);
  const [autoConvert, setAutoConvert] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showRateInfo, setShowRateInfo] = useState(false);
  const [presets, setPresets] = useState<Array<{ label: string; from: string; to: string }>>([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetLabel, setPresetLabel] = useState('');
  const [recentCurrencies, setRecentCurrencies] = useState<string[]>([]);
  const samePair = fromCurrency === toCurrency;

  const isYYYYMMDD = (s:string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
  const dateValid = isYYYYMMDD(date);
  const fromValid = isYYYYMMDD(fromDate);
  const toValid = isYYYYMMDD(toDate);

  const parseConversion = (data: any) => {
    // helpers
    const isNum = (x:any) => typeof x === 'number' && Number.isFinite(x);
    const asNum = (x:any): number | null => {
      if (isNum(x)) return x as number;
      if (typeof x === 'string' && x.trim() !== '' && !Number.isNaN(Number(x))) return Number(x);
      return null;
    };
    const pickFrom = (obj:any, keys:string[]): any => {
      if (!obj || typeof obj !== 'object') return null;
      for (const k of keys) {
        if (obj[k] != null) return obj[k];
      }
      return null;
    };
    const findNumericDeep = (obj:any): number | null => {
      const n = asNum(obj);
      if (n != null) return n;
      if (!obj || typeof obj !== 'object') return null;
      // common numeric fields
      const direct = pickFrom(obj, ['value','amount','total','toBase','result','converted','rateToBase','rate']);
      const dn = asNum(direct);
      if (dn != null) return dn;
      // try one level deeper
      for (const v of Object.values(obj)) {
        const nn = asNum(v);
        if (nn != null) return nn;
        if (v && typeof v === 'object') {
          const sub = findNumericDeep(v);
          if (sub != null) return sub;
        }
      }
      return null;
    };

    let toNum: number | null = null;
    let rate: number | null = null;
    let base: string | null = null;

    // Try to extract converted amount
    if (data?.toBase !== undefined) {
      toNum = findNumericDeep(data.toBase);
    }
    if (toNum == null) toNum = findNumericDeep(data);

    // Extract rate and base currency
    const rateCandidate = pickFrom(data || {}, ['rate','rateToBase','fxRate']);
    rate = asNum(rateCandidate);
    if (rate == null && data?.toBase) rate = findNumericDeep({ rate: data.toBase.rate });
    base = (data?.baseCurrency || data?.currency || data?.toBase?.currency || null) as string | null;

    // Format converted value as string with 4 decimals when numeric
    const toVal = toNum != null ? String(Number(toNum.toFixed ? toNum.toFixed(4) : toNum)) : '';
    return { toVal, rate, base };
  };

  // Load last used pair
  useEffect(() => {
    (async () => {
      try {
        const savedFrom = await AsyncStorage.getItem('fx.fromCurrency');
        const savedTo = await AsyncStorage.getItem('fx.toCurrency');
        if (savedFrom) setFromCurrency(savedFrom);
        if (savedTo) setToCurrency(savedTo);
      } catch {}
    })();
  }, []);

  // Load recent currencies for picker
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('fx.picker.recents');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setRecentCurrencies(arr.filter((x:any)=> typeof x==='string').slice(0,8));
        }
      } catch {}
    })();
  }, []);

  // Load presets
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('fx.presets');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const cleaned = arr.filter((p:any)=> p && typeof p.label==='string' && typeof p.from==='string' && typeof p.to==='string');
            setPresets(cleaned.slice(0,12));
          }
        }
      } catch {}
    })();
  }, []);

  // Load auto-convert preference
  useEffect(() => {
    (async () => {
      try { const v = await AsyncStorage.getItem('fx.autoConvert'); if (v != null) setAutoConvert(v === 'true'); } catch {}
    })();
  }, []);

  // Load favorites
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('fx.favorites');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setFavorites(arr.filter((x:any)=> typeof x === 'string'));
        }
      } catch {}
    })();
  }, []);

  // Load recent conversions on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('fx.recent');
        if (saved) {
          const arr = JSON.parse(saved);
          if (Array.isArray(arr)) setRecent(arr.slice(0,5));
        }
      } catch {}
    })();
  }, []);

  // Restore saved history range on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('fx.history.range');
        const days = saved ? parseInt(saved, 10) : NaN;
        if (Number.isFinite(days) && [7,30,90,365].includes(days)) {
          setQuickRange(days);
        }
      } catch {}
    })();
  }, []);

  // Currency -> flag emoji helper
  const flag = (code: string): string => {
    const m: Record<string,string> = {
      USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AED: '🇦🇪', INR: '🇮🇳',
      AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', CNY: '🇨🇳', SGD: '🇸🇬', ZAR: '🇿🇦'
    };
    return m[(code||'').toUpperCase()] || '';
  };

  const currencyMeta: Record<string, { name: string; country: string }> = {
    USD: { name: 'US Dollar', country: 'United States' },
    EUR: { name: 'Euro', country: 'European Union' },
    GBP: { name: 'Pound Sterling', country: 'United Kingdom' },
    JPY: { name: 'Yen', country: 'Japan' },
    AED: { name: 'Dirham', country: 'United Arab Emirates' },
    INR: { name: 'Indian Rupee', country: 'India' },
    AUD: { name: 'Australian Dollar', country: 'Australia' },
    CAD: { name: 'Canadian Dollar', country: 'Canada' },
    CHF: { name: 'Swiss Franc', country: 'Switzerland' },
    CNY: { name: 'Yuan', country: 'China' },
    SGD: { name: 'Singapore Dollar', country: 'Singapore' },
    ZAR: { name: 'Rand', country: 'South Africa' },
  };

  // Persist pair when changed
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('fx.fromCurrency', fromCurrency);
        await AsyncStorage.setItem('fx.toCurrency', toCurrency);
      } catch {}
    })();
  }, [fromCurrency, toCurrency]);

  // Auto-convert when pair changes
  useEffect(() => {
    if (autoConvert && dateValid && !samePair && !loading) {
      convert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCurrency, toCurrency]);

  // Restore last-typed amount for current pair when pair changes
  useEffect(() => {
    (async () => {
      try {
        const key = `fx.amount.${fromCurrency}->${toCurrency}`;
        const savedAmt = await AsyncStorage.getItem(key);
        if (typeof savedAmt === 'string') {
          setAmount(savedAmt);
        }
      } catch {}
    })();
  }, [fromCurrency, toCurrency]);

  // Debounce-save amount per pair
  useEffect(() => {
    const handle = setTimeout(() => {
      (async () => {
        try {
          const key = `fx.amount.${fromCurrency}->${toCurrency}`;
          await AsyncStorage.setItem(key, String(amount ?? ''));
        } catch {}
      })();
    }, 400);
    return () => clearTimeout(handle);
  }, [amount, fromCurrency, toCurrency]);

  const swapPair = () => {
    if (fromCurrency === toCurrency) return;
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  // Animated swap
  const swapAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const sparkAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);
  const [showTopFab, setShowTopFab] = useState(false);
  const triggerSwap = () => {
    if (fromCurrency === toCurrency) return;
    try { Haptics.selectionAsync(); } catch {}
    Animated.sequence([
      Animated.timing(swapAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(swapAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start();
    swapPair();
  };

  const formatNum = (n: number | null | undefined, digits = 4) => {
    if (n == null || !Number.isFinite(Number(n))) return '';
    return Number(n).toFixed(digits);
  };

  const getDisplayConverted = () => {
    // Prefer computed amount when we have a rate
    const amt = Number(amount);
    if (Number.isFinite(amt) && rateValue != null) {
      return formatNum(amt * rateValue, 4);
    }
    // Otherwise try to parse what we have in toBase
    if (typeof toBase === 'string') {
      const n = Number(toBase);
      return Number.isFinite(n) ? formatNum(n, 4) : toBase;
    }
    // If toBase ever becomes an object, try to read common fields
    const anyObj: any = toBase as any;
    if (anyObj && typeof anyObj === 'object') {
      const candidate = anyObj.value ?? anyObj.amount ?? anyObj.total;
      const n = Number(candidate);
      if (Number.isFinite(n)) return formatNum(n, 4);
    }
    return '';
  };

  const convert = async () => {
    try {
      try { await Haptics.selectionAsync(); } catch {}
      setLoading(true);
      setError(null);
      // Get rate to base for FROM (amount=1)
      const respFrom = await api.get('/api/v1/fx/convert', { params: { date, currency: fromCurrency, amount: 1 } });
      const parsedFrom = parseConversion(respFrom.data);
      const rateFromToBase = Number(parsedFrom.toVal || 0);
      // Get rate to base for TO (amount=1)
      const respTo = await api.get('/api/v1/fx/convert', { params: { date, currency: toCurrency, amount: 1 } });
      const parsedTo = parseConversion(respTo.data);
      const rateToToBase = Number(parsedTo.toVal || 0);
      const pairRate = (rateToToBase > 0) ? (rateFromToBase / rateToToBase) : NaN;
      setRateValue(Number.isFinite(pairRate) ? pairRate : null);
      const asOf = (respFrom.data?.rateDate || respFrom.data?.timestamp || respTo.data?.rateDate || respTo.data?.timestamp || date);
      setRateAsOf(asOf ? String(asOf) : null);
      const amt = Number(amount);
      const conv = (Number.isFinite(amt) && Number.isFinite(pairRate)) ? formatNum(amt * pairRate) : '';
      setToBase(conv);
      setRecent((prev)=> {
        const next = [{ date, currency: `${fromCurrency}->${toCurrency}`, amount, toBase: conv, rateDate: asOf as any }, ...prev].slice(0,5);
        (async ()=>{ try { await AsyncStorage.setItem('fx.recent', JSON.stringify(next)); } catch {} })();
        return next;
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || 'Convert failed';
      setError(msg);
      setLastError(e?.response?.data || e);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) { try { Haptics.selectionAsync(); } catch {} setLoading(true); }
      setError(null);
      const resp = await api.get('/api/v1/fx/rates/history', { params: { currency: fromCurrency, from: fromDate, to: toDate } });
      setHistory(Array.isArray(resp.data) ? resp.data : (resp.data?.items || []));
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || 'Failed to load history';
      setError(msg);
      setLastError(e?.response?.data || e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreHistory = async () => {
    try {
      if (loading) return;
      try { Haptics.selectionAsync(); } catch {}
      setLoading(true);
      setError(null);
      const curFrom = new Date(fromDate);
      const newFrom = new Date(curFrom);
      newFrom.setDate(newFrom.getDate() - 30);
      const prevDay = new Date(curFrom);
      prevDay.setDate(prevDay.getDate() - 1);
      const newFromStr = newFrom.toISOString().slice(0,10);
      const prevDayStr = prevDay.toISOString().slice(0,10);
      const resp = await api.get('/api/v1/fx/rates/history', { params: { currency: fromCurrency, from: newFromStr, to: prevDayStr } });
      const incoming = Array.isArray(resp.data) ? resp.data : (resp.data?.items || []);
      const existing = Array.isArray(history) ? history : [];
      const map = new Map<string, any>();
      [...incoming, ...existing].forEach((it:any) => { if (it && it.rateDate) map.set(String(it.rateDate), it); });
      const merged = Array.from(map.values()).sort((a:any,b:any)=> String(a.rateDate).localeCompare(String(b.rateDate)) );
      setHistory(merged);
      setFromDate(newFromStr);
    } catch (e:any) {
      const msg = e?.response?.data?.message || e.message || 'Failed to load more history';
      setError(msg);
      setLastError(e?.response?.data || e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory(true);
  };

  // Animate sparkline when history changes
  useEffect(() => {
    try {
      sparkAnim.setValue(0);
      Animated.timing(sparkAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } catch {}
  }, [history]);

  const exportHistoryCsv = async () => {
    try {
      try { Haptics.selectionAsync(); } catch {}
      const header = ['Date','Currency','RateToBase'];
      const rows = (Array.isArray(history) ? history : []).map((r:any)=> [r.rateDate, r.currency, String(r.rateToBase)]);
      const csv = [header, ...rows].map(r => r.map(val => `"${String(val ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
      await Share.share({ message: csv });
      showToast('History exported');
    } catch (e:any) {
      Alert.alert('Error', 'Failed to export CSV');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      try { Haptics.selectionAsync(); } catch {}
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Clipboard = require('@react-native-clipboard/clipboard');
      if (Clipboard?.setString) Clipboard.setString(text);
      else throw new Error('Clipboard not available');
      showToast('Copied to clipboard');
    } catch {
      try { await Share.share({ message: text }); showToast('Shared'); } catch {}
    }
  };

  const toggleAutoConvert = async (val: boolean) => {
    try {
      try { Haptics?.selectionAsync?.(); } catch {}
      setAutoConvert(val);
      await AsyncStorage.setItem('fx.autoConvert', String(val));
      if (val && dateValid && !samePair && !loading) convert();
    } catch {}
  };

  const pairKey = React.useMemo(() => `${fromCurrency}->${toCurrency}`, [fromCurrency, toCurrency]);
  const isFav = favorites.includes(pairKey);
  const toggleFavorite = async () => {
    try { Haptics.selectionAsync(); } catch {}
    setFavorites(prev => {
      const next = prev.includes(pairKey) ? prev.filter(p => p !== pairKey) : [pairKey, ...prev].slice(0,8);
      (async()=>{ try { await AsyncStorage.setItem('fx.favorites', JSON.stringify(next)); } catch {} })();
      return next;
    });
  };

  const savePreset = async () => {
    try {
      const label = (presetLabel || '').trim();
      if (!label) { setShowPresetModal(false); return; }
      try { Haptics.selectionAsync(); } catch {}
      setPresets(prev => {
        const withoutDup = prev.filter(p => p.label.toLowerCase() !== label.toLowerCase());
        const next = [{ label, from: fromCurrency, to: toCurrency }, ...withoutDup].slice(0,12);
        (async()=>{ try { await AsyncStorage.setItem('fx.presets', JSON.stringify(next)); } catch {} })();
        return next;
      });
      setPresetLabel('');
      setShowPresetModal(false);
    } catch {}
  };

  const removePreset = async (label: string) => {
    try { Haptics.selectionAsync(); } catch {}
    setPresets(prev => {
      const next = prev.filter(p => p.label !== label);
      (async()=>{ try { await AsyncStorage.setItem('fx.presets', JSON.stringify(next)); } catch {} })();
      return next;
    });
  };

  const adjustAmount = (delta: number) => {
    try { Haptics.selectionAsync(); } catch {}
    const cur = Number(amount);
    const base = Number.isFinite(cur) ? cur : 0;
    const next = base + delta;
    setAmount(String(next >= 0 ? next : 0));
  };

  const clearAmount = () => {
    try { Haptics.selectionAsync(); } catch {}
    setAmount('');
  };

  const showToast = (msg: string) => {
    try {
      if (Platform.OS === 'android') {
        const ToastAndroid = require('react-native').ToastAndroid;
        if (ToastAndroid?.show) ToastAndroid.show(msg, ToastAndroid.SHORT);
        return;
      }
    } catch {}
  };

  // Quick range helpers (for segmented control)
  const setQuickRange = (days: number) => {
    const end = new Date(todayStr);
    const start = new Date(todayStr);
    start.setDate(start.getDate() - days + 1);
    setFromDate(start.toISOString().slice(0,10));
    setToDate(end.toISOString().slice(0,10));
    // persist range key
    (async () => { try { await AsyncStorage.setItem('fx.history.range', String(days)); } catch {} })();
  };

  const activeRange = (() => {
    const oneDayMs = 24*60*60*1000;
    const f = new Date(fromDate);
    const t = new Date(toDate);
    if (!(f instanceof Date) || !(t instanceof Date) || isNaN(+f) || isNaN(+t)) return '';
    const diff = Math.round((+t - +f)/oneDayMs) + 1;
    if (diff === 7) return '7D';
    if (diff === 30) return '30D';
    if (diff === 90) return '90D';
    if (diff >= 365 && diff <= 366) return '1Y';
    return '';
  })();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3b82f6"]} tintColor="#3b82f6" />}
        contentContainerStyle={{ paddingBottom: 24 }}
        stickyHeaderIndices={[0]}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y;
          setShowTopFab(y > 400);
        }}
        scrollEventThrottle={16}
      >
        {/* Hero Header */}
        <View style={[styles.fxHero, { zIndex: 10, elevation: 3 }]}> 
          <LinearGradient
            colors={[ 'rgba(0,0,0,0)', 'rgba(0,0,0,0)' ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fxHeroGradient}
          />
          <View style={styles.fxHeroContent}>
            <View style={styles.fxHeroRow}>
              <Text style={styles.fxHeroTitle}>Foreign Exchange</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                <TouchableOpacity onPress={toggleFavorite} accessibilityLabel={isFav ? 'Unfavorite pair' : 'Favorite pair'}>
                  <MaterialIcons name={isFav ? 'star' : 'star-outline'} size={20} color={isFav ? '#F59E0B' : '#94a3b8'} />
                </TouchableOpacity>
                <View style={styles.fxHeroPill}>
                  <MaterialIcons name="swap-horiz" size={14} color="#1D4ED8" />
                  <Text style={styles.fxHeroPillText}>{fromCurrency} → {toCurrency}</Text>
                </View>
                <TouchableOpacity onPress={()=>setShowRateInfo(true)} accessibilityLabel="Rate information">
                  <View style={[styles.fxHeroPill, { backgroundColor:'#E0F2FE', borderColor:'#BAE6FD' }]}>
                    <MaterialIcons name="info" size={14} color="#0369A1" />
                    <Text style={[styles.fxHeroPillText, { color:'#0369A1' }]}>Rate Info</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.fxHeroRow}>
              <Text style={styles.fxHeroSubtitle}>{rateValue != null ? `1 ${fromCurrency} = ${formatNum(rateValue)} ${toCurrency}` : 'Ready to convert'}</Text>
              {rateAsOf ? (
                <View style={styles.fxAsOfPill}><Text style={styles.fxAsOfText}>As of {rateAsOf}</Text></View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.contentWrap}>
        {favorites.length > 0 && (
          <View style={[styles.card, { paddingTop: 12, paddingBottom: 10 }]}> 
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Favorites</Text>
              <TouchableOpacity onPress={async ()=>{ try { await AsyncStorage.removeItem('fx.favorites'); } catch {}; setFavorites([]); }} accessibilityLabel="Clear favorites">
                <Text style={[styles.dim, { fontWeight: '700' }]}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chipsRow}>
              {favorites.map((p, idx) => (
                <TouchableOpacity key={`fav${idx}`} style={[styles.presetChip, (pairKey===p) && { backgroundColor:'#eff6ff', borderColor:'#bfdbfe' }]} onPress={()=>{ const [f,t] = p.split('->'); if (f && t) { setFromCurrency(f); setToCurrency(t); } }} accessibilityLabel={`Use favorite ${p}`}>
                  <MaterialIcons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.presetText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Named Presets */}
        <View style={[styles.card, { paddingTop: 12, paddingBottom: 10 }]}> 
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Presets</Text>
            <TouchableOpacity style={[styles.chip, { backgroundColor:'#eff6ff', borderColor:'#bfdbfe' }]} onPress={()=>{ setPresetLabel(`${fromCurrency}->${toCurrency}`); setShowPresetModal(true); }} accessibilityLabel="Save current pair as preset">
              <MaterialIcons name="bookmark-add" size={14} color="#3b82f6" />
              <Text style={styles.chipText}>Save current</Text>
            </TouchableOpacity>
          </View>
          {presets.length === 0 ? (
            <Text style={styles.dim}>No presets yet</Text>
          ) : (
            <View style={styles.chipsRow}>
              {presets.map((p, idx) => (
                <View key={`pre${idx}`} style={{ flexDirection:'row', alignItems:'center' }}>
                  <TouchableOpacity style={[styles.presetChip, (fromCurrency===p.from && toCurrency===p.to) && { backgroundColor:'#eff6ff', borderColor:'#bfdbfe' }]} onPress={()=>{ setFromCurrency(p.from); setToCurrency(p.to); }} accessibilityLabel={`Use preset ${p.label}`}>
                    <MaterialIcons name="bookmark" size={14} color="#1f2937" />
                    <Text style={styles.presetText}>{p.label}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, { marginLeft: 4 }]} onPress={()=>removePreset(p.label)} accessibilityLabel={`Remove preset ${p.label}`}>
                    <MaterialIcons name="close" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
        {error && (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" color="#D32F2F" size={18} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadHistory()} accessibilityLabel="Retry loading">
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor:'#64748b', marginLeft: 8 }]} onPress={() => copyToClipboard(JSON.stringify(lastError ?? {}, null, 2))} accessibilityLabel="Copy error details">
              <Text style={styles.retryText}>Copy details</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent conversions */}
        {recent.length > 0 && (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Recent Conversions</Text>
              <TouchableOpacity onPress={async ()=>{ try { await AsyncStorage.removeItem('fx.recent'); } catch {}; setRecent([]); }} accessibilityLabel="Clear recent conversions">
                <Text style={[styles.dim, { fontWeight: '700' }]}>Clear</Text>
              </TouchableOpacity>
            </View>
            {recent.map((r, i)=> (
              <View key={`rc${i}`} style={styles.rowBetween}>
                <Text style={styles.rowLabel}>{r.amount} {r.currency} on {r.date}</Text>
                <Text style={styles.rowValue}>{r.toBase}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Divider */}
        <View style={styles.sectionDivider} />

        {/* Convert card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Convert to Base</Text>
          <Text style={styles.label}>Date</Text>
          <View style={styles.rowCenter}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { const d=new Date(dateValid?date:todayStr); d.setDate(d.getDate()-1); setDate(d.toISOString().slice(0,10)); }}>
              <MaterialIcons name="chevron-left" size={20} color="#4CAF50" />
            </TouchableOpacity>
            <TextInput style={[styles.input, { flex: 1, marginHorizontal: 6 }, !dateValid && styles.inputError]} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            <TouchableOpacity style={styles.iconBtn} onPress={() => { const d=new Date(dateValid?date:todayStr); d.setDate(d.getDate()+1); setDate(d.toISOString().slice(0,10)); }}>
              <MaterialIcons name="chevron-right" size={20} color="#4CAF50" />
            </TouchableOpacity>
          </View>
          {!dateValid && <Text style={styles.warnText}>Enter date as YYYY-MM-DD</Text>}
          <View style={styles.chipsRow}>
            <TouchableOpacity style={styles.chip} onPress={() => setDate(todayStr)}>
              <MaterialIcons name="today" size={14} color="#4CAF50" />
              <Text style={styles.chipText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={() => { const d=new Date(); d.setDate(d.getDate()-1); setDate(d.toISOString().slice(0,10)); }}>
              <MaterialIcons name="history" size={14} color="#4CAF50" />
              <Text style={styles.chipText}>Yesterday</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>From Currency</Text>
          <View style={{ position:'relative' }}>
            <TouchableOpacity style={[styles.input, { flexDirection:'row', alignItems:'center', justifyContent:'flex-start', paddingRight: 44 }]} onPress={() => { setPickerFor('from'); setShowCurrencyPicker(true); }}>
              <Text style={{ color:'#1f2937' }}>{fromCurrency ? `${flag(fromCurrency)} ${fromCurrency}` : 'Select from'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.swapSmallAbs, samePair && { opacity: 0.4 }]} disabled={samePair} onPress={triggerSwap} accessibilityLabel="Swap currencies">
              <Animated.View style={{ transform: [{ rotate: swapAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg','180deg'] }) }] }}>
                <MaterialIcons name="swap-vert" size={16} color="#3b82f6" />
              </Animated.View>
            </TouchableOpacity>
          </View>
          <View style={styles.chipsRow}>
            {['USD','EUR','GBP','JPY','AED','INR'].map((c)=> {
              const disabled = c === toCurrency;
              return (
              <TouchableOpacity key={c} disabled={disabled} style={[styles.chip, fromCurrency===c && styles.chipActive, disabled && { opacity: 0.4 }]} onPress={()=>setFromCurrency(c)}>
                <Text style={[styles.chipText, fromCurrency===c && styles.chipTextActive]}>{flag(c)} {c}</Text>
              </TouchableOpacity>
            );})}
          </View>

          {/* Swap moved into From field (right corner) */}

          <Text style={styles.label}>To Currency</Text>
          <TouchableOpacity style={[styles.input, { flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]} onPress={() => { setPickerFor('to'); setShowCurrencyPicker(true); }}>
            <Text style={{ color:'#1f2937' }}>{toCurrency ? `${flag(toCurrency)} ${toCurrency}` : 'Select to'}</Text>
          </TouchableOpacity>
          <View style={styles.chipsRow}>
            {['INR','USD','EUR','GBP','JPY','AED'].map((c)=> {
              const disabled = c === fromCurrency;
              return (
              <TouchableOpacity key={c} disabled={disabled} style={[styles.chip, toCurrency===c && styles.chipActive, disabled && { opacity: 0.4 }]} onPress={()=>setToCurrency(c)}>
                <Text style={[styles.chipText, toCurrency===c && styles.chipTextActive]}>{flag(c)} {c}</Text>
              </TouchableOpacity>
            );})}
          </View>
          {/* FX Presets */}
          <Text style={styles.label}>Presets</Text>
          <View style={styles.chipsRow}>
            {[
              { from: 'USD', to: 'INR' },
              { from: 'EUR', to: 'USD' },
              { from: 'GBP', to: 'INR' },
            ].map((p, idx) => (
              <TouchableOpacity key={idx} style={styles.presetChip} onPress={() => { setFromCurrency(p.from); setToCurrency(p.to); }}>
                <Text style={styles.presetText}>{flag(p.from)} {p.from} → {flag(p.to)} {p.to}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {samePair && <Text style={styles.warnText}>From and To currencies must be different</Text>}

          <Text style={styles.label}>Amount</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="Enter amount" keyboardType="decimal-pad" />
          <View style={[styles.chipsRow, { marginTop: 4 }]}> 
            <TouchableOpacity style={styles.presetChip} onPress={()=>adjustAmount(10)} accessibilityLabel="Add 10">
              <MaterialIcons name="add" size={14} color="#3b82f6" />
              <Text style={styles.presetText}>+10</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetChip} onPress={()=>adjustAmount(100)} accessibilityLabel="Add 100">
              <MaterialIcons name="add" size={14} color="#3b82f6" />
              <Text style={styles.presetText}>+100</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetChip} onPress={clearAmount} accessibilityLabel="Clear amount">
              <MaterialIcons name="backspace" size={14} color="#ef4444" />
              <Text style={[styles.presetText, { color:'#ef4444' }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.rowBetween, { marginTop: 2 }]}> 
            <Text style={styles.dim}>Auto-convert on pair change</Text>
            <Switch value={autoConvert} onValueChange={toggleAutoConvert} thumbColor={autoConvert ? '#3b82f6' : undefined} />
          </View>

          <TouchableOpacity style={[styles.primaryBtn, (loading || !dateValid || samePair) && { opacity: 0.6 }]} disabled={loading || !dateValid || samePair} onPress={convert} accessibilityLabel="Convert amount">
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Convert</Text>}
          </TouchableOpacity>
          {rateValue != null && (
            <Text style={[styles.dim, { marginTop: 6 }]}>1 {fromCurrency} = {formatNum(rateValue)} {toCurrency}</Text>
          )}

          {getDisplayConverted() ? (
            <View style={[styles.infoBox, { marginTop: 10 }]}> 
              <View style={[styles.infoRow, { alignItems: 'center' }]}>
                <MaterialIcons name="trending-up" size={18} color="#3b82f6" />
                <Text style={[styles.infoText, { flex: 1 }]}>Converted: {getDisplayConverted()} {toCurrency}{rateValue != null ? `  (rate ${formatNum(rateValue)} ${fromCurrency}→${toCurrency})` : ''}</Text>
                {rateAsOf ? (
                  <View style={styles.asOfPill}><Text style={styles.asOfText}>As of {rateAsOf}</Text></View>
                ) : null}
              </View>
              <View style={styles.rowRight}>
                <TouchableOpacity style={styles.chip} onPress={async ()=>{ const dVal = getDisplayConverted(); await copyToClipboard(`FX ${amount} ${fromCurrency} to ${toCurrency} on ${date} = ${dVal}${rateValue!=null?` (rate ${formatNum(rateValue)} ${fromCurrency}->${toCurrency})`:''}${rateAsOf?` as of ${rateAsOf}`:''}`); }} accessibilityLabel="Copy conversion">
                  <MaterialIcons name="content-copy" size={14} color="#3b82f6" />
                  <Text style={styles.chipText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, { marginLeft: 8 }]} onPress={async ()=>{ const dVal = getDisplayConverted(); await Share.share({ message: `FX ${amount} ${fromCurrency} to ${toCurrency} on ${date} = ${dVal}${rateValue!=null?` (rate ${formatNum(rateValue)} ${fromCurrency}->${toCurrency})`:''}${rateAsOf?` as of ${rateAsOf}`:''}` }); }} accessibilityLabel="Share conversion">
                  <MaterialIcons name="share" size={14} color="#3b82f6" />
                  <Text style={styles.chipText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        {/* Divider */}
        <View style={styles.sectionDivider} />

        {/* History card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rate History ({fromCurrency} → Base)</Text>
          <View style={[styles.infoRow, { marginTop: 2, marginBottom: 6 }]}> 
            <MaterialIcons name="info-outline" size={14} color="#64748b" />
            <Text style={[styles.dim, { flex: 1 }]}>Values are to the base currency. Pair rate {fromCurrency}→{toCurrency} = (from→base ÷ to→base).</Text>
          </View>
          <Text style={[styles.dim, { marginBottom: 6 }]}>Loaded: {fromDate} → {toDate}</Text>
          <Text style={styles.label}>Range</Text>
          {/* Segmented quick ranges */}
          <View style={styles.segmentedBar}>
            {['7D','30D','90D','1Y'].map(key => (
              <TouchableOpacity
                key={key}
                style={[styles.segmentedItem, activeRange===key && styles.segmentedItemActive]}
                accessibilityLabel={`Range ${key}`}
                onPress={() => {
                  if (key==='7D') setQuickRange(7);
                  else if (key==='30D') setQuickRange(30);
                  else if (key==='90D') setQuickRange(90);
                  else if (key==='1Y') setQuickRange(365);
                }}
              >
                <Text style={[styles.segmentedText, activeRange===key && styles.segmentedTextActive]}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.rowCenter}>
            <TextInput style={[styles.input, { flex: 1 }, !fromValid && styles.inputError]} value={fromDate} onChangeText={setFromDate} placeholder="From YYYY-MM-DD" />
            <Text style={{ marginHorizontal: 8, color:'#6b7280' }}>to</Text>
            <TextInput style={[styles.input, { flex: 1 }, !toValid && styles.inputError]} value={toDate} onChangeText={setToDate} placeholder="To YYYY-MM-DD" />
          </View>
          {(!fromValid || !toValid) && <Text style={styles.warnText}>Enter valid YYYY-MM-DD range</Text>}
          <View style={styles.chipsRow}>
            <TouchableOpacity style={styles.chip} onPress={() => { const d=new Date(); d.setDate(d.getDate()-7); setFromDate(d.toISOString().slice(0,10)); setToDate(todayStr); }}>
              <MaterialIcons name="calendar-today" size={14} color="#4CAF50" />
              <Text style={styles.chipText}>Last 7 days</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={() => { const d=new Date(); d.setMonth(d.getMonth()-1); setFromDate(d.toISOString().slice(0,10)); setToDate(todayStr); }}>
              <MaterialIcons name="event" size={14} color="#4CAF50" />
              <Text style={styles.chipText}>Last 30 days</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection:'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }, (loading || !fromValid || !toValid) && { opacity: 0.6 }]} disabled={loading || !fromValid || !toValid} onPress={() => loadHistory()} accessibilityLabel="Load history">
              {loading ? <ActivityIndicator color="#3b82f6" /> : <Text style={styles.secondaryBtnText}>Load History</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, { alignSelf:'center' }]} onPress={exportHistoryCsv} accessibilityLabel="Export history">
              <MaterialIcons name="file-download" size={14} color="#3b82f6" />
              <Text style={styles.chipText}>Export</Text>
            </TouchableOpacity>
          </View>

          {/* Sparkline */}
          <View style={styles.sparklineWrap}>
            {(() => {
              const series = (history || []).slice(-24); // last 24 points
              if (!series.length) return <Text style={styles.dim}>No history</Text>;
              const values = series.map((r:any)=> Number(r.rateToBase||0)).filter(v=>Number.isFinite(v));
              if (!values.length) return <Text style={styles.dim}>No history</Text>;
              const min = Math.min(...values);
              const max = Math.max(...values);
              const range = max - min || 1;
              return (
                <Animated.View style={[
                  styles.sparklineBars,
                  { opacity: sparkAnim, transform: [{ translateY: sparkAnim.interpolate({ inputRange:[0,1], outputRange:[8,0] }) }] }
                ]}>
                  {values.map((v, idx) => {
                    const hPct = ((v - min) / range);
                    const height = 8 + Math.round(hPct * 24); // 8..32
                    return <View key={idx} style={[styles.sparkBar, { height }]} />
                  })}
                </Animated.View>
              );
            })()}
          </View>

          <View style={{ marginTop: 8 }}>
            {loading && (
              <View>
                {Array.from({ length: 5 }).map((_, i) => (
                  <View key={`sk${i}`} style={styles.skeletonRow}>
                    <Animated.View style={[styles.skelBlock, { width: 120, opacity: shimmerAnim.interpolate({ inputRange: [0,1], outputRange: [0.45, 1] }) }]} />
                    <Animated.View style={[styles.skelBlock, { width: 90, opacity: shimmerAnim.interpolate({ inputRange: [0,1], outputRange: [0.45, 1] }) }]} />
                  </View>
                ))}
              </View>
            )}
            {(!loading && (!history || history.length === 0)) && (
              <View style={styles.emptyHistoryBox}>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons name="insights" size={18} color="#94a3b8" />
                </View>
                <Text style={styles.emptyHistoryText}>No history</Text>
              </View>
            )}
            {(history || []).map((item:any, idx:number) => {
              const rate = Number(item?.rateToBase ?? 0);
              const prevVal = Number(((history || [])[idx-1]?.rateToBase) ?? NaN);
              const hasPrev = Number.isFinite(prevVal);
              const delta = hasPrev ? (rate - prevVal) : 0;
              const pct = hasPrev && prevVal !== 0 ? (delta / prevVal) * 100 : 0;
              const up = delta > 0; const down = delta < 0;
              const deltaColor = up ? '#059669' : (down ? '#dc2626' : '#64748b');
              const curMonth = String(item?.rateDate || '').slice(0,7);
              const prevMonth = String(((history||[])[idx-1]?.rateDate) || '').slice(0,7);
              return (
                <View key={`hwrap${idx}`}>
                  {idx === 0 || curMonth !== prevMonth ? (
                    <View style={styles.monthHeader}>
                      <Text style={styles.monthHeaderText}>{curMonth}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    key={`h${idx}`}
                    activeOpacity={0.7}
                    style={[styles.historyRow, idx % 2 === 1 && styles.historyRowAlt]}
                    onLongPress={async () => {
                      const msg = `${item.rateDate}: ${rate.toFixed(4)} ${item.currency}${hasPrev ? ` (${delta > 0 ? '+' : ''}${delta.toFixed(4)} vs prev)` : ''}`;
                      await copyToClipboard(msg);
                    }}
                  >
                    <Text style={styles.rowLabel}>{item.rateDate}</Text>
                    <View style={{ flexDirection:'row', alignItems:'center', gap: 8 }}>
                      <Text style={styles.rowValue}>{rate.toFixed(4)} {item.currency}</Text>
                      {hasPrev ? (
                        <View style={[styles.deltaPill, up && styles.deltaUpPill, down && styles.deltaDownPill, !up && !down && styles.deltaNeutralPill]}>
                          <MaterialIcons name={up ? 'trending-up' : (down ? 'trending-down' : 'remove')} size={12} color={deltaColor} />
                          <Text style={[styles.deltaText, up && styles.deltaTextUp, down && styles.deltaTextDown]}>
                            {delta > 0 ? '+' : ''}{delta.toFixed(4)}{prevVal !== 0 ? ` (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)` : ''}
                          </Text>
                        </View>
                      ) : null}
                      <TouchableOpacity style={styles.iconBtn} onPress={async ()=>{ try { Haptics.selectionAsync(); } catch {}; if (item?.rateDate) { setDate(String(item.rateDate)); setTimeout(()=>{ convert(); }, 0); } }} accessibilityLabel={`Convert using ${item.rateDate}`}>
                        <MaterialIcons name="flash-on" size={14} color="#3b82f6" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={async ()=>{
                        const msg = `${item.rateDate}: ${rate.toFixed(4)} ${item.currency}`;
                        try { await Share.share({ message: msg }); } catch {}
                      }} accessibilityLabel={`Share history row ${item.rateDate}`}>
                        <MaterialIcons name="share" size={14} color="#3b82f6" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
            <View style={styles.rowRight}>
              <TouchableOpacity style={[styles.secondaryBtn, { paddingHorizontal: 16 } , loading && { opacity: 0.6 }]} disabled={loading} onPress={loadMoreHistory} accessibilityLabel="Load more history">
                {loading ? <ActivityIndicator color="#3b82f6" /> : <Text style={styles.secondaryBtnText}>Load More (−30d)</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryBtn, { marginLeft: 8, paddingHorizontal: 16 }]} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} accessibilityLabel="Scroll to top">
                <Text style={styles.secondaryBtnText}>Top</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </View>
      </ScrollView>
      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowCurrencyPicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Search</Text>
            <TextInput style={styles.input} value={currencyQuery} onChangeText={setCurrencyQuery} placeholder="Type currency or country" />
            {recentCurrencies.length > 0 && (
              <View style={[styles.chipsRow, { marginTop: 6 }]}> 
                {recentCurrencies.map((c, idx)=> (
                  <TouchableOpacity key={`rcu${idx}`} style={styles.presetChip} onPress={() => { 
                    if (pickerFor==='from') {
                      if (c === toCurrency) { Alert.alert('Invalid selection','From and To cannot be the same.'); return; }
                      setFromCurrency(c);
                    } else if (pickerFor==='to') {
                      if (c === fromCurrency) { Alert.alert('Invalid selection','From and To cannot be the same.'); return; }
                      setToCurrency(c);
                    }
                    setShowCurrencyPicker(false);
                  }}>
                    <Text style={styles.presetText}>{flag(c)} {c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <ScrollView style={{ marginTop: 8, maxHeight: 320 }}>
              {currencyOptions.filter(c => {
                if (!currencyQuery) return true;
                const q = currencyQuery.toLowerCase();
                const meta = currencyMeta[c] || { name:'', country:'' };
                return c.toLowerCase().includes(q) || meta.name.toLowerCase().includes(q) || meta.country.toLowerCase().includes(q);
              }).map((c) => (
                <TouchableOpacity key={c} style={styles.rowBetween} onPress={() => { 
                  const commitRecent = async () => {
                    try {
                      const next = [c, ...recentCurrencies.filter(x=>x!==c)].slice(0,8);
                      setRecentCurrencies(next);
                      await AsyncStorage.setItem('fx.picker.recents', JSON.stringify(next));
                    } catch {}
                  };
                  if (pickerFor==='from') {
                    if (c === toCurrency) { Alert.alert('Invalid selection','From and To cannot be the same.'); return; }
                    setFromCurrency(c);
                    commitRecent();
                  } else if (pickerFor==='to') {
                    if (c === fromCurrency) { Alert.alert('Invalid selection','From and To cannot be the same.'); return; }
                    setToCurrency(c);
                    commitRecent();
                  }
                  setShowCurrencyPicker(false); 
                }}>
                  <Text style={styles.rowLabel}>{flag(c)} {c} {(currencyMeta[c]?.name?`· ${currencyMeta[c].name}`:'')}</Text>
                  <MaterialIcons name={(pickerFor==='from'?fromCurrency:toCurrency)===c? 'check-circle':'radio-button-unchecked'} size={18} color="#4CAF50" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {showTopFab && (
        <TouchableOpacity style={styles.fab} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} accessibilityLabel="Scroll to top">
          <MaterialIcons name="arrow-upward" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Rate Info Modal */}
      <Modal visible={showRateInfo} transparent animationType="fade" onRequestClose={()=>setShowRateInfo(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>About Rates</Text>
              <TouchableOpacity onPress={()=>setShowRateInfo(false)}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.dim}>
              Rates are fetched by the backend and represented as currency → base. Pair rate {fromCurrency}→{toCurrency} is derived as (from→base ÷ to→base).
              Sources may include reputable providers such as ECB/Frankfurter or Exchangerate Host depending on server configuration.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Save Preset Modal */}
      <Modal visible={showPresetModal} transparent animationType="fade" onRequestClose={()=>setShowPresetModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Save Preset</Text>
              <TouchableOpacity onPress={()=>setShowPresetModal(false)}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Label</Text>
            <TextInput style={styles.input} value={presetLabel} onChangeText={setPresetLabel} placeholder={`${fromCurrency}->${toCurrency}`} />
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: 8 }}>
              <TouchableOpacity style={[styles.secondaryBtn, { paddingHorizontal: 16 }]} onPress={()=>setShowPresetModal(false)} accessibilityLabel="Cancel preset save">
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { marginLeft: 8, paddingHorizontal: 16 }]} onPress={savePreset} accessibilityLabel="Save preset">
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 4 : 4, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  title: { fontSize: 22, fontWeight: '800', color: '#1a202c', letterSpacing: -0.3 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, backgroundColor: '#fff', marginVertical: 6, fontSize: 15 },
  inputError: { borderColor: '#EF4444' },
  label: { color: '#64748b', fontSize: 12, marginTop: 8, marginBottom: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: '#f1f5f9' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1a202c', marginBottom: 10, letterSpacing: -0.2 },
  refreshBtn: { padding: 10, borderRadius: 12, backgroundColor: '#eff6ff' },
  iconBtn: { padding: 8, borderRadius: 12, backgroundColor: '#eff6ff' },
  chipsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '800' },
  primaryBtn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8, backgroundColor:'#f8fafc' },
  secondaryBtnText: { color: '#1f2937', fontWeight: '700' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2', padding: 10, borderRadius: 12, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { color: '#dc2626' },
  retryBtn: { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#3b82f6' },
  retryText: { color: '#fff', fontWeight: '800' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { color: '#1f2937', fontWeight: '600' },
  rowValue: { color: '#111827', fontWeight: '800' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', padding: 12, borderRadius: 12 },
  infoText: { color: '#1f2937', fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  rowRight: { flexDirection: 'row', justifyContent: 'flex-end', width: '100%', marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a202c' },
  dim: { color: '#6b7280' },
  warnText: { color: '#FB8C00', marginTop: 4 },
  swapSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  swapSmallAbs: { position: 'absolute', right: 10, top: '50%', transform: [{ translateY: -14 }], width: 28, height: 28, borderRadius: 14, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  // Segmented control
  segmentedBar: { flexDirection: 'row', backgroundColor: '#eff6ff', borderRadius: 999, padding: 6, marginBottom: 8 },
  segmentedItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  segmentedItemActive: { backgroundColor: '#3b82f6' },
  segmentedText: { color: '#64748b', fontWeight: '700' },
  segmentedTextActive: { color: '#fff', fontWeight: '800' },
  // Sparkline
  sparklineWrap: { marginTop: 8, paddingHorizontal: 4 },
  sparklineBars: { flexDirection: 'row', alignItems: 'flex-end', height: 36, gap: 2 },
  sparkBar: { width: 6, backgroundColor: '#3b82f6', borderRadius: 3 },
  // Empty history state
  emptyHistoryBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyIconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  emptyHistoryText: { color: '#94a3b8', fontWeight: '600' },
  // Presets & As-of pill
  presetChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  presetText: { color: '#1f2937', fontWeight: '700' },
  asOfPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  asOfText: { color: '#64748b', fontWeight: '700', fontSize: 12 },
  // History rows & delta indicators
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 0 },
  historyRowAlt: { backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 8 },
  deltaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  deltaUpPill: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  deltaDownPill: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
  deltaNeutralPill: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  deltaText: { fontWeight: '700', color: '#64748b' },
  deltaTextUp: { color: '#059669' },
  deltaTextDown: { color: '#dc2626' },
  sectionDivider: { height: 8, marginHorizontal: 16 },
  contentWrap: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  // Skeleton
  skeletonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  skelBlock: { height: 12, backgroundColor: '#e5e7eb', borderRadius: 6 },
  // FX Hero
  fxHero: { backgroundColor:'#EFF6FF', borderBottomColor:'#DBEAFE', borderBottomWidth: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, shadowColor:'#0f172a', shadowOpacity:0.06, shadowRadius:10, shadowOffset:{width:0,height:6}, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  fxHeroGradient: { position:'absolute', left:0, right:0, top:0, bottom:0, borderBottomLeftRadius:20, borderBottomRightRadius:20 },
  fxHeroContent: { flexDirection:'column', gap: 6 },
  fxHeroRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  fxHeroTitle: { fontSize: 18, fontWeight: '900', color:'#1D4ED8', letterSpacing: -0.2 },
  fxHeroSubtitle: { fontSize: 12, color:'#2563EB' },
  fxHeroPill: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#DBEAFE', borderRadius:999, paddingHorizontal:10, paddingVertical:4, borderWidth:1, borderColor:'#BFDBFE' },
  fxHeroPillText: { color:'#1D4ED8', fontWeight:'800', fontSize:12 },
  fxAsOfPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  fxAsOfText: { color:'#64748b', fontWeight:'700', fontSize: 11 },
  // Month header & FAB
  monthHeader: { paddingTop: 10, paddingBottom: 4, paddingHorizontal: 4 },
  monthHeaderText: { color:'#64748b', fontWeight:'800', fontSize:12 },
  fab: { position:'absolute', right:16, bottom:24, backgroundColor:'#3b82f6', borderRadius:28, width:56, height:56, alignItems:'center', justifyContent:'center', elevation:5, shadowColor:'#0f172a', shadowOpacity:0.2, shadowRadius:6, shadowOffset:{ width:0, height:4 } },
});
