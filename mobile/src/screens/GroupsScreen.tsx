import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView, ToastAndroid, DeviceEventEmitter, EmitterSubscription, RefreshControl, Image, ActionSheetIOS, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GroupService, Group, Message, UserSummary } from '../api/groupService';
import { CompanyMemberService } from '../api/companyMemberService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { getLastGroupIds, setLastGroupIds, getSeenGroupIds, addSeenGroupId, clearSeenGroupIds } from '../state/groupMeta';

export default function GroupsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const isCompanyMode = !!activeCompanyId;
  const entityName = isCompanyMode ? 'Team' : 'Group';
  const entityNamePlural = isCompanyMode ? 'Teams' : 'Groups';
  // Users and group creation
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [usersQuery, setUsersQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [usersOffset, setUsersOffset] = useState(0);
  const pageSize = 20;
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [groupName, setGroupName] = useState('My Group');

  // Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const evtRef = React.useRef<EmitterSubscription | null>(null);
  const [newGroupIds, setNewGroupIds] = useState<Set<number>>(new Set());
  const [seenGroupIds, setSeenGroupIdsState] = useState<Set<number>>(new Set());
  const [imageMap, setImageMap] = useState<Record<number, string>>({});
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetGroup, setSheetGroup] = useState<Group | null>(null);

  // Inline chat view state
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composer, setComposer] = useState('');

  // Split composer (inline)
  const [showSplitComposer, setShowSplitComposer] = useState(false);
  const [splitTitle, setSplitTitle] = useState('');
  const [splitAmount, setSplitAmount] = useState('0');
  const [splitCurrency, setSplitCurrency] = useState('INR');
  const [splitMemberIds, setSplitMemberIds] = useState<Set<number>>(new Set());

  const currentUserId: number | null = React.useMemo(() => {
    const idLike = (user && ((user as any).id || (user as any).userId || (user as any).sub)) ?? null;
    const n = typeof idLike === 'string' ? parseInt(idLike, 10) : idLike;
    return Number.isFinite(n as any) ? (n as number) : null;
  }, [user]);

  const togglePickUser = (uid: number) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const showGroupActions = (g: Group) => {
    const isOwner = g.owner?.id === user?.id;
    const options = ['Delete For Me', ...(isOwner ? [`Delete ${entityName}`] : []), 'Cancel'];
    const destructiveIndex = isOwner ? 1 : 0;
    const cancelButtonIndex = options.length - 1;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructiveIndex, cancelButtonIndex },
        (i) => {
          if (i === 0) return deleteForMe(g);
          if (isOwner && i === 1) return deleteGroupOwner(g);
        }
      );
    } else {
      setSheetGroup(g);
      setSheetVisible(true);
    }
  };

  const exitGroup = async (g: Group) => {
    Alert.alert(`Exit ${entityName}`, `Leave "${g.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: async () => {
        const ok = await GroupService.leaveGroup(g.id);
        if (ok) {
          setGroups(prev => prev.filter(x => x.id !== g.id));
          if (activeGroup?.id === g.id) setActiveGroup(null);
          try { const { DeviceEventEmitter } = require('react-native'); DeviceEventEmitter.emit('groups:changed', { action: 'leave', groupId: g.id }); } catch {}
        } else {
          Alert.alert('Error', 'Failed to exit group');
        }
      }}
    ]);
  };

  const deleteForMe = async (g: Group) => {
    Alert.alert('Delete For Me', `Remove "${g.name}" for you only?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const ok = await GroupService.deleteGroupForMe(g.id);
        if (ok) {
          setGroups(prev => prev.filter(x => x.id !== g.id));
          if (activeGroup?.id === g.id) setActiveGroup(null);
          try { const { DeviceEventEmitter } = require('react-native'); DeviceEventEmitter.emit('groups:changed', { action: 'deleteForMe', groupId: g.id }); } catch {}
        } else {
          Alert.alert('Error', 'Failed to delete group for you');
        }
      }}
    ]);
  };

  const deleteGroupOwner = async (g: Group) => {
    Alert.alert(`Delete ${entityName}`, `Permanently delete "${g.name}" for everyone?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const ok = await GroupService.deleteGroup(g.id);
        if (ok) {
          setGroups(prev => prev.filter(x => x.id !== g.id));
          if (activeGroup?.id === g.id) setActiveGroup(null);
          try { const { DeviceEventEmitter } = require('react-native'); DeviceEventEmitter.emit('groups:changed', { action: 'delete', groupId: g.id }); } catch {}
        } else {
          Alert.alert('Error', 'Failed to delete group');
        }
      }}
    ]);
  };

  // Load ALL users by paging until exhausted
  const loadAllUsers = async () => {
    try {
      setUsersLoading(true);
      const seen = new Map<number, UserSummary>();
      
      // In company mode, load company members only
      if (isCompanyMode && activeCompanyId) {
        console.log('[GroupsScreen] Loading company members for company:', activeCompanyId);
        const companyMembers = await CompanyMemberService.listMembers(activeCompanyId);
        const activeMembers = companyMembers
          .filter(m => m.status === 'ACTIVE')
          .map(m => ({
            id: m.userId,
            name: m.userName || m.userEmail,
            email: m.userEmail,
          }));
        
        // Apply search filter if present
        const q = (usersQuery || '').toLowerCase();
        const filtered = q 
          ? activeMembers.filter(u => (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q))
          : activeMembers;
        
        setUsers(filtered);
        setUsersOffset(filtered.length);
        setHasMoreUsers(false);
        setUsersLoading(false);
        return;
      }
      
      // Personal mode: load all users from system
      let offset = 0;
      while (true) {
        const page = await GroupService.listUsers(usersQuery, pageSize, offset);
        const items: UserSummary[] = Array.isArray(page) ? page : [];
        if (items.length === 0) break;
        for (const u of items) seen.set(u.id, u);
        offset += items.length;
        if (items.length < pageSize) break;
        // Safety cap to avoid infinite loops
        if (offset > 1000) break;
      }
      let list = Array.from(seen.values());
      if (list.length < 4) {
        // Try deriving additional users from groups
        try {
          let gList = groups;
          if (!gList || gList.length === 0) {
            gList = await GroupService.listGroups();
          }
          const derived = new Map<number, UserSummary>();
          (gList || []).forEach((g)=>{
            (g.members || []).forEach((m)=>{ derived.set(m.id, m); });
          });
          // merge derived with already seen
          for (const [id, u] of derived.entries()) { if (!seen.has(id)) seen.set(id, u); }
          list = Array.from(seen.values());
        } catch {}
      }
      // Only add demo users in personal mode
      if (list.length < 4 && !isCompanyMode) {
        // Top up with demo users to ensure UI has enough entries
        const demo: UserSummary[] = [
          { id: -101, name: 'Alice', email: 'alice@example.com' },
          { id: -102, name: 'Bob', email: 'bob@example.com' },
          { id: -103, name: 'Charlie', email: 'charlie@example.com' },
          { id: -104, name: 'Dana', email: 'dana@example.com' },
        ];
        const existing = new Map(list.map(u => [u.id, u] as const));
        demo.forEach(d => { if (!existing.has(d.id)) existing.set(d.id, d); });
        list = Array.from(existing.values());
      }
      setUsers(list);
      setUsersOffset(list.length);
      setHasMoreUsers(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load all users');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadUsers = async (reset = false) => {
    try {
      if (reset) {
        setUsersLoading(true);
      } else {
        setLoadingMore(true);
      }
      const currentOffset = reset ? 0 : usersOffset;
      
      // In company mode, load company members only
      if (isCompanyMode && activeCompanyId) {
        console.log('[GroupsScreen] Loading company members for company:', activeCompanyId);
        const companyMembers = await CompanyMemberService.listMembers(activeCompanyId);
        const activeMembers = companyMembers
          .filter(m => m.status === 'ACTIVE')
          .map(m => ({
            id: m.userId,
            name: m.userName || m.userEmail,
            email: m.userEmail,
          }));
        
        // Apply search filter if present
        const q = (usersQuery || '').toLowerCase();
        const filtered = q 
          ? activeMembers.filter(u => (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q))
          : activeMembers;
        
        // Apply paging
        const arr = filtered.slice(currentOffset, currentOffset + pageSize);
        
        if (reset) {
          setUsers(arr);
          setUsersOffset(arr.length);
        } else {
          const existing = new Map(users.map(u => [u.id, u] as const));
          for (const u of arr) existing.set(u.id, u);
          const merged = Array.from(existing.values());
          setUsers(merged);
          setUsersOffset(merged.length);
        }
        setHasMoreUsers(arr.length === pageSize);
        setUsersLoading(false);
        setLoadingMore(false);
        return;
      }
      
      // Personal mode: 1) Try normal path with paging
      let arr = await GroupService.listUsers(usersQuery, pageSize, currentOffset);
      if (!arr || arr.length === 0) {
        // 2) Derive from groups in memory (or fetch groups)
        let gList = groups;
        if (!gList || gList.length === 0) {
          try { gList = await GroupService.listGroups(); } catch {}
        }
        const usersMap = new Map<number, UserSummary>();
        (gList || []).forEach((g)=>{
          const mem = Array.isArray(g?.members) ? g.members : [];
          mem.forEach((m:any)=>{
            const idRaw: any = (m?.id ?? m?.userId ?? m?.uid ?? m?.user?.id);
            const idNum = typeof idRaw === 'number' ? idRaw : (typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN);
            if (!Number.isFinite(idNum)) return;
            const email: string = m?.email || m?.emailAddress || m?.username || m?.user?.email || '';
            const name: string = m?.name || m?.fullName || m?.displayName || m?.user?.name || email || `User #${idNum}`;
            if (!usersMap.has(idNum)) usersMap.set(idNum, { id: idNum, name, email });
          });
        });
        const derived = Array.from(usersMap.values());
        // Apply local query filter if present
        const q = (usersQuery || '').toLowerCase();
        const filtered = q ? derived.filter(u => (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)) : derived;
        arr = filtered.slice(currentOffset, currentOffset + pageSize);
      }
      // Update list with paging
      if (reset) {
        const initial = arr || [];
        // In personal mode, inject demo users if empty so user can proceed
        // In company mode, keep empty to show proper empty state
        const safeInitial = (initial.length === 0 && !isCompanyMode)
          ? [
              { id: 101, name: 'Alice', email: 'alice@example.com' },
              { id: 102, name: 'Bob', email: 'bob@example.com' },
              { id: 103, name: 'Charlie', email: 'charlie@example.com' },
              { id: 104, name: 'Dana', email: 'dana@example.com' },
            ]
          : initial;
        setUsers(safeInitial);
        setUsersOffset(safeInitial.length);
      } else {
        const existing = new Map(users.map(u => [u.id, u] as const));
        for (const u of (arr || [])) existing.set(u.id, u);
        const merged = Array.from(existing.values());
        setUsers(merged);
        setUsersOffset(merged.length);
      }
      setHasMoreUsers((arr || []).length === pageSize);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load users');
      // In personal mode, inject demo users on error
      // In company mode, keep empty to show proper error state
      if (!isCompanyMode) {
        setUsers([
          { id: -101, name: 'Alice', email: 'alice@example.com' },
          { id: -102, name: 'Bob', email: 'bob@example.com' },
          { id: -103, name: 'Charlie', email: 'charlie@example.com' },
          { id: -104, name: 'Dana', email: 'dana@example.com' },
        ]);
        setUsersOffset(4);
      } else {
        setUsers([]);
        setUsersOffset(0);
      }
      setHasMoreUsers(false);
    } finally {
      setUsersLoading(false);
      setLoadingMore(false);
    }
  };

  const loadGroups = async () => {
    try {
      setGroupsLoading(true);
      let arr = await GroupService.listGroups();
      
      // Log unread counts for debugging
      console.log('[GroupsScreen] Loaded groups with unread counts:', 
        arr.map(g => ({ id: g.id, name: g.name, unreadCount: g.unreadCount })));
      
      // Overlay with locally saved image URLs from prior creations
      try {
        // Lazy import to avoid bundling issues
        const AS = require('@react-native-async-storage/async-storage').default;
        const enriched: Group[] = [] as any;
        for (const g of (arr || [])) {
          try {
            const key = `group.imageUrl.${g.id}`;
            const localUrl = await AS.getItem(key);
            enriched.push(localUrl ? { ...g, imageUrl: g.imageUrl || localUrl } : g);
          } catch {
            enriched.push(g);
          }
        }
        arr = enriched;
      } catch {}
      setGroups(arr);
      // Detect newly visible groups for this user
      try {
        if (currentUserId != null) {
          const latestIds = (arr || []).map(g => g.id);
          const [lastIds, seenIds] = await Promise.all([
            getLastGroupIds(currentUserId),
            getSeenGroupIds(currentUserId)
          ]);
          const newIds = latestIds.filter(id => !lastIds.includes(id));
          // Update local seen list state
          setSeenGroupIdsState(new Set(seenIds));
          if (newIds.length > 0) {
            const msg = newIds.length === 1 ? 'You were added to a new group' : `You were added to ${newIds.length} new groups`;
            if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT); else Alert.alert('Groups Updated', msg);
            setNotice(msg);
            setTimeout(()=> setNotice(null), 3000);
            setNewGroupIds(new Set(newIds));
          }
          await setLastGroupIds(currentUserId, latestIds);
        }
      } catch {}
    } catch (e: any) {
      // ignore
    } finally {
      setGroupsLoading(false);
    }
  };

  const createGroup = async () => {
    // Only send positive IDs (persisted users)
    const memberIds = Array.from(selectedUserIds.values()).filter(id => id > 0);
    const g = await GroupService.createGroup(groupName || 'My Group', memberIds);
    if (g) {
      Alert.alert(`${entityName} created`, `${g.name} (#${g.id})`);
      // Emit a local event for in-session notification (same device)
      try {
        const { DeviceEventEmitter } = require('react-native');
        DeviceEventEmitter.emit('groups:changed', { groupId: g.id });
      } catch {}
      setSelectedUserIds(new Set());
      setGroupName('My Group');
      await loadGroups();
    } else {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const openGroup = async (g: Group) => {
    // mark this group as seen in-session
    setNewGroupIds(prev => {
      const next = new Set(prev);
      next.delete(g.id);
      return next;
    });
    // persist seen id for future sessions
    if (currentUserId != null) {
      try { await addSeenGroupId(currentUserId, g.id); } catch {}
    }
    // Optimistically clear unread count in UI
    setGroups(prev => prev.map(x => x.id === g.id ? { ...x, unreadCount: 0 } as Group : x));
    
    // Navigate to chat
    navigation.navigate('GroupChat', { groupId: g.id });
  };

  const sendText = async () => {
    if (!activeGroup) return;
    const text = composer.trim();
    if (!text) return;
    setComposer('');
    const m = await GroupService.sendText(activeGroup.id, text);
    if (m) setMessages(prev => [...prev, m]);
  };

  const toggleSplitMember = (uid: number) => {
    setSplitMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const createSplit = async () => {
    if (!activeGroup) return;
    const title = splitTitle.trim() || 'Untitled';
    const totalAmount = Number(splitAmount) || 0;
    const currency = splitCurrency.trim() || 'INR';
    const involvedUserIds = Array.from(splitMemberIds.values());
    if (involvedUserIds.length === 0) {
      Alert.alert('Pick members', 'Select at least one member for the split');
      return;
    }
    const m = await GroupService.createSplitMessage(activeGroup.id, { title, totalAmount, currency, involvedUserIds });
    if (m) {
      setMessages(prev => [...prev, m]);
      setShowSplitComposer(false);
      setSplitTitle(''); setSplitAmount('0'); setSplitCurrency('INR'); setSplitMemberIds(new Set());
    } else {
      Alert.alert('Error', 'Failed to create split');
    }
  };

  useEffect(() => { 
    loadGroups(); 
  }, []);

  // Hydrate image map for groups missing imageUrl from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const AS = require('@react-native-async-storage/async-storage').default;
        const updates: Record<number, string> = {};
        await Promise.all((groups || []).map(async (g) => {
          if (!g?.id) return;
          const has = !!g.imageUrl || !!imageMap[g.id];
          if (has) return;
          try {
            const key = `group.imageUrl.${g.id}`;
            const localUrl = await AS.getItem(key);
            if (localUrl) updates[g.id] = localUrl;
          } catch {}
        }));
        if (Object.keys(updates).length > 0) setImageMap((prev) => ({ ...prev, ...updates }));
      } catch {}
    })();
  }, [groups]);

  // Refresh groups whenever this screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (!activeCompanyId) return () => {};
      console.log('[GroupsScreen] Screen focused, refreshing groups...');
      // Small delay to ensure backend has processed any mark-as-read calls
      const timer = setTimeout(() => {
        loadGroups();
      }, 300);
      return () => clearTimeout(timer);
    }, [activeCompanyId])
  );

  // Background polling while on this screen
  useEffect(() => {
    if (!activeCompanyId) return;
    const id = setInterval(() => {
      loadGroups();
    }, 60000); // every 60s
    return () => clearInterval(id);
  }, [currentUserId, activeCompanyId]);

  // React to global group events
  useEffect(() => {
    evtRef.current?.remove();
    evtRef.current = DeviceEventEmitter.addListener('groups:new', (evt: any) => {
      const count = evt?.count || 1;
      const msg = count === 1 ? 'You were added to a new group' : `You were added to ${count} new groups`;
      setNotice(msg);
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT); else Alert.alert('Groups Updated', msg);
      loadGroups();
      setTimeout(()=> setNotice(null), 3000);
    });
    // Also refresh when groups change (e.g., image set post-create)
    const sub2 = DeviceEventEmitter.addListener('groups:changed', () => {
      loadGroups();
    });
    return () => { evtRef.current?.remove(); evtRef.current = null; };
  }, []);

  // Debounce user search on query change
  // User search debounce removed: group creation moved to Split screen

  const renderMessage = ({ item }: { item: Message }) => {
    const mine = item.sender?.id === currentUserId;
    if (item.type === 'text') {
      return (
        <View style={[styles.msgRow, mine ? styles.msgMine : styles.msgTheirs]}>
          <Text style={styles.msgSender}>{item.sender?.name || 'User'}</Text>
          <Text style={styles.msgText}>{item.text}</Text>
          <Text style={styles.msgTime}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      );
    }
    // split card
    const involved = item.split?.involvedUserIds || [];
    const isInvolved = involved.includes(currentUserId);
    return (
      <View style={[styles.msgRow, styles.splitCard]}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <Text style={styles.msgSender}>{item.sender?.name || 'User'}</Text>
          <View style={styles.splitBadge}><Text style={styles.splitBadgeText}>SPLIT</Text></View>
        </View>
        <Text style={styles.splitTitle}>{item.split?.title}</Text>
        <Text style={styles.splitAmount}>{item.split?.totalAmount?.toFixed(2)} {item.split?.currency}</Text>
        {!isInvolved && (
          <Text style={styles.notInvolved}>You are not involved in this split</Text>
        )}
        {isInvolved && (
          <View style={{ marginTop: 6 }}>
            {(item.split?.shares || []).map((s, idx) => (
              <View key={idx} style={{ flexDirection:'row', justifyContent:'space-between' }}>
                <Text style={styles.shareLine}>User {s.userId}</Text>
                <Text style={styles.shareLine}>{s.amount.toFixed(2)} {item.split?.currency}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.msgTime}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
    );
  };

  const groupMembers = useMemo(() => activeGroup?.members || [], [activeGroup]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Android Action Sheet */}
        {Platform.OS !== 'ios' && (
          <Modal visible={sheetVisible} transparent animationType="fade" onRequestClose={()=>setSheetVisible(false)}>
            <TouchableOpacity activeOpacity={1} onPress={()=>setSheetVisible(false)} style={{ flex:1, backgroundColor:'rgba(0,0,0,0.25)', justifyContent:'flex-end' }}>
              <View style={{ backgroundColor:'#fff', borderTopLeftRadius:16, borderTopRightRadius:16, padding:12 }}>
                <Text style={{ fontSize:16, fontWeight:'700', color:'#0F172A', paddingHorizontal:4, paddingVertical:8 }}>{sheetGroup?.name || 'Group'}</Text>
                <View style={{ height:1, backgroundColor:'#F1F5F9' }} />
                <TouchableOpacity style={{ padding:16 }} onPress={()=>{ const g = sheetGroup!; setSheetVisible(false); if (g) deleteForMe(g); }}>
                  <Text style={{ color:'#DC2626', fontWeight:'700' }}>Delete For Me</Text>
                </TouchableOpacity>
                {!!(sheetGroup && sheetGroup.owner?.id === user?.id) && (
                  <TouchableOpacity style={{ padding:16 }} onPress={()=>{ const g = sheetGroup!; setSheetVisible(false); if (g) deleteGroupOwner(g); }}>
                    <Text style={{ color:'#DC2626', fontWeight:'800' }}>Delete {entityName}</Text>
                  </TouchableOpacity>
                )}
                <View style={{ height:8 }} />
                <TouchableOpacity style={{ padding:16, alignItems:'center' }} onPress={()=> setSheetVisible(false)}>
                  <Text style={{ color:'#0F172A', fontWeight:'700' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={<RefreshControl refreshing={groupsLoading} onRefresh={loadGroups} />}
        >
          {notice && (
            <View style={[styles.notice, { flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}>
              <Text style={[styles.noticeText, { flex: 1 }]}>{notice}</Text>
              <TouchableOpacity onPress={()=> setNotice(null)} style={{ padding: 6, marginLeft: 8 }}>
                <MaterialIcons name="close" size={16} color="#065F46" />
              </TouchableOpacity>
            </View>
          )}
          {/* Group creation moved to Split screen. This screen lists existing groups only. */}

          {/* Groups list */}
          <View style={styles.card}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <Text style={styles.cardTitle}>Your {entityNamePlural}</Text>
              <TouchableOpacity style={styles.iconBtn} onPress={loadGroups}>
                {groupsLoading ? <ActivityIndicator color="#4CAF50" /> : <MaterialIcons name="refresh" size={20} color="#4CAF50" />}
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection:'row', justifyContent:'flex-end', alignItems:'center', gap: 8, marginBottom: 6 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={async ()=>{
                if (currentUserId != null) {
                  await setLastGroupIds(currentUserId, []);
                  await clearSeenGroupIds(currentUserId);
                }
                setNewGroupIds(new Set());
                setSeenGroupIdsState(new Set());
                if (Platform.OS === 'android') ToastAndroid.show('Detection cache cleared', ToastAndroid.SHORT); else Alert.alert('Debug', 'Detection cache cleared');
              }}>
                <MaterialIcons name="cleaning-services" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {(groups.length === 0) && (
              <View style={{ paddingVertical: 8 }}>
                <Text style={styles.dim}>No {entityNamePlural.toLowerCase()} yet.</Text>
                <Text style={[styles.dim, { marginTop: 4 }]}>Create a {entityName.toLowerCase()} from the Split screen and it will appear here.</Text>
              </View>
            )}
            {groups.map(g => {
              const imgSrc = g.imageUrl || imageMap[g.id];
              const initial = (g.name || '?').trim().charAt(0).toUpperCase();
              
              if (isCompanyMode) {
                // Company mode - team card style (navigate to info, not chat)
                return (
                  <TouchableOpacity key={g.id} style={styles.teamCard} onPress={() => navigation.navigate('GroupInfo', { groupId: g.id })}>
                    <View style={{ position:'relative' }}>
                      <View style={{ flexDirection:'row', alignItems:'flex-start', gap:12 }}>
                        {imgSrc ? (
                          <Image source={{ uri: imgSrc }} style={styles.teamAvatar} />
                        ) : (
                          <View style={styles.teamAvatarPlaceholder}>
                            <MaterialIcons name="groups" size={28} color="#4F46E5" />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom: 4 }}>
                            <Text style={styles.teamName} numberOfLines={1}>{g.name}</Text>
                            {(newGroupIds.has(g.id) || !seenGroupIds.has(g.id)) && (
                              <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                            )}
                          </View>
                          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                            <MaterialIcons name="people" size={16} color="#6B7280" />
                            <Text style={styles.teamMemberCount}>{g.members?.length || 0} members</Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity onPress={(e) => { e.stopPropagation(); showGroupActions(g); }} style={{ position:'absolute', right: 0, top: 0, padding: 10 }}>
                        <MaterialIcons name="more-vert" size={22} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              } else {
                // Personal mode - list item style (with chat)
                return (
                  <TouchableOpacity key={g.id} style={[styles.rowBetween, { paddingVertical: 12 }]} onPress={() => openGroup(g)}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                      {imgSrc ? (
                        <Image source={{ uri: imgSrc }} style={styles.avatarImg} />
                      ) : (
                        <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
                      )}
                      <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                        <Text style={styles.rowLabel}>{g.name}</Text>
                        {(newGroupIds.has(g.id) || !seenGroupIds.has(g.id)) && (
                          <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                        )}
                      </View>
                    </View>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                      <Text style={styles.dim}>{g.members?.length || 0} members</Text>
                      {!!g.unreadCount && g.unreadCount > 0 && (
                        <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{g.unreadCount > 99 ? '99+' : String(g.unreadCount)}</Text></View>
                      )}
                      <TouchableOpacity onPress={() => showGroupActions(g)}>
                        <MaterialIcons name="more-vert" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                      <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                );
              }
            })}
          </View>

          {/* Inline chat view - Only show in personal mode */}
          {!isCompanyMode && activeGroup && (
            <View style={styles.card}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 12, paddingBottom: 8 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                  {(() => { const src = activeGroup.imageUrl || imageMap[activeGroup.id]; return src; })() ? (
                    <Image source={{ uri: (activeGroup.imageUrl || imageMap[activeGroup.id]) as string }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatar}><Text style={styles.avatarText}>{(activeGroup.name||'?').trim().charAt(0).toUpperCase()}</Text></View>
                  )}
                  <Text style={styles.cardTitle}>{entityName}: {activeGroup.name}</Text>
                </View>
                <TouchableOpacity onPress={()=> setActiveGroup(null)} style={{ padding: 6 }}>
                  <MaterialIcons name="close" size={18} color="#0F172A" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom: 8 }}>
                <TouchableOpacity style={[styles.secondaryBtn, { paddingHorizontal: 12 }]} onPress={() => deleteForMe(activeGroup)}>
                  <Text style={styles.secondaryBtnText}>Delete For Me</Text>
                </TouchableOpacity>
                {(activeGroup.owner?.id === user?.id) && (
                  <TouchableOpacity style={[styles.primaryBtn, { paddingHorizontal: 12, paddingVertical: 10 }]} onPress={() => deleteGroupOwner(activeGroup)}>
                    <Text style={styles.primaryBtnText}>Delete {entityName}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {messagesLoading ? (
                <ActivityIndicator color="#4CAF50" />
              ) : (
                <FlatList
                  data={messages}
                  keyExtractor={(m) => String(m.id)}
                  renderItem={renderMessage}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  contentContainerStyle={{ paddingVertical: 8 }}
                  scrollEnabled={false}
                />
              )}

              {/* Split composer toggle */}
              <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 8 }]} onPress={() => setShowSplitComposer(v => !v)}>
                <Text style={styles.secondaryBtnText}>{showSplitComposer ? 'Cancel Split' : 'New Split'}</Text>
              </TouchableOpacity>

              {showSplitComposer && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput style={styles.input} placeholder="e.g. Dinner" placeholderTextColor="#94A3B8" value={splitTitle} onChangeText={setSplitTitle} />
                  <Text style={styles.label}>Amount</Text>
                  <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" value={splitAmount} onChangeText={setSplitAmount} />
                  <Text style={styles.label}>Currency</Text>
                  <TextInput style={styles.input} placeholder="INR" placeholderTextColor="#94A3B8" value={splitCurrency} onChangeText={setSplitCurrency} />
                  <Text style={styles.label}>Involved Members</Text>
                  {groupMembers.map(m => (
                    <TouchableOpacity key={m.id} style={styles.rowBetween} onPress={() => toggleSplitMember(m.id)}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                        <MaterialIcons name={splitMemberIds.has(m.id) ? 'check-box' : 'check-box-outline-blank'} size={18} color={splitMemberIds.has(m.id) ? '#4CAF50' : '#6b7280'} />
                        <Text style={styles.rowLabel}>{m.name}</Text>
                      </View>
                      <Text style={styles.dim}>{m.email}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.primaryBtn, splitMemberIds.size === 0 && { opacity: 0.6 }]} disabled={splitMemberIds.size === 0} onPress={createSplit}>
                    <Text style={styles.primaryBtnText}>Create Split</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Composer */}
              <View style={[styles.inputRow, { marginTop: 12, marginBottom: 4 }]}>
                <TextInput style={[styles.inputField, { flex: 1 }]} placeholder="Type a message" placeholderTextColor="#94A3B8" value={composer} onChangeText={setComposer} />
                <TouchableOpacity style={styles.iconBtn} onPress={sendText}>
                  <MaterialIcons name="send" size={20} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Action Button for Create Team/Group */}
      {isCompanyMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateTeam')}
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  card: { backgroundColor:'rgba(255,255,255,0.95)', margin:16, borderRadius:20, padding:16, elevation:4, shadowColor:'#0f172a', shadowOpacity:0.04, shadowRadius:16, shadowOffset:{width:0,height:8} },
  cardTitle: { fontSize:18, fontWeight:'800', color:'#0F172A', marginBottom: 8, letterSpacing: -0.4 },
  label: { color:'#64748B', fontSize: 11, marginTop: 8, marginBottom: 6, fontWeight:'600', letterSpacing: 0.5, textTransform:'uppercase' },
  input: { borderWidth: 0, borderColor: 'transparent', borderRadius: 14, padding: 14, backgroundColor:'#F1F5F9', color:'#0F172A', fontSize:15, fontWeight:'500', shadowColor:'#000', shadowOpacity:0.03, shadowRadius:4, shadowOffset:{width:0,height:2} },
  inputRow: { flexDirection:'row', alignItems:'center', borderWidth:0, borderColor:'transparent', borderRadius: 14, backgroundColor:'#F1F5F9', shadowColor:'#000', shadowOpacity:0.03, shadowRadius:4, shadowOffset:{width:0,height:2} },
  inputField: { paddingVertical:10, paddingHorizontal:10, color:'#0F172A' },
  iconBtn: { paddingHorizontal:12, paddingVertical:10, marginLeft: 8, borderRadius: 12, backgroundColor:'#F1F5F9', shadowColor:'#000', shadowOpacity:0.03, shadowRadius:4, shadowOffset:{width:0,height:2} },
  primaryBtn: { backgroundColor:'#22C55E', borderRadius:14, paddingVertical:14, alignItems:'center', marginTop: 8, shadowColor:'#22C55E', shadowOpacity:0.25, shadowRadius:12, shadowOffset:{width:0,height:6} },
  primaryBtnText: { color:'#fff', fontWeight:'800', letterSpacing:0.4 },
  secondaryBtn: { borderWidth:0, borderColor:'transparent', borderRadius:12, paddingVertical:12, alignItems:'center', marginTop: 8, backgroundColor:'#F1F5F9', shadowColor:'#000', shadowOpacity:0.03, shadowRadius:4, shadowOffset:{width:0,height:2} },
  secondaryBtnText: { color:'#0F172A', fontWeight:'700' },
  rowBetween: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10 },
  rowLabel: { color:'#0F172A', fontWeight:'600' },
  dim: { color:'#64748B' },
  // Chat styles
  msgRow: { borderRadius:12, padding:10, backgroundColor:'#F8FAFC' },
  msgMine: { backgroundColor:'#DCFCE7' },
  msgTheirs: { backgroundColor:'#F1F5F9' },
  msgSender: { fontSize: 12, color:'#64748B', marginBottom: 4 },
  msgText: { fontSize: 14, color:'#0f172a' },
  msgTime: { fontSize: 10, color:'#94A3B8', marginTop: 6 },
  splitCard: { backgroundColor:'#FFF7ED' },
  splitTitle: { fontSize: 14, fontWeight: '700', color:'#7C2D12', marginTop: 4 },
  splitAmount: { fontSize: 16, fontWeight: '800', color:'#7C2D12', marginTop: 2 },
  splitBadge: { backgroundColor:'#FED7AA', paddingHorizontal:8, paddingVertical:2, borderRadius:999 },
  splitBadgeText: { color:'#7C2D12', fontWeight:'800', fontSize: 10 },
  shareLine: { color:'#0f172a' },
  notInvolved: { color:'#6b7280', fontStyle:'italic', marginTop: 6 },
  notice: { marginHorizontal:16, marginTop: 12, backgroundColor:'#ECFDF5', borderRadius:12, paddingVertical:8, paddingHorizontal:12, borderWidth:1, borderColor:'#A7F3D0' },
  noticeText: { color:'#065F46', fontWeight:'700' },
  newBadge: { backgroundColor:'#DBEAFE', paddingHorizontal:8, paddingVertical:2, borderRadius:999 },
  newBadgeText: { color:'#1D4ED8', fontWeight:'800', fontSize:10 },
  unreadBadge: { backgroundColor:'#EF4444', paddingHorizontal:8, paddingVertical:2, borderRadius:999, minWidth:24, alignItems:'center' },
  unreadBadgeText: { color:'#fff', fontWeight:'800', fontSize:10 },
  avatar: { width: 34, height: 34, borderRadius: 999, backgroundColor:'#E5E7EB', alignItems:'center', justifyContent:'center' },
  avatarImg: { width: 34, height: 34, borderRadius: 999, backgroundColor:'#E5E7EB' },
  avatarText: { color:'#0F172A', fontWeight:'800' },
  // Team card styles (company mode) - Modern & Sleek
  teamCard: { 
    backgroundColor:'#FFFFFF', 
    marginHorizontal:16, 
    marginVertical:10, 
    borderRadius:20, 
    padding:20, 
    elevation:4, 
    shadowColor:'#22C55E', 
    shadowOpacity:0.1, 
    shadowRadius:12, 
    shadowOffset:{width:0,height:4},
    borderWidth:0,
    borderLeftWidth:4,
    borderLeftColor:'#22C55E',
    overflow:'hidden'
  },
  teamAvatar: { 
    width: 56, 
    height: 56, 
    borderRadius: 16, 
    backgroundColor:'#EEF2FF',
    borderWidth:2,
    borderColor:'#E0E7FF'
  },
  teamAvatarPlaceholder: { 
    width: 56, 
    height: 56, 
    borderRadius: 16, 
    backgroundColor:'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', 
    alignItems:'center', 
    justifyContent:'center',
    borderWidth:2,
    borderColor:'#E0E7FF'
  },
  teamName: { 
    fontSize:18, 
    fontWeight:'800', 
    color:'#0F172A', 
    letterSpacing:-0.5,
    marginBottom:2
  },
  teamMemberCount: { 
    fontSize:14, 
    color:'#64748B', 
    fontWeight:'600',
    letterSpacing:0.2
  },
  teamUnreadBanner: { 
    flexDirection:'row', 
    alignItems:'center', 
    gap:10, 
    backgroundColor:'#F0F9FF', 
    paddingHorizontal:14, 
    paddingVertical:10, 
    borderRadius:12,
    marginTop:8,
    borderWidth:1,
    borderColor:'#BAE6FD'
  },
  teamUnreadText: { 
    fontSize:14, 
    color:'#0369A1', 
    fontWeight:'700',
    letterSpacing:0.3
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
