import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { Group, GroupService, UserSummary, Message } from '../api/groupService';
import { addPendingMessage } from '../state/pendingMessages';
import { addLocalMessage } from '../state/localMessages';

export default function SplitMembersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const groupId = route.params?.groupId as number;
  const draft = route.params?.draft as { title: string; totalAmount: number; currency: string; paidByUserId?: number | null; members?: Array<{ id:number; name:string; email:string }> };

  const [group, setGroup] = useState<Group | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // 1) Prefer members passed via draft
      const passed = draft?.members as Array<{ id:number; name:string; email:string }> | undefined;
      if (passed && passed.length > 0) {
        const g: Group = { id: groupId, name: 'Group', members: passed } as Group;
        setGroup(g);
        setSelected(new Set<number>(passed.map(m=>m.id)));
        setLoading(false);
        return;
      }
      // 2) Otherwise fetch group and fallback to demo users
      let g = await GroupService.getGroup(groupId);
      if (!g || !g.members || g.members.length === 0) {
        const demoUsers = await GroupService.listUsers('', 10);
        g = { id: groupId, name: g?.name || 'Group', members: demoUsers } as Group;
      }
      setGroup(g);
      const ids = new Set<number>((g?.members || []).map(m => m.id));
      setSelected(ids);
      setLoading(false);
    })();
  }, [groupId, draft]);

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const members = group?.members || [];
  const involvedIds = useMemo(() => Array.from(selected.values()), [selected]);

  // Split helper: even split with remainder distribution to ensure exact total
  const computeEvenShares = (total: number, userIds: number[], decimals = 2) => {
    const n = userIds.length;
    if (n === 0) return new Map<number, number>();
    const factor = Math.pow(10, decimals);
    const rawPer = total / n;
    const base = Math.floor(rawPer * factor) / factor; // truncate to decimals
    let remainingUnits = Math.round((total - base * n) * factor); // number of smallest units to distribute
    const result = new Map<number, number>();
    userIds.forEach((uid, idx) => {
      const add = remainingUnits > 0 ? 1 : 0;
      const amt = (base * factor + add) / factor;
      result.set(uid, amt);
      if (remainingUnits > 0) remainingUnits -= 1;
    });
    return result;
  };

  const sharesPreview = useMemo(() => computeEvenShares(draft.totalAmount, involvedIds, 2), [draft.totalAmount, involvedIds]);

  const done = async () => {
    if (involvedIds.length === 0) return;
    const split = {
      title: draft.title,
      totalAmount: draft.totalAmount,
      currency: draft.currency,
      paidByUserId: draft.paidByUserId ?? null,
      involvedUserIds: involvedIds,
      shares: involvedIds.map(uid => ({ userId: uid, amount: sharesPreview.get(uid) || 0 })),
    };
    const msg = await GroupService.createSplitMessage(groupId, split);
    // Generate strong unique ids to avoid de-dup collisions
    const uniq = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const fallbackId = `local-${uniq}`;
    const fallbackSplitId = Date.now() + Math.floor(Math.random()*1000);
    // Optimistic message to display in chat immediately if backend doesn't echo
    const optimistic: Message = (msg && (msg as any).split) ? ({
      ...msg,
      id: (msg as any).id ?? fallbackId,
      createdAt: (msg as any).createdAt ?? new Date().toISOString(),
      split: {
        ...(msg as any).split,
        id: (msg as any).split?.id ?? fallbackSplitId,
      },
    } as Message) : {
      id: fallbackId,
      groupId,
      sender: { id: 0, name: 'You', email: '' },
      type: 'split' as const,
      createdAt: new Date().toISOString(),
      split: { id: fallbackSplitId, ...split },
    };
    console.log('[SplitMembers] Created optimistic split message:', optimistic);
    // Stash in a persistent buffer in case navigation or reload timing drops it
    addPendingMessage(groupId, optimistic);
    // Persist locally so it remains after navigating away and back
    addLocalMessage(groupId, optimistic);
    // Fire a global event as well (redundancy)
    console.log('[SplitMembers] Emitting group:newMessage');
    DeviceEventEmitter.emit('group:newMessage', optimistic);
    // Navigate back to chat; pass newMessage so chat appends without waiting on reload
    console.log('[SplitMembers] Navigating to GroupChat with newMessage');
    navigation.dispatch(CommonActions.navigate({ name: 'GroupChat', params: { groupId, newMessage: optimistic } }));
    // Extra safety: emit again after a short delay in case screen mounts after first emit
    setTimeout(() => {
      console.log('[SplitMembers] Re-emitting group:newMessage after delay');
      DeviceEventEmitter.emit('group:newMessage', optimistic);
    }, 250);
  };

  const renderMember = ({ item }: { item: UserSummary }) => {
    const displayName = item.name || item.email || `User #${item.id}`;
    const isSel = selected.has(item.id);
    const amt = sharesPreview.get(item.id) ?? 0;
    return (
      <TouchableOpacity style={styles.memberRow} onPress={() => toggle(item.id)}>
        <MaterialIcons name={isSel ? 'check-box' : 'check-box-outline-blank'} size={20} color={isSel ? '#4CAF50' : '#6b7280'} />
        <Text style={styles.memberName}>{displayName}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.amountText}>₹{amt.toFixed(2)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Select Members</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Total Amount</Text>
        <Text style={styles.total}>₹ {draft.totalAmount.toFixed(2)} {draft.currency}</Text>

        <Text style={[styles.label, { marginTop: 8 }]}>Split by</Text>
        <View style={styles.tabsRow}>
          <View style={[styles.tab, styles.tabActive]}><Text style={[styles.tabText, styles.tabTextActive]}>Amount</Text></View>
          <View style={styles.tab}><Text style={styles.tabText}>Share</Text></View>
          <View style={styles.tab}><Text style={styles.tabText}>Percent</Text></View>
        </View>

        <View style={styles.equalRow}>
          <MaterialIcons name="done-all" size={18} color="#4CAF50" />
          <Text style={styles.equalText}>Split Equally</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.equalText}>{involvedIds.length}/{members.length} Selected</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#4CAF50" style={{ marginTop: 12 }} />
        ) : (
          <>
            {members.length === 0 ? (
              <View style={{ marginTop: 12 }}>
                <Text style={{ color:'#6b7280' }}>No members found for this group.</Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 8 }]}
                  onPress={async () => {
                    const demoUsers = await GroupService.listUsers('', 10);
                    const g: Group = { id: groupId, name: 'Demo Group', members: demoUsers } as Group;
                    setGroup(g);
                    const ids = new Set<number>(demoUsers.map(u=>u.id));
                    setSelected(ids);
                  }}
                >
                  <Text style={styles.primaryBtnText}>Load demo members</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={members}
                keyExtractor={(m) => String(m.id)}
                renderItem={renderMember}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                contentContainerStyle={{ paddingVertical: 8 }}
              />
            )}
          </>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.primaryBtn, involvedIds.length === 0 && { opacity: 0.6 }]} disabled={involvedIds.length === 0} onPress={done}>
          <Text style={styles.primaryBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor:'#fff' },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#F1F5F9' },
  iconBtn: { padding: 6, borderRadius: 8 },
  title: { fontSize: 16, fontWeight:'800', color:'#111827', flex:1, textAlign:'center' },
  content: { padding: 16, flex: 1 },
  label: { color:'#6b7280', fontSize: 12, marginTop: 6, marginBottom: 4 },
  total: { color:'#111827', fontWeight:'800', fontSize: 18 },
  tabsRow: { flexDirection:'row', alignItems:'center', gap: 8, marginVertical: 8 },
  tab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor:'#F1F5F9' },
  tabActive: { backgroundColor:'#4CAF50' },
  tabText: { color:'#6b7280' },
  tabTextActive: { color:'#fff', fontWeight:'800' },
  equalRow: { flexDirection:'row', alignItems:'center', gap: 8, paddingVertical: 6 },
  equalText: { color:'#111827' },
  memberRow: { flexDirection:'row', alignItems:'center', gap: 10, backgroundColor:'#F8FAFC', padding: 10, borderRadius: 10 },
  memberName: { color:'#111827', fontWeight:'600' },
  amountText: { color:'#111827', fontWeight:'700' },
  footer: { padding: 16, borderTopWidth:1, borderTopColor:'#F1F5F9' },
  primaryBtn: { backgroundColor:'#7C3AED', borderRadius:12, paddingVertical:12, alignItems:'center' },
  primaryBtnText: { color:'#fff', fontWeight:'800' },
});
