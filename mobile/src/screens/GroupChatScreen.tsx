import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput, Alert, DeviceEventEmitter, EmitterSubscription, Platform, ToastAndroid } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Group, GroupService, Message, UserSummary } from '../api/groupService';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { drainPendingMessages } from '../state/pendingMessages';
import { getLocalMessages, addLocalMessage, setLocalMessages, removeLocalMessage } from '../state/localMessages';
import { formatCurrency } from '../utils/format';

export default function GroupChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const groupId = route.params?.groupId as number;
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [pendingNew, setPendingNew] = useState<Message | null>(null);
  const [composer, setComposer] = useState('');
  const [showSplit, setShowSplit] = useState(false);
  const [splitTitle, setSplitTitle] = useState('');
  const [splitAmount, setSplitAmount] = useState('0');
  const [splitCurrency, setSplitCurrency] = useState('INR');
  const [splitMemberIds, setSplitMemberIds] = useState<Set<number>>(new Set());
  const [processingWizardSplit, setProcessingWizardSplit] = useState(false);
  const [lastMyMessageId, setLastMyMessageId] = useState<number | null>(null);
  const [seenBy, setSeenBy] = useState<UserSummary[]>([]);
  const resendingRef = React.useRef(false);

  const currentUserId: number | null = React.useMemo(() => {
    // Try to get ID from user object (JWT claims)
    const idLike = (user && (user.userId || user.id || user.sub)) ?? null;
    const n = typeof idLike === 'string' ? parseInt(idLike, 10) : idLike;
    if (Number.isFinite(n)) {
      console.log('[GroupChat] currentUserId from JWT:', n);
      return n as number;
    }
    // Fallback: try to find current user by email in group members
    const currentUserEmail = (user?.email || user?.sub || '').toLowerCase();
    if (currentUserEmail && group?.members) {
      const currentMember = group.members.find(m => 
        m.email && currentUserEmail && m.email.toLowerCase() === currentUserEmail
      );
      if (currentMember && Number.isFinite(currentMember.id)) {
        console.log('[GroupChat] currentUserId from email match:', currentMember.id);
        return currentMember.id;
      }
    }
    console.warn('[GroupChat] Could not determine currentUserId', { user, groupMembers: group?.members?.length });
    return null;
  }, [user, group?.members]);

  const load = useCallback(async () => {
    setLoadingGroup(true);
    const g = await GroupService.getGroup(groupId);
    // Use only this group's actual members; do not augment with global users
    setGroup(g);
    setLoadingGroup(false);
  
    setLoadingMsgs(true);
    // Phase 1: show local cache and pending immediately
    const local = await getLocalMessages(groupId);
    const drained = drainPendingMessages(groupId);
    if (drained.length > 0) {
      console.log('[Chat] Drained pending messages:', drained.map(d=>d.id));
      if (Platform.OS === 'android') ToastAndroid.show('Split created', ToastAndroid.SHORT);
    }
    const pn = (pendingNew && pendingNew.groupId === groupId) ? pendingNew : null;
    setMessages(prev => {
      const byId = new Map<string, Message>();
      const pushAll = (arr: Message[]) => { (arr || []).forEach(m => { if (m && m.id != null) byId.set(String(m.id), m); }); };
      pushAll(prev);
      pushAll(local);
      pushAll(drained);
      if (pn) pushAll([pn]);
      return Array.from(byId.values()).sort((a, b) => {
        const ta = new Date((a as any).createdAt || 0).getTime();
        const tb = new Date((b as any).createdAt || 0).getTime();
        return ta - tb;
      });
    });

    // Phase 2: fetch from server and merge
    let base: Message[] = [];
    try {
      base = await GroupService.listMessages(groupId);
    } catch (err) {
      console.warn('[Chat] listMessages failed, keeping local cache. Error:', err);
      base = [];
    }
    // Reconcile: if server delivered equivalents, drop local-* echoes
    try {
      const localsSource: Message[] = [
        ...local,
        ...drained,
        ...(pn ? [pn] : [])
      ];
      const locals = (localsSource || []).filter(m => String(m.id || '').startsWith('local-'));
      const toRemoveIds: string[] = [];
      for (const lm of locals) {
        const match = base.find(sm => {
          if (!sm) return false;
          if (lm.type !== sm.type) return false;
          const sameSender = (lm.sender?.email && sm.sender?.email && lm.sender.email.toLowerCase() === sm.sender.email.toLowerCase())
            || (typeof lm.sender?.id === 'number' && lm.sender.id > 0 && lm.sender.id === sm.sender?.id);
          if (!sameSender) return false;
          // timestamps close (within 2 minutes) to avoid matching old history
          const timeLocal = new Date(lm.createdAt as any).getTime();
          const timeServer = new Date(sm.createdAt as any).getTime();
          const timeClose = Number.isFinite(timeLocal) && Number.isFinite(timeServer) ? Math.abs(timeServer - timeLocal) < 120000 : true;
          if (lm.type === 'text') {
            return timeClose && (lm.text || '').trim() === (sm.text || '').trim();
          }
          // split
          const titleLocal = (lm.split?.title || '').trim();
          const titleServer = (sm.split?.title || '').trim();
          const amountLocal = Number(lm.split?.totalAmount || 0);
          const amountServer = Number(sm.split?.totalAmount || 0);
          return timeClose && titleLocal === titleServer && Math.abs(amountLocal - amountServer) < 0.01;
        });
        if (match) {
          toRemoveIds.push(String(lm.id));
        }
      }
      setMessages(prev => {
        const byId = new Map<string, Message>();
        const pushAll = (arr: Message[]) => { (arr || []).forEach(m => { if (m && m.id != null) byId.set(String(m.id), m); }); };
        // keep previous minus matched locals
        pushAll(prev.filter(p => !toRemoveIds.includes(String(p.id))));
        // add server items
        pushAll(base);
        return Array.from(byId.values()).sort((a, b) => {
          const ta = new Date((a as any).createdAt || 0).getTime();
          const tb = new Date((b as any).createdAt || 0).getTime();
          return ta - tb;
        });
      });
      // remove reconciled locals from persistent cache
      for (const rid of toRemoveIds) {
        try { await removeLocalMessage(groupId, rid); } catch {}
      }
    } catch {
      // fallback merge without reconciliation
      setMessages(prev => {
        const byId = new Map<string, Message>();
        const pushAll = (arr: Message[]) => { (arr || []).forEach(m => { if (m && m.id != null) byId.set(String(m.id), m); }); };
        pushAll(prev);
        pushAll(base);
        return Array.from(byId.values()).sort((a, b) => {
          const ta = new Date((a as any).createdAt || 0).getTime();
          const tb = new Date((b as any).createdAt || 0).getTime();
          return ta - tb;
        });
      });
    }
    setLoadingMsgs(false);
  }, [groupId, pendingNew]);

  useEffect(() => { load(); }, [load]);

  // Persist latest messages to local cache so they survive navigation/reload
  // Important: avoid persisting while loading, otherwise an initial [] could overwrite cache.
  useEffect(() => {
    if (loadingMsgs) return;
    (async () => {
      try { await setLocalMessages(groupId, messages); } catch {}
    })();
  }, [groupId, messages, loadingMsgs]);

  // Reload messages and group when screen is refocused
  useFocusEffect(
    React.useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  // Mark group as read when messages have loaded
  useEffect(() => {
    if (loadingMsgs) return;
    console.log('[GroupChat] Marking group', groupId, 'as read, messages count:', messages.length);
    (async () => { 
      try { 
        const result = await GroupService.markGroupRead(groupId); 
        console.log('[GroupChat] Marked as read, result:', result);
      } catch (e) {
        console.error('[GroupChat] Failed to mark as read:', e);
      } 
    })();
  }, [groupId, loadingMsgs, messages.length]);

  // Fetch seen-by for the latest message sent by current user (server message only)
  useEffect(() => {
    if (!messages || messages.length === 0 || currentUserId == null) { setSeenBy([]); setLastMyMessageId(null); return; }
    const serverMsgs = messages.filter(m => !String(m.id || '').startsWith('local-'));
    const lastMine = [...serverMsgs].reverse().find(m => (
      (m.sender?.id === currentUserId) ||
      (user?.email && m.sender?.email && user.email.toLowerCase() === m.sender.email.toLowerCase())
    ));
    if (!lastMine) { setSeenBy([]); setLastMyMessageId(null); return; }
    const midNum = parseInt(String(lastMine.id), 10);
    if (!Number.isFinite(midNum)) { setSeenBy([]); setLastMyMessageId(null); return; }
    setLastMyMessageId(midNum);
    (async () => {
      try { const list = await GroupService.getSeenBy(groupId, midNum); setSeenBy(list); } catch { setSeenBy([]); }
    })();
  }, [messages, currentUserId, user?.email, groupId]);

  // Auto-resend pending local messages (text/split) and reconcile on success
  useEffect(() => {
    if (loadingMsgs) return;
    if (resendingRef.current) return;
    const locals = (messages || []).filter(m => String(m.id || '').startsWith('local-'));
    if (locals.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        resendingRef.current = true;
        for (const m of locals) {
          if (cancelled) break;
          try {
            let sent: Message | null = null;
            if ((m.type === 'text' || (!m.type && (m as any).text)) && (m.text || '').trim().length > 0) {
              sent = await GroupService.sendText(groupId, (m.text || '').trim());
            } else if (m.type === 'split' || (m as any).split) {
              const s = (m as any).split || {};
              sent = await GroupService.createSplitMessage(groupId, {
                title: String(s.title || 'Split'),
                totalAmount: Number(s.totalAmount || 0) || 0,
                currency: String(s.currency || 'INR'),
                involvedUserIds: Array.isArray(s.involvedUserIds) ? s.involvedUserIds : [],
                shares: Array.isArray(s.shares) ? s.shares : undefined,
              });
            }
            if (sent && !String((sent as any).id || '').startsWith('local-')) {
              const localId = String((m as any).id);
              // Replace in UI
              setMessages(prev => {
                const next = prev.filter(x => String((x as any).id) !== localId);
                return [...next, sent!].sort((a, b) => new Date(String((a as any).createdAt || 0)).getTime() - new Date(String((b as any).createdAt || 0)).getTime());
              });
              // Update local cache
              try { await removeLocalMessage(groupId, localId); } catch {}
              try { await addLocalMessage(groupId, sent); } catch {}
            }
          } catch {
            // keep local; retry on next pass
          }
        }
      } finally {
        resendingRef.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [loadingMsgs, messages, groupId]);

  // Receive optimistic message via navigation and store as pending (merged after load)
  useEffect(() => {
    const nm = route.params?.newMessage as Message | undefined;
    if (nm && nm.groupId === groupId) {
      console.log('[Chat] Received newMessage via params:', nm);
      setPendingNew(nm);
      // also append immediately so user sees it without waiting for reload
      setMessages(prev => {
        const exists = prev.some(m => String(m.id) === String(nm.id));
        return exists ? prev : [...prev, nm];
      });
      // persist optimistic messages locally
      if (String(nm.id || '').startsWith('local-')) {
        addLocalMessage(groupId, nm).catch(()=>{});
      }
      if (Platform.OS === 'android') {
        ToastAndroid.show('Split created', ToastAndroid.SHORT);
      }
      // clear the param so it doesn't re-trigger
      navigation.setParams({ newMessage: undefined });
    }
  }, [route.params?.newMessage, groupId, navigation]);

  // Handle wizard split creation result
  useEffect(() => {
    const wizardData = route.params?.createSplit;
    if (wizardData && !processingWizardSplit) {
      setProcessingWizardSplit(true);
      console.log('[Chat] Creating split from wizard:', wizardData);
      (async () => {
        const m = await GroupService.createSplitMessage(groupId, {
          title: (wizardData.title || 'Split'),
          totalAmount: wizardData.totalAmount,
          currency: 'INR',
          involvedUserIds: wizardData.involvedUserIds,
          shares: wizardData.shares,
        });
        if (m) {
          setMessages(prev => [...prev, m]);
          try { addLocalMessage(groupId, m); } catch {}
        }
        setProcessingWizardSplit(false);
        navigation.setParams({ createSplit: undefined } as any);
      })();
    }
  }, [route.params?.createSplit, processingWizardSplit, groupId, navigation]);

  // Also listen for global event in case navigation params path didn't fire
  useEffect(() => {
    const sub: EmitterSubscription = DeviceEventEmitter.addListener('group:newMessage', (nm: Message) => {
      if (!nm || nm.groupId !== groupId) return;
      console.log('[Chat] Received newMessage via DeviceEventEmitter:', nm);
      setPendingNew(nm);
      // append immediately as well
      setMessages(prev => {
        const exists = prev.some(m => String(m.id) === String(nm.id));
        return exists ? prev : [...prev, nm];
      });
      // persist optimistic messages locally
      if (String(nm.id || '').startsWith('local-')) {
        addLocalMessage(groupId, nm).catch(()=>{});
      }
      if (Platform.OS === 'android') {
        ToastAndroid.show('Split created', ToastAndroid.SHORT);
      }
    });
    return () => { sub.remove(); };
  }, [groupId]);

  const sendText = async () => {
    if (!composer.trim()) return;
    const m = await GroupService.sendText(groupId, composer.trim());
    if (m) {
      setMessages(prev => [...prev, m]);
      // Persist to local cache so it survives navigation regardless of server/local id
      try { await addLocalMessage(groupId, m); } catch {}
    }
    setComposer('');
  };

  const createSplit = async () => {
    const title = splitTitle.trim() || 'Untitled';
    const totalAmount = Number(splitAmount) || 0;
    const currency = splitCurrency.trim() || 'INR';
    const involvedUserIds = splitMemberIds.size > 0
      ? Array.from(splitMemberIds.values())
      : (group?.members || []).map(m => m.id);
    const m = await GroupService.createSplitMessage(groupId, { title, totalAmount, currency, involvedUserIds });
    if (m) {
      setMessages(prev => [...prev, m]);
      // Persist locally so it survives navigation/reload even if server doesn't return it yet
      try { addLocalMessage(groupId, m); } catch {}
      setShowSplit(false);
      setSplitTitle(''); setSplitAmount('0'); setSplitCurrency('INR'); setSplitMemberIds(new Set());
    }
  };

  const toggleSplitMember = (uid: number) => {
    setSplitMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  

  const formatWhen = (value: any) => {
    try {
      if (!value) return new Date().toLocaleString();
      const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : new Date();
      return isNaN(d.getTime()) ? new Date().toLocaleString() : d.toLocaleString();
    } catch {
      return new Date().toLocaleString();
    }
  };

  const renderMsg = ({ item }: { item: Message }) => {
    const isSplit = item.type === 'split' || !!(item as any).split;
    const isPending = String(item.id || '').startsWith('local-');
    
    // Debug sender info
    console.log('[Message Debug]', {
      messageId: item.id,
      type: item.type,
      senderName: item.sender?.name,
      senderEmail: item.sender?.email,
      senderId: item.sender?.id,
      currentUserId,
      currentUserEmail: user?.email
    });
    
    if (isSplit) {
      const involved = item.split?.involvedUserIds || [];
      const notInvolved = currentUserId != null && !involved.includes(currentUserId);
      const paidById = (item.split as any)?.paidByUserId as number | undefined;
      const payerName = (() => {
        if (!paidById) return undefined;
        const m = (group?.members || []).find(u => u.id === paidById);
        return m?.name || m?.email || `User #${paidById}`;
      })();
      const yourShareAmt = (() => {
        const s = (item.split?.shares || []).find(x => x.userId === currentUserId);
        return typeof s?.amount === 'number' ? s?.amount : Number(s?.amount || 0) || 0;
      })();
      const total = typeof item.split?.totalAmount === 'number' ? item.split?.totalAmount : Number(item.split?.totalAmount || 0) || 0;
      const payerShareAmt = (() => {
        const s = (item.split?.shares || []).find(x => x.userId === paidById);
        return typeof s?.amount === 'number' ? s?.amount : Number(s?.amount || 0) || 0;
      })();
      const owedToPayer = Math.max(0, total - payerShareAmt);
      const youArePayer = currentUserId != null && paidById === currentUserId;
      if (notInvolved) {
        // Minimal, non-clickable card for not-involved splits
        return (
          <View style={[styles.msgRow, styles.rowLeft]}>
            <View style={[styles.msgCard, styles.splitCard, styles.bubble, styles.bubbleReceived]}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'flex-end' }}>
                {isPending && (
                  <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>PENDING</Text></View>
                )}
                <View style={[styles.splitBadge, { marginLeft: isPending ? 6 : 0 }]}><Text style={styles.splitBadgeText}>SPLIT</Text></View>
              </View>
              <Text style={styles.splitTitle}>{item.split?.title || 'Untitled'}</Text>
              <Text style={styles.splitAmount}>
                {formatCurrency((typeof item.split?.totalAmount === 'number' ? item.split?.totalAmount : Number(item.split?.totalAmount) || 0), item.split?.currency || 'INR')}
              </Text>
              <Text style={styles.notInvolved}>You are not involved in this payment</Text>
            </View>
          </View>
        );
      }
      // Involved: full, clickable card
      const isCurrentUserSender = item.sender?.id === currentUserId || 
        (user?.email && item.sender?.email && user.email.toLowerCase() === item.sender.email.toLowerCase());
      const numericId = parseInt(String(item.id), 10);
      const isServer = Number.isFinite(numericId);
      const isMyLast = isCurrentUserSender && isServer && lastMyMessageId != null && numericId === lastMyMessageId;
      return (
        <View style={[styles.msgRow, isCurrentUserSender ? styles.rowRight : styles.rowLeft]}>
          <TouchableOpacity onPress={() => navigation.navigate('SplitDetail', { groupId, split: item.split })} style={[styles.msgCard, styles.splitCard, styles.bubble, isCurrentUserSender ? styles.bubbleSent : styles.bubbleReceived]} activeOpacity={0.8}>
            <View style={styles.rowBetween}>
              <Text style={styles.sender}>{isCurrentUserSender ? 'You' : (item.sender?.name || item.sender?.email || 'Unknown')}</Text>
              <View style={{ flexDirection:'row', alignItems:'center' }}>
                {isPending && (
                  <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>PENDING</Text></View>
                )}
                <View style={[styles.splitBadge, { marginLeft: isPending ? 6 : 0 }]}><Text style={styles.splitBadgeText}>SPLIT</Text></View>
              </View>
            </View>
            <Text style={styles.splitTitle}>{item.split?.title || 'Untitled'}</Text>
            <Text style={styles.splitAmount}>
              {formatCurrency((typeof item.split?.totalAmount === 'number' ? item.split?.totalAmount : Number(item.split?.totalAmount) || 0), item.split?.currency || 'INR')}
            </Text>
            {!!paidById && (
              <Text style={styles.paidBy}>Paid by {youArePayer ? 'you' : (payerName || `User #${paidById}`)}</Text>
            )}
            {currentUserId != null && !!paidById && (
              youArePayer ? (
                <Text style={styles.statusYouAreOwed}>You are owed {(Math.max(0, owedToPayer)).toFixed(2)} {item.split?.currency || 'INR'}</Text>
              ) : involved.includes(currentUserId) ? (
                <Text style={styles.statusYouOwe}>You owe {yourShareAmt.toFixed(2)} {item.split?.currency || 'INR'} to {payerName || `User #${paidById}`}</Text>
              ) : null
            )}
            <Text style={styles.time}>{formatWhen(item.createdAt)}</Text>
            {isMyLast && (
              <Text style={styles.seenBy}>{seenBy.length === 0 ? 'Seen by none yet' : `Seen by ${seenBy.slice(0,2).map(u => u.name || u.email).join(', ')}${seenBy.length > 2 ? ` and ${seenBy.length - 2} more` : ''}`}</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }
    // hide empty non-split messages
    if (!item.text || String(item.text).trim().length === 0) {
      return null;
    }
    const isCurrentUserSender = item.sender?.id === currentUserId || 
      (user?.email && item.sender?.email && user.email.toLowerCase() === item.sender.email.toLowerCase());
    const numericId = parseInt(String(item.id), 10);
    const isServer = Number.isFinite(numericId);
    const isMyLast = isCurrentUserSender && isServer && lastMyMessageId != null && numericId === lastMyMessageId;
    return (
      <View style={[styles.msgRow, isCurrentUserSender ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.msgCard, styles.bubble, isCurrentUserSender ? styles.bubbleSent : styles.bubbleReceived]}>
          <View style={{ flexDirection:'row', justifyContent:'flex-end' }}>
            {isPending && (
              <View style={[styles.pendingBadge, { marginBottom: 4 }]}><Text style={styles.pendingBadgeText}>PENDING</Text></View>
            )}
          </View>
          <Text style={styles.sender}>{isCurrentUserSender ? 'You' : (item.sender?.name || item.sender?.email || 'Unknown')}</Text>
          {!!item.text && <Text style={[styles.text, isCurrentUserSender ? styles.textSent : styles.textReceived]}>{item.text}</Text>}
          <Text style={[styles.time, isCurrentUserSender ? styles.timeSent : styles.timeReceived]}>{formatWhen(item.createdAt)}</Text>
          {isMyLast && (
            <Text style={styles.seenBy}>{seenBy.length === 0 ? 'Seen by none yet' : `Seen by ${seenBy.slice(0,2).map(u => u.name || u.email).join(', ')}${seenBy.length > 2 ? ` and ${seenBy.length - 2} more` : ''}`}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Chat header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('GroupInfo', { groupId })}>
          {loadingGroup ? (
            <ActivityIndicator color="#4CAF50" />
          ) : (
            <View>
              <Text style={styles.title}>{group?.name || 'Group'}</Text>
              <Text style={styles.subtitle}>{(group?.members?.length || 0)} members</Text>
            </View>
          )}
        </TouchableOpacity>
        {/* Removed header plus button as per request */}
      </View>

      {/* Split summary banner now appears below header */}
      {!loadingMsgs && messages.some(m => m.type === 'split') && (
        <View style={styles.summaryBanner}>
          <View style={{ flex:1 }}>
            <Text style={styles.summaryTitle}>Split expense summary</Text>
            <Text style={styles.summarySub}>View your outstanding splits</Text>
          </View>
          <TouchableOpacity style={styles.summaryCta} onPress={() => Alert.alert('Coming soon', 'Settlement flow will be added next.') }>
            <Text style={styles.summaryCtaText}>View & Settle</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Split composer */}
      {showSplit && (
        <View style={styles.splitComposer}>
          <TextInput style={styles.input} placeholder="Title" value={splitTitle} onChangeText={setSplitTitle} />
          <View style={styles.rowBetween}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="0.00" keyboardType="decimal-pad" value={splitAmount} onChangeText={setSplitAmount} />
            <TextInput style={[styles.input, { width: 100 }]} placeholder="INR" value={splitCurrency} onChangeText={setSplitCurrency} />
          </View>
          <Text style={styles.membersLabel}>Involved Members</Text>
          {(group?.members || []).map(m => (
            <TouchableOpacity key={m.id} style={styles.memberRow} onPress={() => toggleSplitMember(m.id)}>
              <MaterialIcons name={splitMemberIds.has(m.id) ? 'check-box' : 'check-box-outline-blank'} size={18} color={splitMemberIds.has(m.id) ? '#4CAF50' : '#6b7280'} />
              <Text style={styles.memberName}>{m.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.primaryBtn} onPress={createSplit}>
            <Text style={styles.primaryBtnText}>Create Split</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      {loadingMsgs ? (
        <ActivityIndicator style={{ marginTop: 16 }} color="#4CAF50" />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderMsg}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        />
      )}

      {/* Composer */}
      <View style={styles.composerRow}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Enter amount or chat" value={composer} onChangeText={setComposer} />
        <TouchableOpacity
          style={[styles.secondaryBtn, { marginLeft: 8 }]}
          onPress={async () => {
            // Navigate to wizard with only this group's members (fresh fetch to avoid stale/augmented lists)
            const fresh = await GroupService.getGroup(groupId);
            const members = ((fresh?.members || []) as any[])
              .filter(Boolean)
              .filter(m => typeof m.id === 'number' && isFinite(m.id) && m.id > 0);
            if (!fresh) {
              // Fallback to current state group members if fetch failed
              const fallback = ((group?.members || []) as any[])
                .filter(Boolean)
                .filter(m => typeof m.id === 'number' && isFinite(m.id) && m.id > 0);
              navigation.navigate('SplitCreateWizard', { groupId, members: fallback });
              return;
            }
            navigation.navigate('SplitCreateWizard', { groupId, members });
          }}
        >
          <Text style={styles.secondaryBtnText}>Split Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryBtn, { marginLeft: 8 }]} onPress={sendText}>
          <MaterialIcons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor:'#fff' },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:14, borderBottomWidth:1, borderBottomColor:'#F1F5F9', backgroundColor:'#fff', marginTop: 50 },
  iconBtn: { padding: 6, borderRadius: 8 },
  title: { fontSize: 16, fontWeight:'800', color:'#111827' },
  subtitle: { fontSize: 12, color:'#6b7280' },
  msgCard: { backgroundColor:'#F8FAFC', padding:12, borderRadius:12 },
  text: { color:'#0f172a' },
  sender: { color:'#64748B', fontSize: 12, marginBottom: 4 },
  time: { color:'#94A3B8', fontSize: 10, marginTop: 6 },
  splitCard: { backgroundColor:'#EEF2FF' },
  splitBadge: { backgroundColor:'#C7D2FE', paddingHorizontal:8, paddingVertical:2, borderRadius:999 },
  splitBadgeText: { fontSize:10, fontWeight:'800', color:'#3730A3' },
  pendingBadge: { backgroundColor:'#FEF3C7', paddingHorizontal:8, paddingVertical:2, borderRadius:999 },
  pendingBadgeText: { fontSize:10, fontWeight:'800', color:'#92400E' },
  splitTitle: { fontWeight:'800', color:'#111827', marginTop: 6 },
  splitAmount: { fontWeight:'800', color:'#111827' },
  splitComposer: { backgroundColor:'#fff', padding:12, borderBottomWidth:1, borderBottomColor:'#F1F5F9' },
  input: { borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, paddingHorizontal:10, paddingVertical:10, backgroundColor:'#fff' },
  rowBetween: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  primaryBtn: { backgroundColor:'#4CAF50', borderRadius:10, paddingVertical:10, paddingHorizontal:16, alignItems:'center', justifyContent:'center' },
  primaryBtnText: { color:'#fff', fontWeight:'800' },
  composerRow: { position:'absolute', left:0, right:0, bottom:20, padding:12, paddingBottom:16, backgroundColor:'#fff', borderTopWidth:1, borderTopColor:'#F1F5F9', flexDirection:'row' },
  secondaryBtn: { borderWidth:1, borderColor:'#4CAF50', borderRadius:10, paddingVertical:10, paddingHorizontal:12, alignItems:'center', justifyContent:'center', backgroundColor:'#E8F5E9' },
  secondaryBtnText: { color:'#4CAF50', fontWeight:'800' },
  // Newly added styles
  notInvolved: { color:'#6b7280', fontStyle:'italic', marginTop: 6 },
  paidBy: { color:'#6b7280', marginTop: 4 },
  statusYouAreOwed: { color:'#166534', fontWeight:'700', marginTop: 4 },
  statusYouOwe: { color:'#b91c1c', fontWeight:'700', marginTop: 4 },
  summaryBanner: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:10, backgroundColor:'#FFF7ED', borderBottomWidth:1, borderBottomColor:'#FED7AA' },
  summaryTitle: { color:'#7C2D12', fontWeight:'800' },
  summarySub: { color:'#7C2D12', fontSize:12 },
  summaryCta: { backgroundColor:'#7C2D12', paddingHorizontal:10, paddingVertical:6, borderRadius:999 },
  summaryCtaText: { color:'#fff', fontWeight:'800', fontSize:12 },
  membersLabel: { marginTop: 8, marginBottom: 4, color:'#6b7280', fontSize:12 },
  memberRow: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:6 },
  memberName: { color:'#111827' },
  // Bubble layout
  msgRow: { flexDirection:'row', width:'100%' },
  rowLeft: { justifyContent:'flex-start' },
  rowRight: { justifyContent:'flex-end' },
  bubble: { maxWidth:'82%', borderRadius:16, padding:10 },
  bubbleSent: { backgroundColor:'#DCF8C6', borderTopRightRadius:4 },
  bubbleReceived: { backgroundColor:'#FFFFFF', borderTopLeftRadius:4, borderWidth:1, borderColor:'#E5E7EB' },
  textSent: { color:'#0f172a' },
  textReceived: { color:'#0f172a' },
  timeSent: { color:'#475569' },
  timeReceived: { color:'#64748B' },
  seenBy: { color:'#64748B', fontSize: 10, marginTop: 4, fontStyle:'italic' },
});
