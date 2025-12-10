import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, SafeAreaView, ScrollView, Dimensions, Keyboard, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { UserSummary } from '../api/groupService';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SplitCreateWizardScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const groupId = route.params?.groupId as number;
  const members = (route.params?.members || []) as UserSummary[];

  const groupMembers = useMemo(() => {
    const uniq = new Map<number, UserSummary>();
    (members || []).forEach(m => {
      if (m && typeof m.id === 'number' && isFinite(m.id) && m.id > 0 && !uniq.has(m.id)) {
        uniq.set(m.id, m);
      }
    });
    return Array.from(uniq.values());
  }, [members]);

  // Debug: Log user object on mount
  useEffect(() => {
    console.log('[Split Wizard] Current user object:', {
      user,
      userEmail: user?.email,
      userSub: user?.sub,
      userKeys: user ? Object.keys(user) : []
    });
  }, [user]);

  const [step, setStep] = useState<'amount' | 'users' | 'mode' | 'percentage' | 'exact'>('amount');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [splitMode, setSplitMode] = useState<'equal' | 'percentage' | 'exact'>('equal');
  const [percentages, setPercentages] = useState<Record<number, string>>({});
  const [exactAmounts, setExactAmounts] = useState<Record<number, string>>({});
  const [extraAmount, setExtraAmount] = useState<string>('');
  const [reasonHeight, setReasonHeight] = useState<number>(36);
  const [amountGroupWidth, setAmountGroupWidth] = useState<number>(80);
  const [reasonPlaceholderWidth, setReasonPlaceholderWidth] = useState<number>(240);
  const [sheetHeight, setSheetHeight] = useState<number>(Math.round(SCREEN_HEIGHT * 0.5));
  const sheetAnimation = useRef(new Animated.Value(Math.round(SCREEN_HEIGHT * 0.5))).current;
  const [amountAnchorY, setAmountAnchorY] = useState<number | null>(null);
  const [amountBoxHeight, setAmountBoxHeight] = useState<number>(0);
  const [amountOffsetTop, setAmountOffsetTop] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const didAnimateRef = useRef(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [keyboardHidden, setKeyboardHidden] = useState(true);

  const handleAmountChange = (text: string) => {
    // Remove non-numeric characters except decimal
    const cleaned = text.replace(/[^0-9.]/g, '');
    setAmount(cleaned);
    
    // After first non-zero change, show confirm tick
    if (cleaned && cleaned !== '0' && step === 'amount') {
      setShowConfirm(true);
    } else if (!cleaned || cleaned === '0') {
      setShowConfirm(false);
    }
  };

  const confirmAmount = () => {
    if (!amount || amount === '0') return;
    setPendingConfirm(true);
    setKeyboardHidden(false);
    Keyboard.dismiss();
    setStep('users');
  };

  // Keyboard visibility tracking
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardHidden(false));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHidden(true));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Bottom sheet wake-up / height logic for non-amount steps
  // Only wake (animate) once after the tick; switching steppers should not re-wake
  useEffect(() => {
    if (!(step === 'users' || step === 'percentage' || step === 'exact')) return;
    if (!amount || amount === '0') return;
    if (didAnimateRef.current) return;        // already woke up
    if (!pendingConfirm) return;             // only animate right after confirm

    const gap = 11;
    const minSheet = Math.round(SCREEN_HEIGHT * 0.8);
    const maxSheet = Math.round(SCREEN_HEIGHT * 0.8);

    // Wake to ~80% of screen height
    let finalHeight = Math.round(SCREEN_HEIGHT * 0.8);

    setSheetHeight(finalHeight);
    sheetAnimation.setValue(finalHeight);
    requestAnimationFrame(() => {
      Animated.spring(sheetAnimation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start(() => {
        didAnimateRef.current = true;
        setPendingConfirm(false);
      });
    });
  }, [step, amount, amountBoxHeight, pendingConfirm]);

  const toggleUser = (userId: number) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const involvedIds = React.useMemo(() => {
    return (selectedUserIds.size > 0 ? Array.from(selectedUserIds) : groupMembers.map(m => m.id));
  }, [selectedUserIds, groupMembers]);

  // Equal shares preview for Users step
  const equalSharesById = useMemo(() => {
    const ids = (selectedUserIds.size > 0 ? Array.from(selectedUserIds) : groupMembers.map(m => m.id));
    const total = parseFloat(amount) || 0;
    const map: Record<number, string> = {};
    if (ids.length === 0 || total <= 0) return map;
    const equal = Math.floor((total * 100) / ids.length) / 100; // 2 decimals
    const parts = ids.map(() => equal);
    const sum = parts.reduce((a, b) => a + b, 0);
    const diff = +(total - sum).toFixed(2);
    if (Math.abs(diff) >= 0.01 && parts.length > 0) {
      parts[parts.length - 1] = +(parts[parts.length - 1] + diff).toFixed(2);
    }
    ids.forEach((id, idx) => { map[id] = parts[idx].toFixed(2); });
    return map;
  }, [amount, selectedUserIds, groupMembers]);

  // Adjust percentages so editing one redistributes the remainder equally across others
  const adjustPercentages = React.useCallback((changedId: number, text: string) => {
    const cleaned = (text || '').replace(/[^0-9.]/g, '');
    let newVal = parseFloat(cleaned);
    if (!isFinite(newVal)) newVal = 0;
    newVal = Math.max(0, Math.min(100, newVal));

    const ids = involvedIds;
    const others = ids.filter(id => id !== changedId);
    if (others.length === 0) {
      setPercentages({ [changedId]: newVal.toFixed(2) });
      return;
    }

    const remaining = Math.max(0, Math.min(100, +(100 - newVal).toFixed(2)));
    const per = Math.floor((remaining / others.length) * 100) / 100;
    const last = +(remaining - per * (others.length - 1)).toFixed(2);

    const map: Record<number, string> = {};
    others.forEach((id, idx) => {
      const v = idx === others.length - 1 ? last : per;
      map[id] = v.toFixed(2);
    });
    map[changedId] = newVal.toFixed(2);
    setPercentages(map);
  }, [involvedIds, setPercentages]);

  // Initialize equal percentages when entering percentage step
  useEffect(() => {
    if (step === 'percentage') {
      const ids = involvedIds;
      if (ids.length > 0) {
        const equal = Math.floor((100 * 100) / ids.length) / 100; // 2 decimals
        const rest = +(100 - equal * (ids.length - 1)).toFixed(2);
        const map: Record<number, string> = {};
        ids.forEach((id, idx) => { map[id] = String(idx === ids.length - 1 ? rest : equal); });
        setPercentages(map);
      }
    }
  }, [step, involvedIds]);

  const percentSum = React.useMemo(() => {
    return involvedIds.reduce((acc, id) => acc + (parseFloat(percentages[id] || '0') || 0), 0);
  }, [percentages, involvedIds]);

  const computeShares = React.useCallback(() => {
    const total = parseFloat(amount) || 0;
    const extra = parseFloat(extraAmount) || 0;
    const grand = total + extra;
    const ids = involvedIds;
    const raw = ids.map(id => ({ id, pct: Math.max(0, parseFloat(percentages[id] || '0') || 0) }));
    // Base amounts rounded to 2 decimals
    let shares = raw.map(r => ({ userId: r.id, amount: +(grand * (r.pct / 100)).toFixed(2) }));
    // Fix rounding remainder so sum exactly equals grand
    const sum = shares.reduce((a, s) => a + s.amount, 0);
    const diff = +(grand - sum).toFixed(2);
    if (Math.abs(diff) >= 0.01 && shares.length > 0) {
      shares[shares.length - 1].amount = +(shares[shares.length - 1].amount + diff).toFixed(2);
    }
    return { shares, grand };
  }, [amount, extraAmount, percentages, involvedIds]);

  const handleNext = () => {
    if (step === 'users') {
      // Go directly to percentage divide by default
      setStep('percentage');
      return;
    }
    if (step === 'mode') {
      if (splitMode === 'equal') {
        const ids = involvedIds;
        const total = parseFloat(amount) || 0;
        const extra = parseFloat(extraAmount) || 0;
        const grand = total + extra;
        const equal = ids.length > 0 ? +(grand / ids.length).toFixed(2) : 0;
        const shares = ids.map((id, idx) => ({ userId: id, amount: equal }));
        // Adjust rounding remainder
        const sum = shares.reduce((a, s) => a + s.amount, 0);
        const diff = +(grand - sum).toFixed(2);
        if (Math.abs(diff) >= 0.01 && shares.length > 0) {
          shares[shares.length - 1].amount = +(shares[shares.length - 1].amount + diff).toFixed(2);
        }
        navigation.navigate('GroupChat', {
          groupId,
          createSplit: { totalAmount: grand, involvedUserIds: ids, mode: splitMode, shares, title: (reason || '').trim() || 'Split' },
        });
        return;
      }
      if (splitMode === 'percentage') {
        setStep('percentage');
        return;
      }
      // exact amounts mode
      setStep('exact');
      return;
    }
    if (step === 'percentage') {
      const { shares, grand } = computeShares();
      navigation.navigate('GroupChat', {
        groupId,
        createSplit: { totalAmount: grand, involvedUserIds: involvedIds, mode: splitMode, shares, title: (reason || '').trim() || 'Split' },
      });
      return;
    }
    if (step === 'exact') {
      const total = parseFloat(amount) || 0;
      const extra = parseFloat(extraAmount) || 0;
      const grand = total + extra;
      const ids = involvedIds;
      const shares = ids.map(id => ({ userId: id, amount: +(parseFloat(exactAmounts[id] || '0') || 0).toFixed(2) }));
      navigation.navigate('GroupChat', {
        groupId,
        createSplit: { totalAmount: grand, involvedUserIds: ids, mode: splitMode, shares, title: (reason || '').trim() || 'Split' },
      });
      return;
    }
  };

  const canProceed = () => {
    if (step === 'users') return parseFloat(amount) > 0;
    if (step === 'mode') return true;
    if (step === 'percentage') {
      const total = parseFloat(amount) || 0;
      const extra = parseFloat(extraAmount) || 0;
      if (total + extra <= 0) return false;
      return Math.abs(percentSum - 100) < 0.01 && involvedIds.length > 0;
    }
    if (step === 'exact') {
      const total = parseFloat(amount) || 0;
      const extra = parseFloat(extraAmount) || 0;
      const grand = total + extra;
      if (grand <= 0 || involvedIds.length === 0) return false;
      const sum = involvedIds.reduce((acc, id) => acc + (parseFloat(exactAmounts[id] || '0') || 0), 0);
      return Math.abs(sum - grand) < 0.01;
    }
    return false;
  };

  const isFullScreenSheet = sheetHeight >= Math.round(SCREEN_HEIGHT * 0.95) - 1;
  const topInset = (StatusBar.currentHeight || 0);
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar animated translucent backgroundColor="transparent" hidden={false} />
      {/* Close button */}
      <TouchableOpacity 
        style={[styles.closeBtn, { top: (StatusBar.currentHeight || 0) + 8 }]}
        onPress={() => navigation.goBack()}
        accessibilityLabel="Close"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="close" size={24} color="#111827" />
      </TouchableOpacity>

      {/* Amount Input - Centered (show only on first step) */}
      {step === 'amount' && (
      <View
        style={[styles.amountContainer]}
        onLayout={(e) => {
          const { y, height } = e.nativeEvent.layout;
          setAmountBoxHeight(height);
          setAmountAnchorY(y + height);
        }}
      >
        <Text style={styles.amountLabel}>Enter amount to split</Text>
        <View style={[styles.amountRow, { marginTop: 4 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}
            onLayout={(e) => {
              const w = Math.min(SCREEN_WIDTH * 0.9, Math.ceil(e.nativeEvent.layout.width));
              if (w > 0) setAmountGroupWidth(w);
            }}
          >
            <Text
              style={styles.reasonMeasureText}
              onLayout={(e) => {
                const w = Math.max(100, Math.ceil(e.nativeEvent.layout.width) + 12); // + paddingHorizontal*2
                setReasonPlaceholderWidth(w);
              }}
            >
              what the split for
            </Text>
            <Text style={[styles.currencySymbol, { fontSize: amount ? 40 : 34 }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, !amount && styles.amountPlaceholder]}
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="decimal-pad"
              autoFocus
              placeholder="0"
              placeholderTextColor="#e5e7eb"
              selectionColor="#4CAF50"
            />
          </View>
          {showConfirm && step === 'amount' && (
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmAmount} activeOpacity={0.8}>
              <MaterialIcons name="check" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        <View style={[
          styles.reasonBox,
          { width: Math.min(SCREEN_WIDTH * 0.9, Math.max(60, reasonPlaceholderWidth)) }
        ]}>
          <TextInput
            style={[
              styles.reasonInput,
              {
                height: reasonHeight,
                textAlign: 'center',
                textAlignVertical: (reasonHeight <= 40 ? 'center' : 'top') as any,
              },
            ]}
            value={reason}
            onChangeText={setReason}
            placeholder="what the split for"
            placeholderTextColor="#9ca3af"
            maxLength={80}
            multiline
            scrollEnabled={false}
            editable={step === 'amount'}
            onContentSizeChange={(e) => {
              const h = Math.min(140, Math.max(36, Math.ceil(e.nativeEvent.contentSize.height)));
              setReasonHeight(h);
            }}
          />
        </View>
      </View>
      )}

      {/* Bottom Sheet */}
      <Animated.View 
        style={[
          styles.bottomSheet,
          {
            height: sheetHeight,
            transform: [{ translateY: sheetAnimation }]
          }
        ]}
      >
        {!isFullScreenSheet && <View style={styles.sheetHandle} />}
        
        <ScrollView
          style={[styles.sheetContent, isFullScreenSheet && { paddingTop: 0, marginTop: 0 }]}
          contentContainerStyle={{ paddingBottom: isFullScreenSheet ? 24 : 16 }}
          showsVerticalScrollIndicator={false}
        >
          {isFullScreenSheet && <View style={{ height: 24 }} />}
          {(step === 'users' || step === 'percentage' || step === 'exact') && (
            <View style={[styles.sheetAmountSummary, isFullScreenSheet && { paddingTop: 0 }]}>
              <Text style={[styles.amountLabel, isFullScreenSheet && { marginTop: 0 } ]}>Enter amount to split</Text>
              <View style={[styles.amountRow, { marginTop: isFullScreenSheet ? 6 : 4 }]}>
                <Text style={[styles.currencySymbol, { fontSize: 24 }]}>₹</Text>
                <Text style={styles.amountSummaryValue}>{amount || '0'}</Text>
              </View>
              <View style={[styles.reasonBox, { width: Math.min(SCREEN_WIDTH * 0.9, Math.max(60, reasonPlaceholderWidth)), marginTop: isFullScreenSheet ? 2 : 6 }]}>
                <TextInput
                  style={[
                    styles.reasonInput,
                    {
                      height: Math.max(36, reasonHeight),
                      textAlign: 'center',
                      textAlignVertical: (reasonHeight <= 40 ? 'center' : 'top') as any,
                    },
                  ]}
                  value={reason}
                  editable={false}
                  multiline
                  scrollEnabled={false}
                  placeholder="what the split for"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          )}
          {/* Stepper: Users -> Percentage divide -> Manually divide */}
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperItem}
              activeOpacity={0.85}
              onPress={() => setStep('users')}
            >
              <View style={[
                styles.stepperCircle,
                (step === 'users') && styles.stepperCircleActive,
                (step === 'percentage' || step === 'exact') && styles.stepperCircleDone,
              ]}>
                <Text style={[
                  styles.stepperIndex,
                  (step === 'users' || step === 'percentage' || step === 'exact') && styles.stepperIndexActive,
                ]}>1</Text>
              </View>
              <Text style={[
                styles.stepperLabel,
                (step === 'users') && styles.stepperLabelActive,
              ]}>Users</Text>
            </TouchableOpacity>
            <View style={styles.stepperLine} />
            <TouchableOpacity
              style={styles.stepperItem}
              activeOpacity={0.85}
              onPress={() => setStep('percentage')}
            >
              <View style={[
                styles.stepperCircle,
                (step === 'percentage') && styles.stepperCircleActive,
                (step === 'exact') && styles.stepperCircleDone,
              ]}>
                <Text style={[
                  styles.stepperIndex,
                  (step === 'percentage' || step === 'exact') && styles.stepperIndexActive,
                ]}>2</Text>
              </View>
              <Text style={[
                styles.stepperLabel,
                (step === 'percentage' || step === 'exact') && styles.stepperLabelActive,
              ]}>Percentage divide</Text>
            </TouchableOpacity>
            <View style={styles.stepperLine} />
            <TouchableOpacity
              style={styles.stepperItem}
              activeOpacity={0.85}
              onPress={() => setStep('exact')}
            >
              <View style={[
                styles.stepperCircle,
                (step === 'exact') && styles.stepperCircleActive,
              ]}>
                <Text style={[
                  styles.stepperIndex,
                  (step === 'exact') && styles.stepperIndexActive,
                ]}>3</Text>
              </View>
              <Text style={[
                styles.stepperLabel,
                (step === 'exact') && styles.stepperLabelActive,
              ]}>Manually divide</Text>
            </TouchableOpacity>
          </View>
          {step === 'users' && (
            <>
              <Text style={styles.sheetTitle}>Select people to split with</Text>
              <Text style={styles.sheetSubtitle}>
                {selectedUserIds.size === 0 
                  ? 'All members will be included by default' 
                  : `${selectedUserIds.size} selected`}
              </Text>
              
              <View style={styles.usersList}>
                {groupMembers.map(member => {
                  const isSelected = selectedUserIds.has(member.id);
                  const included = selectedUserIds.size === 0 ? true : isSelected;
                  const share = included ? equalSharesById[member.id] : undefined;
                  
                  // Check multiple possible email fields in user object
                  const currentUserEmail = (user?.email || user?.sub || user?.username || '').toLowerCase();
                  const memberEmail = (member.email || '').toLowerCase();
                  const isCurrentUser = currentUserEmail && memberEmail && currentUserEmail === memberEmail;
                  const displayName = isCurrentUser ? 'You' : member.name;
                  
                  // Debug logging
                  console.log('[Split User Selection Debug]', {
                    memberId: member.id,
                    memberName: member.name,
                    memberEmail: member.email,
                    currentUserEmail: user?.email || user?.sub,
                    userObject: user,
                    isCurrentUser,
                    displayName
                  });
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.userCard, isSelected && styles.userCardSelected]}
                      activeOpacity={0.8}
                      onPress={() => toggleUser(member.id)}
                    >
                      <View style={[styles.userAvatar, isSelected && styles.userAvatarSelected]}>
                        <Text style={[styles.userAvatarText, isSelected && styles.userAvatarTextSelected]}>
                          {displayName?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View style={styles.userMain}>
                        <Text style={[styles.userName, isSelected && styles.userNameSelected]}>
                          {displayName}
                        </Text>
                        {member.email && (
                          <Text style={styles.userEmail}>{member.email}</Text>
                        )}
                      </View>
                      <View style={styles.userRight}>
                        {!!share && (
                          <Text style={styles.userAmount}>₹{share}</Text>
                        )}
                        {included ? (
                          <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                        ) : (
                          <View style={{ width: 24, height: 24 }} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {step === 'exact' && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={styles.sheetTitle}>Exact amounts</Text>
                  <View style={styles.amountPill}>
                    <Text style={styles.amountPillText}>Amount ₹{((parseFloat(amount) || 0) + (parseFloat(extraAmount) || 0)).toFixed(2)}</Text>
                  </View>
                  <Text style={styles.sheetSubtitle}>Totals must equal the amount</Text>
                </View>
                <TouchableOpacity onPress={() => {
                  const ids = involvedIds;
                  const total = parseFloat(amount) || 0;
                  const extra = parseFloat(extraAmount) || 0;
                  const grand = total + extra;
                  if (ids.length === 0 || grand <= 0) return;
                  const equal = ids.length > 0 ? +(grand / ids.length).toFixed(2) : 0;
                  const parts = ids.map((id, idx) => ({ id, amt: equal }));
                  const sum = parts.reduce((a, p) => a + p.amt, 0);
                  const diff = +(grand - sum).toFixed(2);
                  if (Math.abs(diff) >= 0.01 && parts.length > 0) {
                    parts[parts.length - 1].amt = +(parts[parts.length - 1].amt + diff).toFixed(2);
                  }
                  const map: Record<number, string> = {};
                  parts.forEach(p => { map[p.id] = String(p.amt); });
                  setExactAmounts(map);
                }}>
                  <Text style={styles.helperAction}>Distribute equally</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 8 }}>
                {involvedIds.map(uid => {
                  const member = groupMembers.find(m => m.id === uid);
                  const val = exactAmounts[uid] ?? '';
                  const currentUserEmail = (user?.email || user?.sub || user?.username || '').toLowerCase();
                  const memberEmail = (member?.email || '').toLowerCase();
                  const isCurrentUser = currentUserEmail && memberEmail && currentUserEmail === memberEmail;
                  const displayName = isCurrentUser ? 'You' : (member?.name || `User #${uid}`);
                  return (
                    <View key={uid} style={styles.percentRow}>
                      <Text style={styles.percentName}>{displayName}</Text>
                      <View style={styles.percentBox}>
                        <Text style={styles.currencySymbol}>₹</Text>
                        <TextInput
                          style={[styles.percentInput, { textAlign: 'right' }]}
                          keyboardType="decimal-pad"
                          selectionColor="#4CAF50"
                          value={val}
                          onChangeText={(t) => setExactAmounts(p => ({ ...p, [uid]: t.replace(/[^0-9.]/g, '') }))}
                          placeholder="0"
                          placeholderTextColor="#cbd5e1"
                        />
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.percentSummaryRow}>
                {(() => {
                  const total = parseFloat(amount) || 0;
                  const extra = parseFloat(extraAmount) || 0;
                  const grand = total + extra;
                  const sum = involvedIds.reduce((acc, id) => acc + (parseFloat(exactAmounts[id] || '0') || 0), 0);
                  const ok = Math.abs(sum - grand) < 0.01;
                  return (
                    <Text style={ok ? styles.percentOk : styles.percentWarn}>
                      Total: {sum.toFixed(2)} / {grand.toFixed(2)}
                    </Text>
                  );
                })()}
              </View>
            </>
          )}

          {step === 'mode' && (
            <>
              <Text style={styles.sheetTitle}>How to split?</Text>
              <Text style={styles.sheetSubtitle}>Choose how to divide the amount</Text>
              
              <TouchableOpacity
                style={[styles.modeCard, splitMode === 'equal' && styles.modeCardSelected]}
                onPress={() => setSplitMode('equal')}
                activeOpacity={0.85}
              >
                <MaterialIcons 
                  name="people" 
                  size={28} 
                  color={splitMode === 'equal' ? '#4CAF50' : '#6b7280'} 
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.modeTitle, splitMode === 'equal' && styles.modeTitleSelected]}>
                    Split Equally
                  </Text>
                  <Text style={styles.modeDescription}>
                    Divide amount equally among all members
                  </Text>
                </View>
                {splitMode === 'equal' && (
                  <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeCard, splitMode === 'percentage' && styles.modeCardSelected]}
                onPress={() => setSplitMode('percentage')}
                activeOpacity={0.85}
              >
                <MaterialIcons 
                  name="percent" 
                  size={28} 
                  color={splitMode === 'percentage' ? '#4CAF50' : '#6b7280'} 
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.modeTitle, splitMode === 'percentage' && styles.modeTitleSelected]}>
                    By Percentage
                  </Text>
                  <Text style={styles.modeDescription}>
                    Assign custom percentage to each member
                  </Text>
                </View>
                {splitMode === 'percentage' && (
                  <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeCard, splitMode === 'exact' && styles.modeCardSelected]}
                onPress={() => setSplitMode('exact')}
                activeOpacity={0.85}
              >
                <MaterialIcons 
                  name="calculate" 
                  size={28} 
                  color={splitMode === 'exact' ? '#4CAF50' : '#6b7280'} 
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.modeTitle, splitMode === 'exact' && styles.modeTitleSelected]}>
                    Exact Amounts
                  </Text>
                  <Text style={styles.modeDescription}>
                    Enter specific amount for each member
                  </Text>
                </View>
                {splitMode === 'exact' && (
                  <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>
            </>
          )}

          {step === 'percentage' && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={styles.sheetTitle}>Split by percentage</Text>
                  <View style={styles.amountPill}>
                    <Text style={styles.amountPillText}>Amount ₹{((parseFloat(amount) || 0) + (parseFloat(extraAmount) || 0)).toFixed(2)}</Text>
                  </View>
                  <Text style={styles.sheetSubtitle}>Make sure total equals 100%</Text>
                </View>
                <TouchableOpacity onPress={() => {
                  // Equalize
                  const ids = involvedIds;
                  if (ids.length === 0) return;
                  const equal = Math.floor((100 * 100) / ids.length) / 100;
                  const rest = +(100 - equal * (ids.length - 1)).toFixed(2);
                  const map: Record<number, string> = {};
                  ids.forEach((id, idx) => { map[id] = String(idx === ids.length - 1 ? rest : equal); });
                  setPercentages(map);
                }}>
                  <Text style={styles.helperAction}>Equalize</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 8 }}>
                {involvedIds.map(uid => {
                  const member = groupMembers.find(m => m.id === uid);
                  const val = percentages[uid] ?? '';
                  const currentUserEmail = (user?.email || user?.sub || user?.username || '').toLowerCase();
                  const memberEmail = (member?.email || '').toLowerCase();
                  const isCurrentUser = currentUserEmail && memberEmail && currentUserEmail === memberEmail;
                  const displayName = isCurrentUser ? 'You' : (member?.name || `User #${uid}`);
                  return (
                    <View key={uid} style={styles.percentRow}>
                      <Text style={styles.percentName}>{displayName}</Text>
                      <View style={styles.percentBox}>
                        <TextInput
                          style={styles.percentInput}
                          keyboardType="decimal-pad"
                          selectionColor="#4CAF50"
                          value={val}
                          onChangeText={(t) => adjustPercentages(uid, t)}
                          placeholder="0"
                          placeholderTextColor="#cbd5e1"
                        />
                        <Text style={styles.percentSuffix}>%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.percentSummaryRow}>
                <Text style={Math.abs(percentSum - 100) < 0.01 ? styles.percentOk : styles.percentWarn}>
                  Total: {percentSum.toFixed(2)}%
                </Text>
                {Math.abs(percentSum - 100) >= 0.01 && (
                  <Text style={styles.percentWarn}>
                    Remaining: {(100 - percentSum).toFixed(2)}%
                  </Text>
                )}
              </View>

              <View style={styles.extraRow}>
                <Text style={styles.extraLabel}>Extra amount (optional)</Text>
                <View style={styles.extraBox}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.extraInput}
                    keyboardType="numeric"
                    value={extraAmount}
                    onChangeText={(t) => setExtraAmount(t.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    placeholderTextColor="#cbd5e1"
                    maxLength={10}
                  />
                </View>
              </View>

            </>
          )}

        </ScrollView>

        {/* Next Button */}
        <View style={[styles.sheetFooter, isFullScreenSheet && { paddingBottom: 0 }]}>
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.nextBtnText}>
              {(step === 'percentage') || (step === 'exact') || (step === 'mode' && splitMode === 'equal') ? 'Create Split' : 'Next'}
            </Text>
            <MaterialIcons name={((step === 'percentage') || (step === 'exact') || (step === 'mode' && splitMode === 'equal')) ? 'done' : 'arrow-forward'} size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  amountContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  amountLabel: {
    color: '#6b7280',
    fontSize: 12,
    alignSelf: 'center',
    textAlign: 'center',
    marginTop: 22,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '500',
    color: '#9ca3af',
    marginRight: 1,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'left',
    minWidth: 40,
    borderBottomWidth: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  amountPlaceholder: {
    fontSize: 34,
    fontWeight: '600',
  },
  confirmBtn: {
    marginLeft: 10,
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  reasonBox: {
    width: '70%',
    alignSelf: 'center',
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 0,
    backgroundColor: '#F3F4F6',
  },
  reasonInput: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    color: '#111827',
    fontSize: 12,
    lineHeight: 18,
    minHeight: 36,
    textAlignVertical: 'top',
    includeFontPadding: false,
  },
  reasonMeasureText: {
    position: 'absolute',
    opacity: 0,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    paddingHorizontal: 6,
  },
  measureRow: {
    position: 'absolute',
    opacity: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amountMeasureText: {
    fontWeight: '700',
    color: '#111827',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.6,
    backgroundColor: '#fff',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sheetHandle: {
    width: 36,
    height: 3,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 2,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  usersList: {
    gap: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  userCardSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#4CAF50',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userAvatarSelected: {
    backgroundColor: '#bbf7d0',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
  },
  userAvatarTextSelected: {
    color: '#166534',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  userNameSelected: {
    color: '#166534',
  },
  userEmail: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  userMain: {
    flex: 1,
    justifyContent: 'center',
  },
  userRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 80,
    gap: 6,
  },
  userAmount: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 12,
  },
  helperAction: {
    color: '#4CAF50',
    fontWeight: '800',
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  percentName: {
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  percentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  percentInput: {
    width: 72,
    textAlign: 'right',
    color: '#111827',
  },
  percentSuffix: {
    marginLeft: 6,
    color: '#6b7280',
    fontWeight: '700',
  },
  percentSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  percentOk: {
    color: '#166534',
    fontWeight: '700',
  },
  percentWarn: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  extraRow: {
    marginTop: 12,
  },
  extraLabel: {
    color: '#6b7280',
    marginBottom: 6,
  },
  extraBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  extraInput: {
    minWidth: 80,
    textAlign: 'left',
    color: '#111827',
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  modeCardSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  modeTitleSelected: {
    color: '#166534',
  },
  modeDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  sheetFooter: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  nextBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  stepperItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperCircleActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  stepperCircleDone: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  stepperIndex: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '800',
  },
  stepperIndexActive: {
    color: '#fff',
  },
  stepperLabel: {
    marginLeft: 6,
    color: '#6b7280',
    fontWeight: '700',
  },
  stepperLabelActive: {
    color: '#111827',
  },
  stepperLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 10,
  },
  sheetAmountSummary: {
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: 'center',
  },
  amountSummaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginLeft: 4,
  },
  reasonSummaryBox: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    maxWidth: '90%',
  },
  reasonSummaryText: {
    fontSize: 12,
    color: '#111827',
    textAlign: 'center',
  },
  amountPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    marginTop: 2,
    marginBottom: 6,
  },
  amountPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
});
