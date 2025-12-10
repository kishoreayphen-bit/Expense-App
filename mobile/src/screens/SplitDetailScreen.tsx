import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Platform, ToastAndroid, Alert, Modal, Share, LayoutAnimation, UIManager, Vibration, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Group, GroupService, UserSummary } from '../api/groupService';
import { useAuth } from '../context/AuthContext';
import { isPaid, markPaid, unmarkPaid } from '../state/localSettlements';
import { formatCurrency } from '../utils/format';

export default function SplitDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { groupId, split } = route.params as {
    groupId: number;
    split: { id?: number; title: string; totalAmount: number; currency: string; involvedUserIds: number[]; shares?: Array<{ userId: number; amount: number }> };
  };

  const onShareUnpaid = async () => {
    try {
      const lines: string[] = [];
      lines.push(`Reminder for split: ${split.title}`);
      lines.push(`Total: ${formatCurrency(Number(split.totalAmount)||0, split.currency || 'INR')}`);
      if (paidById) lines.push(`Paid by: ${youArePayer ? 'you' : (payerName || 'Someone')}`);
      lines.push('');
      const unpaid = (computedSharesSorted || []).filter(s => !paidSet.has(s.userId) && s.userId !== paidById);
      if (unpaid.length === 0) {
        lines.push('All settled.');
      } else {
        lines.push('Unpaid:');
        unpaid.forEach(s => {
          const nm = nameOf(s.userId);
          const amt = formatCurrency(Number(s.amount)||0, split.currency || 'INR');
          lines.push(`- ${nm}: ${amt}`);
        });
      }
      const msg = lines.join('\n');
      await Share.share({ message: msg });
    } catch {}
  };

  const onSendReminder = async () => {
    // Check if split ID is valid (not a local timestamp)
    const splitId = split.id;
    if (!splitId || typeof splitId !== 'number') {
      if (Platform.OS === 'android') ToastAndroid.show('Cannot send reminder for unsaved split', ToastAndroid.SHORT);
      else Alert.alert('Error', 'Cannot send reminder for unsaved split');
      return;
    }
    
    // Check if it's a local ID (timestamp - very large number)
    if (splitId > 1000000000000) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Split not synced yet. Please wait and try again.', ToastAndroid.LONG);
      } else {
        Alert.alert('Not Synced', 'This split hasn\'t been synced with the server yet. Please wait a moment and try again.');
      }
      return;
    }
    
    try {
      const result = await GroupService.sendReminder(groupId, splitId);
      if (Platform.OS === 'android') {
        ToastAndroid.show(result.message, ToastAndroid.LONG);
      } else {
        Alert.alert('Success', result.message);
      }
      setMoreOpen(false);
    } catch (error: any) {
      console.error('Send reminder error:', error);
      if (Platform.OS === 'android') {
        ToastAndroid.show(error.message || 'Failed to send reminder', ToastAndroid.SHORT);
      } else {
        Alert.alert('Error', error.message || 'Failed to send reminder');
      }
    }
  };

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [paidSet, setPaidSet] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'summary'|'participants'>('summary');
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState<boolean>(false);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [menuUserId, setMenuUserId] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState<boolean>(false);
  const tabOpacity = useRef(new Animated.Value(1)).current;

  // Enable layout animations on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  const haptic = () => { try { Vibration.vibrate(10); } catch {} };

  const switchTab = (tab: 'summary'|'participants') => {
    Animated.timing(tabOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setActiveTab(tab);
      Animated.timing(tabOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    });
  };

  // Copy fallback using Share to avoid optional clipboard dependency
  const copyText = async (txt: string) => {
    try {
      await Share.share({ message: txt });
    } catch {}
  };

  const onShareForUser = async (uid: number) => {
    try {
      const nm = nameOf(uid);
      const amt = (computedShares || []).find(s => s.userId === uid)?.amount || 0;
      const msg = `${nm}, you owe ${formatCurrency(amt, split.currency || 'INR')} for "${split.title || 'Split'}"`;
      await Share.share({ message: msg });
    } catch {}
  };

  const currentUserId: number | null = useMemo(() => {
    // Try to get ID from user object (JWT claims)
    const idLike = (user && (user.userId || user.id || user.sub)) ?? null;
    const n = typeof idLike === 'string' ? parseInt(idLike, 10) : idLike;
    if (Number.isFinite(n)) {
      console.log('[SplitDetail] currentUserId from JWT:', n);
      return n as number;
    }
    
    // Fallback: try to find current user by email in group members
    const currentUserEmail = (user?.email || user?.sub || user?.username || '').toLowerCase();
    if (currentUserEmail && group?.members) {
      const currentMember = group.members.find(m => 
        m.email && currentUserEmail && m.email.toLowerCase() === currentUserEmail
      );
      if (currentMember && Number.isFinite(currentMember.id)) {
        console.log('[SplitDetail] currentUserId from email match:', currentMember.id);
        return currentMember.id;
      }
    }
    
    console.warn('[SplitDetail] Could not determine currentUserId', { user, groupMembers: group?.members?.length });
    return null;
  }, [user, group?.members]);

  const loadData = async () => {
    setLoading(true);
    let g = await GroupService.getGroup(groupId);
    // Enrich members to ensure names are available
    const uniqueMerge = (a: any[], b: any[]) => {
      const map = new Map<number, any>();
      [...(a||[]), ...(b||[])].forEach(u => { if (u && typeof u.id !== 'undefined') map.set(u.id, u); });
      return Array.from(map.values());
    };
    if (!g || !g.members || g.members.length === 0) {
      const demoUsers = await GroupService.listUsers('', 10);
      g = { id: groupId, name: g?.name || `Group #${groupId}`, members: demoUsers } as Group;
    } else if (g.members.length < 2) {
      const more = await GroupService.listUsers('', 10);
      g = { ...g, members: uniqueMerge(g.members, more) } as Group;
    }
    setGroup(g);
    setLoading(false);
    // load paid status from local settlements
    const involved = split.involvedUserIds || [];
    const res = await Promise.all(involved.map(uid => isPaid(groupId, split.id ?? `${split.title}-${split.totalAmount}`, uid)));
    const s = new Set<number>();
    involved.forEach((uid, idx) => { if (res[idx]) s.add(uid); });
    setPaidSet(s);
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  // Refresh data when screen comes into focus (e.g., after payment)
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [groupId, split.id])
  );

  const nameOf = (id: number) => {
    const m = (group?.members || []).find(x => x.id === id) as UserSummary | undefined;
    return m?.name || m?.email || `User #${id}`;
  };

  const computedShares = useMemo(() => {
    // If explicit shares present, use them; else equal split among involved
    if (split?.shares && split.shares.length > 0) return split.shares;
    const cnt = Math.max(1, split.involvedUserIds?.length || 1);
    const each = (Number(split.totalAmount) || 0) / cnt;
    return (split.involvedUserIds || []).map(uid => ({ userId: uid, amount: each }));
  }, [split]);

  // Payer and involvement info (defined early so downstream hooks can use)
  const paidById = (split as any)?.paidByUserId as number | undefined;
  const payerName = paidById ? nameOf(paidById) : undefined;
  const youArePayer = currentUserId != null && paidById === currentUserId;
  const youInvolved = currentUserId != null && (split.involvedUserIds || []).includes(currentUserId);
  
  // Debug logging
  console.log('[Split Detail Debug]', {
    currentUserId,
    currentUserEmail: user?.email || user?.sub,
    involvedUserIds: split.involvedUserIds,
    youInvolved,
    youArePayer,
    paidById,
    groupMembers: group?.members?.map(m => ({ id: m.id, email: m.email, name: m.name }))
  });

  // Sort: unpaid first, then paid; keep payer last for convenience
  const computedSharesSorted = useMemo(() => {
    const arr = [...(computedShares || [])];
    return arr.sort((a, b) => {
      const aPaid = paidSet.has(a.userId) ? 1 : 0;
      const bPaid = paidSet.has(b.userId) ? 1 : 0;
      if (aPaid !== bPaid) return aPaid - bPaid; // unpaid (0) before paid (1)
      if (a.userId === paidById) return 1;
      if (b.userId === paidById) return -1;
      return nameOf(a.userId).localeCompare(nameOf(b.userId));
    });
  }, [computedShares, paidSet, paidById, group]);

  const visibleShares = useMemo(() => {
    if (!showOnlyUnpaid) return computedSharesSorted;
    return (computedSharesSorted || []).filter(s => !paidSet.has(s.userId) && s.userId !== paidById);
  }, [computedSharesSorted, showOnlyUnpaid, paidSet, paidById]);

  

  const renderShare = ({ item }: { item: { userId: number; amount: number } }) => {
    const nm = nameOf(item.userId);
    const isPayer = paidById != null && item.userId === paidById;
    const isSelf = currentUserId != null && item.userId === currentUserId;
    const paid = paidSet.has(item.userId);
    let secondary = 'Participant';
    if (isPayer) {
      secondary = 'Payer';
    } else if (paid) {
      secondary = isSelf ? 'You paid' : 'Paid';
    } else {
      if (youArePayer) secondary = isSelf ? 'You do not owe' : 'Owes you';
      else if (isSelf) secondary = 'You owe';
      else secondary = 'Unpaid';
    }
    const amountStr = formatCurrency(item.amount, split.currency || 'INR');
    const rightActions = () => (
      <View style={styles.swipeActions}>
        <TouchableOpacity style={[styles.swipeBtn, styles.swipeRemind]} onPress={() => onShareForUser(item.userId)}>
          <MaterialIcons name="notifications" size={16} color="#fff" />
          <Text style={styles.swipeBtnText}>Remind</Text>
        </TouchableOpacity>
        {canToggle(item.userId) && (
          <TouchableOpacity style={[styles.swipeBtn, styles.swipeToggle]} onPress={() => togglePaid(item.userId)}>
            <MaterialIcons name={paid ? 'undo' : 'check-circle'} size={16} color="#fff" />
            <Text style={styles.swipeBtnText}>{paid ? 'Unmark' : 'Mark'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );

    return (
      <Swipeable renderRightActions={rightActions} overshootRight={false}>
      <View style={styles.memberRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{nm.slice(0,1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName}>{nm}{isSelf ? ' (You)' : ''}</Text>
          <Text style={styles.memberSub}>{secondary}</Text>
        </View>
        <View style={{ alignItems:'flex-end' }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <Text style={styles.rowValue}>{amountStr}</Text>
            <TouchableOpacity accessibilityLabel={`Copy ${amountStr}`} style={styles.copyBtn} onPress={() => copyText(amountStr)}>
              <MaterialIcons name="content-copy" size={16} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={`More for ${nm}`} style={styles.moreBtn} onPress={() => { setMenuUserId(item.userId); setMenuVisible(true); }}>
              <MaterialIcons name="more-vert" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 4, alignSelf:'flex-end', flexDirection:'row', alignItems:'center', gap:8 }}>
            {paid ? (
              <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>PAID</Text></View>
            ) : (
              <>
                <View style={styles.unpaidBadge}><Text style={styles.unpaidBadgeText}>UNPAID</Text></View>
                {isSelf && !isPayer && !paid && (
                  <TouchableOpacity 
                    onPress={() => {
                      console.log('[Pay Button] Clicked!', {
                        splitShareId: item.userId,
                        amount: item.amount,
                        currency: split.currency || 'INR',
                        recipientName: payerName || 'Payer',
                        expenseTitle: split.title,
                        groupId,
                        splitId: split.id,
                        userId: currentUserId,
                      });
                      try {
                        navigation.navigate('Payment', {
                          splitShareId: item.userId,
                          amount: item.amount,
                          currency: split.currency || 'INR',
                          recipientName: payerName || 'Payer',
                          expenseTitle: split.title,
                          groupId,
                          splitId: split.id,
                          userId: currentUserId,
                        });
                      } catch (error) {
                        console.error('[Pay Button] Navigation error:', error);
                        Alert.alert('Error', 'Could not open payment screen. Please try again.');
                      }
                    }} 
                    style={styles.payNowBtn}
                  >
                    <MaterialIcons name="payment" size={14} color="#FFFFFF" />
                    <Text style={styles.payNowBtnText}>Pay</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            {canToggle(item.userId) && (
              <TouchableOpacity onPress={() => { haptic(); togglePaid(item.userId); }} style={styles.toggleBtn}>
                <Text style={styles.toggleBtnText}>{paid ? 'Unmark' : 'Mark paid'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      </Swipeable>
    );
  };

  const yourShare = useMemo(() => {
    if (!currentUserId) return null;
    const s = (computedShares || []).find(x => x.userId === currentUserId);
    return s?.amount ?? null;
  }, [computedShares, currentUserId]);

  const onPayNow = async () => {
    if (!currentUserId) return;
    console.log('[Pay Now Button] Navigating to payment screen', {
      splitShareId: currentUserId,
      amount: yourShare,
      currency: split.currency || 'INR',
      recipientName: payerName || 'Payer',
      expenseTitle: split.title,
      groupId,
      splitId: split.id,
      userId: currentUserId,
    });
    try {
      navigation.navigate('Payment', {
        splitShareId: currentUserId,
        amount: yourShare || 0,
        currency: split.currency || 'INR',
        recipientName: payerName || 'Payer',
        expenseTitle: split.title,
        groupId,
        splitId: split.id,
        userId: currentUserId,
      });
    } catch (error) {
      console.error('[Pay Now] Navigation error:', error);
      Alert.alert('Error', 'Could not open payment screen. Please try again.');
    }
  };

  const canToggle = (userId: number) => {
    if (youArePayer) return true; // payer can toggle anyone
    return currentUserId === userId; // others can only toggle themselves
  };

  const togglePaid = async (userId: number) => {
    if (!canToggle(userId)) return;
    const key = split.id ?? `${split.title}-${split.totalAmount}`;
    if (paidSet.has(userId)) {
      await unmarkPaid(groupId, key, userId);
      setPaidSet(prev => { const n = new Set(prev); n.delete(userId); return n; });
    } else {
      await markPaid(groupId, key, userId);
      setPaidSet(prev => new Set<number>([...Array.from(prev), userId]));
    }
  };

  const outstandingTotal = useMemo(() => {
    // sum of unpaid shares (excluding payer's own share)
    const shares = computedShares || [];
    return shares.reduce((sum, s) => {
      if (s.userId === paidById) return sum;
      return paidSet.has(s.userId) ? sum : sum + (Number(s.amount) || 0);
    }, 0);
  }, [computedShares, paidSet, paidById]);

  const totalCount = split.involvedUserIds?.length || 0;
  const paidCount = paidSet.size;
  const progressPct = totalCount > 0 ? Math.min(1, Math.max(0, paidCount / totalCount)) : 0;
  const progressPctNum = Math.round(progressPct * 100);

  const onShare = async () => {
    try {
      const lines: string[] = [];
      lines.push(`Split: ${split.title}`);
      lines.push(`Total: ${formatCurrency(Number(split.totalAmount)||0, split.currency || 'INR')}`);
      if (paidById) lines.push(`Paid by: ${youArePayer ? 'you' : (payerName || 'Someone')}`);
      lines.push('');
      lines.push('Participants:');
      (computedSharesSorted || []).forEach(s => {
        const nm = nameOf(s.userId);
        const amt = formatCurrency(Number(s.amount)||0, split.currency || 'INR');
        const status = paidSet.has(s.userId) ? 'PAID' : 'UNPAID';
        lines.push(`- ${nm}: ${amt} (${status})`);
      });
      const msg = lines.join('\n');
      await Share.share({ message: msg });
    } catch (e) {}
  };

  const [settleOpen, setSettleOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      

      {/* Participant context menu */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.menuCard]}>
            <Text style={styles.menuTitle}>Actions</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => { const amt = computedShares.find(s=>s.userId===menuUserId)?.amount || 0; copyText(formatCurrency(amt, split.currency||'INR')); setMenuVisible(false); }}>
              <MaterialIcons name="content-copy" color="#374151" size={18} />
              <Text style={styles.menuItemText}>Copy amount</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { if (menuUserId!=null) onShareForUser(menuUserId); setMenuVisible(false); }}>
              <MaterialIcons name="share" color="#374151" size={18} />
              <Text style={styles.menuItemText}>Remind this person</Text>
            </TouchableOpacity>
            {menuUserId!=null && canToggle(menuUserId) && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { haptic(); togglePaid(menuUserId!); setMenuVisible(false); }}>
                <MaterialIcons name="check-circle" color="#374151" size={18} />
                <Text style={styles.menuItemText}>Toggle paid</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.menuClose]} onPress={() => setMenuVisible(false)}>
              <Text style={styles.menuCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* More actions bottom sheet */}
      <Modal visible={moreOpen} animationType="fade" transparent onRequestClose={()=>setMoreOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>More Actions</Text>
              <TouchableOpacity onPress={()=>setMoreOpen(false)}>
                <MaterialIcons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={()=>{ onShare(); setMoreOpen(false); }}>
              <MaterialIcons name="share" size={18} color="#374151" />
              <Text style={styles.menuItemText}>Share split summary</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={()=>{ onShareUnpaid(); setMoreOpen(false); }}>
              <MaterialIcons name="share" size={18} color="#374151" />
              <Text style={styles.menuItemText}>Share unpaid list</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={onSendReminder}>
              <MaterialIcons name="notifications-active" size={18} color="#10b981" />
              <Text style={[styles.menuItemText, { color: '#10b981' }]}>Send reminder to all</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.cardPrimary}>
        <Text style={styles.splitTitle}>{split.title || 'Untitled'}</Text>
        <Text style={styles.amount}>{formatCurrency(Number(split.totalAmount)||0, split.currency || 'INR')}</Text>
        <View style={styles.chipsRow}>
          <View style={styles.chipSmall}><Text style={styles.chipSmallText}>{split.currency || 'INR'}</Text></View>
          <View style={styles.chipSmall}><Text style={styles.chipSmallText}>{(split.involvedUserIds?.length || 0)} involved</Text></View>
          <View style={styles.chipSmall}><Text style={styles.chipSmallText}>{paidSet.size}/{split.involvedUserIds?.length || 0} paid</Text></View>
        </View>
        {!!paidById && (
          <Text style={styles.subtitle}>Paid by {youArePayer ? 'you' : (payerName || `User #${paidById}`)} • {formatCurrency(Number(split.totalAmount)||0, split.currency || 'INR')}</Text>
        )}
        {yourShare != null && (
          <View style={styles.yourShareBadge}>
            <Text style={styles.yourShareText}>Your share: {formatCurrency(Number(yourShare)||0, split.currency || 'INR')}</Text>
          </View>
        )}
        {!youInvolved && (
          <View style={styles.infoBanner}>
            <MaterialIcons name="info" size={16} color="#1f2937" />
            <Text style={styles.infoBannerText}>You are not involved in this split</Text>
          </View>
        )}
        {youInvolved && !youArePayer && currentUserId && !paidSet.has(currentUserId) && (
          <TouchableOpacity style={[styles.payNowBtn]} onPress={onPayNow}>
            <MaterialIcons name="payments" size={16} color="#fff" />
            <Text style={styles.payNowBtnText}>Pay Now</Text>
          </TouchableOpacity>
        )}
        {youInvolved && !youArePayer && currentUserId && paidSet.has(currentUserId) && (
          <View style={styles.paidBanner}>
            <MaterialIcons name="check-circle" size={16} color="#10B981" />
            <Text style={styles.paidBannerText}>You have paid your share</Text>
          </View>
        )}
        {progressPctNum > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPctNum}%` }]} />
          </View>
        )}
        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity onPress={() => { animate(); switchTab('summary'); }} style={[styles.tabBtn, activeTab==='summary' && styles.tabBtnActive]}>
            <Text style={[styles.tabText, activeTab==='summary' && styles.tabTextActive]}>Summary</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { animate(); switchTab('participants'); }} style={[styles.tabBtn, activeTab==='participants' && styles.tabBtnActive]}>
            <Text style={[styles.tabText, activeTab==='participants' && styles.tabTextActive]}>Participants</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={{ opacity: tabOpacity }}>
      {activeTab === 'summary' ? (
        <View style={styles.card}>
          <View style={[styles.rowBetween, { marginBottom: 8 }]}>
            <Text style={styles.cardTitle}>Summary</Text>
            {loading && <ActivityIndicator color="#4CAF50" />}
          </View>
          <View style={{ flexDirection:'row', gap: 10, alignItems:'center' }}>
            <View style={[styles.kpiBox, { flex: 1 }]}> 
              <Text style={styles.kpiLabel}>Outstanding</Text>
              <Text style={styles.kpiValue}>{formatCurrency(Number(outstandingTotal)||0, split.currency || 'INR')}</Text>
            </View>
            <View style={[styles.kpiBox, { flex: 1 }]}> 
              <Text style={styles.kpiLabel}>Paid</Text>
              <Text style={styles.kpiValue}>{paidCount}/{totalCount}</Text>
            </View>
            <View style={styles.kpiCircle}>
              <Text style={styles.kpiCircleText}>{progressPctNum}%</Text>
            </View>
          </View>
          {/* Mini paid vs outstanding bar */}
          <View style={styles.miniBarRow}>
            <View style={[styles.miniBarPaid, { flex: progressPctNum }]} />
            <View style={[styles.miniBarOutstanding, { flex: Math.max(0, 100 - progressPctNum) }]} />
          </View>
          {yourShare != null && (
            <View style={[styles.infoBox, { marginTop: 10 }]}> 
              <MaterialIcons name="account-balance-wallet" size={16} color="#4CAF50" />
              <Text style={styles.infoBoxText}>Your share is {formatCurrency(Number(yourShare)||0, split.currency || 'INR')}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <View style={[styles.rowBetween, { marginBottom: 8 }]}>
            <Text style={styles.cardTitle}>Participants</Text>
            {loading && <ActivityIndicator color="#4CAF50" />}
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Paid {paidSet.size}/{split.involvedUserIds?.length || 0}</Text>
            <Text style={styles.summaryOutstanding}>Outstanding: {formatCurrency(Number(outstandingTotal)||0, split.currency || 'INR')}</Text>
          </View>
          <View style={[styles.chipsRow, { justifyContent:'flex-start' }]}>
            <TouchableOpacity onPress={()=>{ animate(); setShowOnlyUnpaid(false); }} style={[styles.chipSmall, !showOnlyUnpaid && { backgroundColor:'#E8F5E9' }]}>
              <Text style={[styles.chipSmallText, !showOnlyUnpaid && { color:'#166534' }]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>{ animate(); setShowOnlyUnpaid(true); }} style={[styles.chipSmall, showOnlyUnpaid && { backgroundColor:'#FFE4E6' }]}>
              <Text style={[styles.chipSmallText, showOnlyUnpaid && { color:'#9F1239' }]}>Unpaid</Text>
            </TouchableOpacity>
          </View>
          {visibleShares.length === 0 ? (
            <Text style={styles.sub}>No share breakdown available.</Text>
          ) : (
            <FlatList
              data={visibleShares}
              keyExtractor={(s, i) => `${s.userId}-${i}`}
              renderItem={renderShare}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          )}
        </View>
      )}
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <TouchableOpacity style={[styles.primaryBtn, styles.footerFullBtn]} onPress={() => setSettleOpen(true)}>
            <Text style={styles.primaryBtnText}>View & Settle</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footerBtnsRow}>
          <TouchableOpacity style={[styles.secondaryBtn, styles.footerHalfBtn]} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryBtn, styles.footerHalfBtn]} onPress={() => setMoreOpen(true)}>
            <Text style={styles.secondaryBtnText}>More</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settlement Modal */}
      <Modal visible={settleOpen} animationType="slide" transparent onRequestClose={()=>setSettleOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settle Up</Text>
              <TouchableOpacity onPress={()=>setSettleOpen(false)}>
                <MaterialIcons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>Paid {paidSet.size}/{split.involvedUserIds?.length || 0}</Text>
              <Text style={styles.summaryOutstanding}>Outstanding: {formatCurrency(Number(outstandingTotal)||0, split.currency || 'INR')}</Text>
            </View>
            <FlatList
              data={computedShares}
              keyExtractor={(s, i) => `${s.userId}-${i}`}
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{nameOf(item.userId).slice(0,1).toUpperCase()}</Text></View>
                  <View style={{ flex:1 }}>
                    <Text style={styles.memberName}>{nameOf(item.userId)}</Text>
                    <Text style={styles.memberSub}>{formatCurrency(item.amount, split.currency || 'INR')}</Text>
                  </View>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    {paidSet.has(item.userId) ? (
                      <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>PAID</Text></View>
                    ) : (
                      <View style={styles.unpaidBadge}><Text style={styles.unpaidBadgeText}>UNPAID</Text></View>
                    )}
                    {canToggle(item.userId) && (
                      <TouchableOpacity onPress={() => togglePaid(item.userId)} style={styles.toggleBtn}>
                        <Text style={styles.toggleBtnText}>{paidSet.has(item.userId) ? 'Unmark' : 'Mark paid'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              style={{ marginTop: 8 }}
            />
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: 12 }}>
              {youArePayer && (
                <TouchableOpacity
                  style={[styles.secondaryBtn, { marginRight: 8 }]}
                  onPress={async ()=>{
                    // mark all as paid except payer
                    for (const s of computedShares) {
                      if (s.userId !== paidById && !paidSet.has(s.userId)) {
                        await markPaid(groupId, split.id ?? `${split.title}-${split.totalAmount}`, s.userId);
                      }
                    }
                    const newSet = new Set<number>((computedShares||[]).map(s=>s.userId).filter(uid => uid === paidById || uid !== paidById));
                    // rebuild set with all non-payer marked
                    const rebuild = new Set<number>();
                    (computedShares||[]).forEach(s=>{ if (s.userId !== paidById) rebuild.add(s.userId); });
                    setPaidSet(rebuild);
                  }}
                >
                  <Text style={styles.secondaryBtnText}>Mark All Paid</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.primaryBtn]} onPress={()=>setSettleOpen(false)}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#F1F5F9' },
  iconBtn: { padding: 6, borderRadius: 8 },
  title: { fontSize: 16, fontWeight:'800', color:'#111827', flex:1, textAlign:'center' },
  card: { backgroundColor:'#F8FAFC', marginHorizontal:16, marginTop:12, borderRadius:12, padding:12 },
  cardPrimary: { backgroundColor:'#EEF2FF', marginHorizontal:16, marginTop:16, borderRadius:12, padding:12 },
  splitTitle: { fontSize: 18, fontWeight:'800', color:'#111827' },
  amount: { fontSize: 22, fontWeight:'900', color:'#111827', marginTop: 2 },
  sub: { color:'#6b7280' },
  subtitle: { color:'#6b7280', marginTop: 6 },
  cardTitle: { fontSize: 14, fontWeight:'800', color:'#111827', marginBottom: 8 },
  rowBetween: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  rowLabel: { color:'#374151', fontWeight:'600' },
  rowValue: { color:'#111827', fontWeight:'700' },
  avatar: { width:36, height:36, borderRadius:18, backgroundColor:'#E5E7EB', alignItems:'center', justifyContent:'center', marginRight:10 },
  avatarText: { color:'#111827', fontWeight:'800' },
  memberRow: { flexDirection:'row', alignItems:'center' },
  memberName: { color:'#111827', fontWeight:'700' },
  memberSub: { color:'#6b7280', fontSize:12 },
  yourShareBadge: { marginTop: 10, backgroundColor:'#DCFCE7', borderRadius:8, paddingHorizontal:10, paddingVertical:6, alignSelf:'flex-start' },
  yourShareText: { color:'#166534', fontWeight:'800' },
  infoBanner: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#E5E7EB', paddingHorizontal:10, paddingVertical:6, borderRadius:8, marginTop: 10 },
  infoBannerText: { color:'#1f2937', fontWeight:'700' },
  progressBar: { height:8, backgroundColor:'#E5E7EB', borderRadius:999, overflow:'hidden', marginTop: 10 },
  progressFill: { height:'100%', backgroundColor:'#4CAF50' },
  chipsRow: { flexDirection:'row', alignItems:'center', gap:8, marginTop: 6 },
  chipSmall: { backgroundColor:'#EEF2FF', borderRadius:999, paddingHorizontal:8, paddingVertical:4 },
  chipSmallText: { color:'#3730A3', fontWeight:'700', fontSize:11 },
  tabsRow: { flexDirection:'row', backgroundColor:'#F1F5F9', borderRadius:999, padding:4, marginTop: 12 },
  tabBtn: { flex:1, paddingVertical:6, borderRadius:999, alignItems:'center' },
  tabBtnActive: { backgroundColor:'#fff', elevation:1 },
  tabText: { color:'#64748B', fontWeight:'700', fontSize:12 },
  tabTextActive: { color:'#111827' },
  kpiBox: { backgroundColor:'#F8FAFC', borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, padding:12 },
  kpiLabel: { color:'#64748B', fontSize:12 },
  kpiValue: { color:'#0f172a', fontWeight:'800', fontSize:16, marginTop:4 },
  infoBox: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#ECFDF5', borderRadius:8, padding:10, borderWidth:1, borderColor:'#A7F3D0' },
  infoBoxText: { color:'#065F46', fontWeight:'700' },
  footer: { padding:16, borderTopWidth:1, borderTopColor:'#F1F5F9' },
  footerBtns: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between' },
  footerBtn: { flexGrow:1, flexBasis:'30%' },
  footerRow: { flexDirection:'row', marginBottom: 8 },
  footerBtnsRow: { flexDirection:'row', gap:8 },
  footerFullBtn: { flex: 1 },
  footerHalfBtn: { flex: 1 },
  primaryBtn: { backgroundColor:'#4CAF50', borderRadius:12, paddingVertical:12, paddingHorizontal:14, alignItems:'center', justifyContent:'center' },
  primaryBtnText: { color:'#fff', fontWeight:'800' },
  secondaryBtn: { borderWidth:1, borderColor:'#E5E7EB', borderRadius:12, paddingVertical:12, paddingHorizontal:14, alignItems:'center', justifyContent:'center', backgroundColor:'#fff' },
  secondaryBtnText: { color:'#111827', fontWeight:'800' },
  paidBadge: { backgroundColor:'#DCFCE7', paddingHorizontal:8, paddingVertical:2, borderRadius:999 },
  paidBadgeText: { color:'#166534', fontWeight:'800', fontSize:10 },
  unpaidBadge: { backgroundColor:'#FEE2E2', paddingHorizontal:8, paddingVertical:2, borderRadius:999 },
  unpaidBadgeText: { color:'#991B1B', fontWeight:'800', fontSize:10 },
  toggleBtn: { borderWidth:1, borderColor:'#E5E7EB', borderRadius:999, paddingHorizontal:10, paddingVertical:4, backgroundColor:'#fff' },
  payNowBtn: { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'#4F46E5', borderRadius:999, paddingHorizontal:10, paddingVertical:4 },
  payNowBtnText: { color:'#fff', fontWeight:'800', fontSize:10 },
  paidBanner: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#DCFCE7', borderRadius:8, paddingHorizontal:10, paddingVertical:6, marginTop: 10 },
  paidBannerText: { color:'#166534', fontWeight:'700', fontSize:13 },
  // Swipe actions
  swipeActions: { flexDirection:'row', alignItems:'stretch' },
  swipeBtn: { justifyContent:'center', alignItems:'center', paddingHorizontal:12 },
  swipeRemind: { backgroundColor:'#22C55E' },
  swipeToggle: { backgroundColor:'#3B82F6' },
  swipeBtnText: { color:'#fff', fontWeight:'800', fontSize:10, marginLeft: 6 },
  // KPI circle percent chip
  kpiCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor:'#E8F5E9', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#A7F3D0' },
  kpiCircleText: { color:'#065F46', fontWeight:'800' },
  toggleBtnText: { color:'#111827', fontWeight:'700', fontSize:12 },
  copyBtn: { padding:4, borderRadius:6, backgroundColor:'#F1F5F9' },
  moreBtn: { padding:4, borderRadius:6, backgroundColor:'#F1F5F9' },
  summaryRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 8 },
  summaryText: { color:'#6b7280' },
  summaryOutstanding: { color:'#b91c1c', fontWeight:'800' },
  modalBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'flex-end' },
  modalCard: { backgroundColor:'#fff', width:'100%', maxHeight:'80%', borderTopLeftRadius:16, borderTopRightRadius:16, padding:16 },
  modalHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  modalTitle: { fontWeight:'800', color:'#111827' },
  // Menu styles
  menuCard: { backgroundColor:'#fff', borderRadius:12, padding:12, width:'90%' },
  menuTitle: { fontWeight:'800', color:'#111827', marginBottom: 8, fontSize: 14 },
  menuItem: { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10 },
  menuItemText: { color:'#374151', fontWeight:'700' },
  menuClose: { alignSelf:'flex-end', marginTop: 6, paddingHorizontal:12, paddingVertical:8, borderRadius:8, backgroundColor:'#F3F4F6' },
  menuCloseText: { color:'#111827', fontWeight:'800' },
  miniBarRow: { flexDirection:'row', height:8, borderRadius:999, overflow:'hidden', marginTop: 10, borderWidth:1, borderColor:'#E5E7EB' },
  miniBarPaid: { backgroundColor:'#86EFAC' },
  miniBarOutstanding: { backgroundColor:'#FECACA' },
});
