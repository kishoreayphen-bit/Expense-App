import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Share, Alert, ActivityIndicator, RefreshControl, Image, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GroupService } from '../api/groupService';
import { api } from '../api/client';
import CompanyIndicator from '../components/CompanyIndicator';
import { useCompany } from '../context/CompanyContext';
import * as ImagePicker from 'expo-image-picker';

export type SplitMode = 'equal' | 'percent' | 'exact';

type Participant = {
  id: string;
  name: string;
  share: string; // percent or exact depending on mode; for equal, ignored
};

export default function SplitScreen() {
  const { activeCompanyId } = useCompany();
  const isCompanyMode = !!activeCompanyId;
  const entityName = isCompanyMode ? 'Team' : 'Group';
  const [amount, setAmount] = useState<string>('0');
  const [mode, setMode] = useState<SplitMode>('equal');
  const [title, setTitle] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: 'You', share: '' },
    { id: '2', name: 'Friend', share: '' },
  ]);

  // Users from backend for selection
  const [users, setUsers] = useState<Array<{ id:number; name:string; email:string }>>([]);
  const [usersQuery, setUsersQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [groupName, setGroupName] = useState(isCompanyMode ? 'My Team' : 'My Split Group');
  const [groupImageUrl, setGroupImageUrl] = useState('');
  const [groupImageLocalUri, setGroupImageLocalUri] = useState<string>('');
  const [showUsers, setShowUsers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const totalAmount = Number(amount) || 0;

  const addParticipant = () => {
    const nextId = String(Date.now());
    setParticipants((prev) => [...prev, { id: nextId, name: `P${prev.length + 1}`, share: '' }]);
  };

  const requestMediaPermission = async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  };

  const pickImage = async () => {
    const ok = await requestMediaPermission();
    if (!ok) { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets && res.assets[0]?.uri) {
      setGroupImageLocalUri(res.assets[0].uri);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const resp = await api.get('/api/v1/users', { params: { query: usersQuery, limit: 50 } });
      const arr = Array.isArray(resp.data) ? resp.data : (resp.data?.items || []);
      setUsers(arr.map((u:any)=> ({ id: u.id, name: u.name || u.email, email: u.email })));
    } catch (e:any) {
      Alert.alert('Error', e?.response?.data?.message || e.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const toggleUser = (uid:number) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const addSelectedAsParticipants = () => {
    const picked = users.filter(u => selectedUserIds.has(u.id));
    if (picked.length === 0) {
      Alert.alert('Select Users', 'Pick at least one user to add');
      return;
    }
    // Merge into participants, avoid duplicates by name/email
    const existingNames = new Set(participants.map(p=>p.name));
    const newOnes: Participant[] = picked
      .filter(u => !existingNames.has(u.name))
      .map(u => ({ id: String(u.id), name: u.name, share: '' }));
    setParticipants(prev => [...prev, ...newOnes]);
    Alert.alert('Added', `${newOnes.length} participant(s) added`);
  };

  const createGroup = async () => {
    try {
      const memberIds = Array.from(selectedUserIds.values());
      if (memberIds.length === 0) {
        Alert.alert('Select Users', 'Pick users to include in the group');
        return;
      }
      const payload = { name: groupName || 'My Split Group', type: 'TEAM', ownerId: undefined, memberIds };
      const resp = await api.post('/api/v1/groups', payload);
      const gid = resp.data?.id;
      Alert.alert('Group created', `Group '${payload.name}' created with ${memberIds.length} member(s). ID: ${gid}`);
    } catch (e:any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'Failed to create group');
    }
  };
  const removeParticipant = (id: string) => {
    if (participants.length <= 1) return;
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };
  const setName = (id: string, name: string) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };
  const setShare = (id: string, share: string) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, share } : p)));
  };

  const computed = useMemo(() => {
    const n = participants.length || 1;
    if (n <= 0) return [] as Array<{ id: string; name: string; value: number }>;
    if (mode === 'equal') {
      const val = n > 0 ? totalAmount / n : 0;
      return participants.map((p) => ({ id: p.id, name: p.name, value: val }));
    }
    if (mode === 'percent') {
      const pctSum = participants.reduce((acc, p) => acc + (Number(p.share) || 0), 0);
      return participants.map((p) => {
        const pct = Number(p.share) || 0;
        const ratio = pctSum > 0 ? pct / pctSum : 0;
        return { id: p.id, name: p.name, value: totalAmount * ratio };
      });
    }
    // exact
    const exactSum = participants.reduce((acc, p) => acc + (Number(p.share) || 0), 0);
    const scale = exactSum > 0 ? totalAmount / exactSum : 0;
    return participants.map((p) => ({ id: p.id, name: p.name, value: (Number(p.share) || 0) * scale }));
  }, [participants, mode, totalAmount]);

  const totalComputed = computed.reduce((acc, c) => acc + c.value, 0);
  const diff = totalAmount - totalComputed;

  const shareSummary = () => (
    `Split: ${title || 'Untitled'}\n` +
    `Amount: ${totalAmount.toFixed(2)}\n` +
    computed.map((c) => `- ${c.name}: ${c.value.toFixed(2)}`).join('\n') +
    (Math.abs(diff) > 0.005 ? `\n(Adjust: ${(diff).toFixed(2)})` : '')
  );

  const onShare = async () => {
    try {
      await Share.share({ message: shareSummary() });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to share split');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Company Indicator */}
      <CompanyIndicator showBackButton={true} showSwitch={false} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async ()=>{ setRefreshing(true); try { if (showUsers) await loadUsers(); } finally { setRefreshing(false); } }} />}
      >
        {/* Info / Mode */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} placeholder="e.g. Dinner at SpiceHub" placeholderTextColor="#94A3B8" value={title} onChangeText={setTitle} />

          <Text style={styles.label}>Amount</Text>
          <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#94A3B8" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

          <Text style={styles.label}>Mode</Text>
          <View style={styles.chipsRow}>
            {(['equal','percent','exact'] as SplitMode[]).map((m)=> (
              <TouchableOpacity key={m} style={[styles.chip, mode===m && styles.chipActive]} onPress={()=>setMode(m)}>
                <Text style={[styles.chipText, mode===m && styles.chipTextActive]}>{m.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Participants */}
        <View style={styles.card}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={styles.cardTitle}>Participants</Text>
            <TouchableOpacity style={styles.chip} onPress={addParticipant}>
              <MaterialIcons name="person-add" size={16} color="#4CAF50" />
              <Text style={styles.chipText}>Add</Text>
            </TouchableOpacity>
          </View>

          {participants.map((p) => (
            <View key={p.id} style={styles.rowBetween}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} value={p.name} onChangeText={(t)=>setName(p.id, t)} placeholder="Name" placeholderTextColor="#94A3B8" />
              {mode === 'percent' && (
                <TextInput style={[styles.input, { width: 90, textAlign: 'right' }]} value={p.share} onChangeText={(t)=>setShare(p.id, t)} keyboardType="decimal-pad" placeholder="%" placeholderTextColor="#94A3B8" />
              )}
              {mode === 'exact' && (
                <TextInput style={[styles.input, { width: 110, textAlign: 'right' }]} value={p.share} onChangeText={(t)=>setShare(p.id, t)} keyboardType="decimal-pad" placeholder="amount" placeholderTextColor="#94A3B8" />
              )}
              <TouchableOpacity onPress={()=>removeParticipant(p.id)}>
                <MaterialIcons name="delete-outline" size={20} color="#D32F2F" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Summary row */}
          <View style={[styles.infoBox, { marginTop: 8 }]}>
            <MaterialIcons name="summarize" size={18} color="#4CAF50" />
            <Text style={styles.infoText}>Total: {totalAmount.toFixed(2)} | Computed: {totalComputed.toFixed(2)} {Math.abs(diff) > 0.005 ? `(adj ${diff.toFixed(2)})` : ''}</Text>
          </View>

          {/* Output preview */}
          <View style={{ marginTop: 8 }}>
            {computed.map((c)=> (
              <View key={c.id} style={styles.rowBetween}>
                <Text style={styles.rowLabel}>{c.name}</Text>
                <Text style={styles.rowValue}>{c.value.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Share */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Share Split</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onShare}>
            <Text style={styles.primaryBtnText}>Share Summary</Text>
          </TouchableOpacity>
        </View>

        {/* User selection & Group creation */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Users</Text>
          {!showUsers ? (
            <View style={{ marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.primaryBtn, { alignSelf:'flex-start', paddingHorizontal: 16 }]}
                onPress={() => { setShowUsers(true); loadUsers(); }}
              >
                {usersLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Load Users</Text>
                )}
              </TouchableOpacity>
              <Text style={[styles.dim, { marginTop: 8 }]}>Tap to fetch users to select for a group.</Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                <Text style={styles.label}>Search</Text>
                <TouchableOpacity onPress={()=>{ setShowUsers(false); }} style={[styles.chip, { paddingVertical: 6, backgroundColor:'#F1F5F9' }]}>
                  <MaterialIcons name="close" size={16} color="#64748B" />
                  <Text style={[styles.chipText, { color:'#64748B' }]}>Close List</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                <TextInput style={[styles.input, { flex:1 }]} value={usersQuery} onChangeText={setUsersQuery} placeholder="name or email" placeholderTextColor="#94A3B8" />
                <TouchableOpacity style={[styles.chip, { height: 44, alignItems:'center' }]} onPress={loadUsers}>
                  {usersLoading ? <ActivityIndicator color="#4CAF50" /> : <MaterialIcons name="search" size={18} color="#4CAF50" />}
                  <Text style={styles.chipText}>Find</Text>
                </TouchableOpacity>
              </View>
              <View style={{ marginTop: 8 }}>
                {(users||[]).map(u => (
                  <TouchableOpacity key={u.id} style={styles.rowBetween} onPress={()=>toggleUser(u.id)}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                      <MaterialIcons name={selectedUserIds.has(u.id)?'check-box':'check-box-outline-blank'} size={18} color={selectedUserIds.has(u.id)?'#4CAF50':'#6b7280'} />
                      <Text style={styles.rowLabel}>{u.name}</Text>
                    </View>
                    <Text style={styles.dim}>{u.email}</Text>
                  </TouchableOpacity>
                ))}
                {(!usersLoading && users.length===0) && <Text style={styles.dim}>No users found. Adjust search and press Find.</Text>}
              </View>
              <View style={{ flexDirection:'row', gap:10, marginTop:8 }}>
                <TouchableOpacity style={[styles.secondaryBtn, { flex:1 }, selectedUserIds.size===0 && { opacity:0.6 }]} disabled={selectedUserIds.size===0} onPress={addSelectedAsParticipants}>
                  <Text style={styles.secondaryBtnText}>Add to Participants</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create {entityName}</Text>
          <Text style={styles.label}>{entityName} Name</Text>
          <TextInput style={styles.input} value={groupName} onChangeText={setGroupName} placeholder={`${entityName} name`} placeholderTextColor="#94A3B8" />
          <Text style={styles.label}>Profile Image</Text>
          {groupImageLocalUri ? (
            <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
              <Image source={{ uri: groupImageLocalUri }} style={{ width: 56, height: 56, borderRadius: 12 }} />
              <TouchableOpacity style={[styles.secondaryBtn, { paddingHorizontal: 12 }]} onPress={()=>setGroupImageLocalUri('')}>
                <Text style={styles.secondaryBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.secondaryBtn, { alignSelf:'flex-start', paddingHorizontal: 12 }]} onPress={pickImage}>
              <MaterialIcons name="image" size={16} color="#0F172A" />
              <Text style={styles.secondaryBtnText}>Pick from device</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.label}>Image URL (optional)</Text>
          <TextInput style={styles.input} value={groupImageUrl} onChangeText={setGroupImageUrl} placeholder="https://..." placeholderTextColor="#94A3B8" />
          <TouchableOpacity style={[styles.primaryBtn, (selectedUserIds.size===0)&&{opacity:0.6}]} disabled={selectedUserIds.size===0} onPress={async ()=>{
            // Override local create path to include imageUrl if backend supports it
            try {
              const memberIds = Array.from(selectedUserIds.values());
              const payload: any = { name: groupName || 'My Split Group', type: 'TEAM', memberIds };
              if (groupImageUrl && groupImageUrl.trim()) payload.imageUrl = groupImageUrl.trim();
              const resp = await api.post('/api/v1/groups', payload);
              const gid = resp?.data?.id;
              // Try to persist image if backend ignores it on create
              if (gid && groupImageUrl && groupImageUrl.trim()) {
                const img = groupImageUrl.trim();
                try { await GroupService.updateGroupImage(Number(gid), img); } catch {}
                // Save locally so the list can overlay it even if server doesn't return it
                try {
                  const AS = require('@react-native-async-storage/async-storage').default;
                  await AS.setItem(`group.imageUrl.${gid}`, img);
                } catch {}
              }
              // If a local image was picked, attempt multipart upload
              if (gid && groupImageLocalUri) {
                try {
                  const form = new FormData();
                  const filename = `group_${gid}.jpg`;
                  const mime = Platform.OS === 'ios' ? 'image/jpeg' : 'image/jpeg';
                  form.append('file', { uri: groupImageLocalUri as any, name: filename, type: mime } as any);
                  try {
                    await api.post(`/api/v1/groups/${gid}/image`, form, { headers: { 'Content-Type': 'multipart/form-data' } } as any);
                  } catch {
                    // Fallback to fetch if axios config is strict
                    await fetch(`${(api as any).defaults?.baseURL || ''}/api/v1/groups/${gid}/image`, { method: 'POST', body: form as any, headers: { 'Content-Type': 'multipart/form-data' } });
                  }
                  // Cache local uri to show immediately
                  try {
                    const AS = require('@react-native-async-storage/async-storage').default;
                    await AS.setItem(`group.imageUrl.${gid}`, groupImageLocalUri);
                  } catch {}
                } catch {}
              }
              Alert.alert(`${entityName} created`, `${payload.name} (#${gid || '?'})`);
              // Notify Groups screen to refresh
              try { const { DeviceEventEmitter } = require('react-native'); DeviceEventEmitter.emit('groups:changed', { groupId: gid }); } catch {}
              // Local reset
              setSelectedUserIds(new Set());
            } catch (e:any) {
              Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to create group');
            }
          }}>
            <Text style={styles.primaryBtnText}>Create {entityName} with Selected</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: 24,
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 0,
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }
  },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.8 },
  input: { 
    borderWidth: 2, 
    borderColor: '#E0E7FF', 
    borderRadius: 16, 
    padding: 16, 
    backgroundColor: '#FFFFFF', 
    marginVertical: 8, 
    color: '#0F172A', 
    fontSize: 16, 
    fontWeight: '600', 
    shadowColor: '#6366F1', 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    shadowOffset: { width: 0, height: 4 } 
  },
  label: { 
    color: '#6366F1', 
    fontSize: 12, 
    marginTop: 12, 
    marginBottom: 8, 
    fontWeight: '700', 
    letterSpacing: 0.8, 
    textTransform: 'uppercase' 
  },
  card: { 
    backgroundColor: '#FFFFFF', 
    margin: 16, 
    marginTop: 12,
    borderRadius: 24, 
    padding: 20, 
    elevation: 3, 
    shadowColor: '#22C55E', 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    shadowOffset: { width: 0, height: 4 },
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E'
  },
  cardTitle: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#0F172A', 
    marginBottom: 12, 
    letterSpacing: -0.6 
  },
  refreshBtn: { 
    padding: 10, 
    borderRadius: 12, 
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  chipsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginVertical: 8 
  },
  chip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 16, 
    borderWidth: 2, 
    borderColor: '#E0E7FF', 
    backgroundColor: '#F8FAFC', 
    shadowColor: '#6366F1', 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    shadowOffset: { width: 0, height: 2 } 
  },
  chipActive: { 
    backgroundColor: '#6366F1', 
    borderColor: '#6366F1',
    shadowColor: '#6366F1', 
    shadowOpacity: 0.3, 
    shadowRadius: 12, 
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  chipText: { color: '#475569', fontWeight: '700', fontSize: 14 },
  chipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  rowBetween: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    gap: 12,
    paddingVertical: 4
  },
  rowLabel: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  rowValue: { color: '#0F172A', fontWeight: '800', fontSize: 16 },
  infoBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    backgroundColor: '#F0F9FF', 
    padding: 14, 
    borderRadius: 16, 
    shadowColor: '#0EA5E9', 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  infoText: { color: '#0369A1', fontWeight: '700', fontSize: 14 },
  primaryBtn: { 
    backgroundColor: '#6366F1', 
    borderRadius: 16, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginTop: 12, 
    shadowColor: '#6366F1', 
    shadowOpacity: 0.4, 
    shadowRadius: 16, 
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  secondaryBtn: { 
    borderWidth: 2, 
    borderColor: '#E0E7FF', 
    borderRadius: 16, 
    paddingVertical: 14, 
    alignItems: 'center', 
    marginTop: 12, 
    backgroundColor: '#F8FAFC', 
    shadowColor: '#6366F1', 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    shadowOffset: { width: 0, height: 4 } 
  },
  secondaryBtnText: { color: '#6366F1', fontWeight: '800', fontSize: 15 },
  dim: { color: '#94A3B8', fontSize: 13 },
});
