import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Platform, ToastAndroid, Alert, Modal, TextInput, StatusBar, DeviceEventEmitter, Image, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Group, GroupService, UserSummary } from '../api/groupService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getLastMemberIds, setLastMemberIds } from '../state/groupMeta';
import * as ImagePicker from 'expo-image-picker';

export default function GroupInfoScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const groupId = route.params?.groupId as number;
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER' | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<UserSummary[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const g = await GroupService.getGroup(groupId);
      setGroup(g);
      setNameInput(g?.name || '');
      setDescInput(g?.description || '');
      // Determine current user's role in this group
      try {
        const myEmail = (user?.email || (user as any)?.sub || '').toString().toLowerCase();
        let role: 'OWNER' | 'ADMIN' | 'MEMBER' | null = null;
        const you = (g?.members || []).find(m => (m.email || '').toLowerCase() === myEmail);
        const r = (you?.role || '').toUpperCase();
        if (r === 'OWNER') role = 'OWNER';
        else if (r === 'ADMIN') role = 'ADMIN';
        else role = you ? 'MEMBER' : null;
        setCurrentRole(role);
      } catch {}
      setLoading(false);
      try {
        const currentIds = (g?.members || []).map(m => m.id);
        const lastIds = await getLastMemberIds(groupId);
        const newIds = currentIds.filter(id => !lastIds.includes(id));
        if (newIds.length > 0) {
          const currentUserId = (() => {
            const idLike = (user && (user.id || (user as any).userId || (user as any).sub)) ?? null;
            const n = typeof idLike === 'string' ? parseInt(idLike as any, 10) : idLike;
            return Number.isFinite(n as any) ? (n as number) : null;
          })();
          const youAdded = currentUserId != null && newIds.includes(currentUserId);
          const msg = youAdded ? 'You were added to this group' : 'New member(s) added to this group';
          if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
          else Alert.alert('Group Update', msg);
        }
        await setLastMemberIds(groupId, currentIds);
      } catch {}
    };
    load();
  }, [groupId]);

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
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!res.canceled && res.assets && res.assets[0]?.uri) {
      setLocalImageUri(res.assets[0].uri);
    }
  };

  const saveDetails = async () => {
    if (!group) return;
    setSaving(true);
    try {
      const nameChanged = nameInput.trim() && nameInput.trim() !== (group.name || '').trim();
      const descChanged = (descInput || '') !== (group.description || '');
      if (nameChanged || descChanged) {
        await GroupService.updateGroup(groupId, { name: nameInput.trim(), description: descInput });
      }
      if (localImageUri) {
        // Upload multipart to common endpoints; let RN set the boundary (avoid manual Content-Type)
        const apiMod = await import('../api/client');
        const baseURL = (apiMod.api as any).defaults?.baseURL || '';
        const attempts: Array<{ url: string; field: string; via: 'axios' | 'fetch' }>= [
          { url: `/api/v1/groups/${groupId}/image`, field: 'file', via: 'axios' },
          { url: `/api/v1/groups/${groupId}/image`, field: 'image', via: 'axios' },
          { url: `/api/v1/groups/${groupId}/upload`, field: 'file', via: 'axios' },
          { url: `/api/v1/groups/${groupId}/image`, field: 'file', via: 'fetch' },
          { url: `/api/v1/groups/${groupId}/image`, field: 'image', via: 'fetch' },
        ];
        let uploaded = false;
        for (const a of attempts) {
          try {
            const fd = new FormData();
            fd.append(a.field, { uri: localImageUri as any, name: `group_${groupId}.jpg`, type: 'image/jpeg' } as any);
            if (a.via === 'axios') {
              await (apiMod.api as any).post(a.url, fd as any, { timeout: 20000 } as any);
            } else {
              await fetch(`${baseURL}${a.url}`, { method: 'POST', body: fd as any });
            }
            uploaded = true;
            break;
          } catch (e) {
            // try next
          }
        }
        if (uploaded) {
          try {
            const AS = require('@react-native-async-storage/async-storage').default;
            await AS.setItem(`group.imageUrl.${groupId}`, localImageUri);
          } catch {}
        }
      }
      const updated = await GroupService.getGroup(groupId);
      setGroup(updated);
      setLocalImageUri('');
      try { DeviceEventEmitter.emit('groups:changed', { action: 'update', groupId }); } catch {}
      if (Platform.OS === 'android') ToastAndroid.show('Group updated', ToastAndroid.SHORT); else Alert.alert('Success', 'Group updated');
    } catch (e:any) {
      Alert.alert('Error', e?.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const exitGroup = async () => {
    if (!group) return;
    Alert.alert('Exit Group', `Leave "${group?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: async () => {
        const ok = await GroupService.leaveGroup(groupId);
        if (ok) {
          try { DeviceEventEmitter.emit('groups:changed', { action: 'leave', groupId }); } catch {}
          navigation.goBack();
          if (Platform.OS === 'android') ToastAndroid.show('Exited group', ToastAndroid.SHORT); else Alert.alert('Done', 'Exited group');
        } else {
          Alert.alert('Error', 'Failed to exit group');
        }
      }}
    ]);
  };

  const deleteForMe = async () => {
    if (!group) return;
    Alert.alert('Delete For Me', `Remove "${group?.name}" for you only?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const ok = await GroupService.deleteGroupForMe(groupId);
        if (ok) {
          try { DeviceEventEmitter.emit('groups:changed', { action: 'deleteForMe', groupId }); } catch {}
          navigation.goBack();
          if (Platform.OS === 'android') ToastAndroid.show('Deleted for you', ToastAndroid.SHORT); else Alert.alert('Done', 'Deleted for you');
        } else {
          Alert.alert('Error', 'Failed to delete for you');
        }
      }}
    ]);
  };

  const deleteGroupOwner = async () => {
    if (!group) return;
    Alert.alert('Delete Group', `Permanently delete "${group?.name}" for everyone?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const ok = await GroupService.deleteGroup(groupId);
        if (ok) {
          try { DeviceEventEmitter.emit('groups:changed', { action: 'delete', groupId }); } catch {}
          navigation.goBack();
          if (Platform.OS === 'android') ToastAndroid.show('Group deleted', ToastAndroid.SHORT); else Alert.alert('Done', 'Group deleted');
        } else {
          Alert.alert('Error', 'Failed to delete group');
        }
      }}
    ]);
  };

  const removeMember = async (userId: number) => {
    try {
      await GroupService.removeMember(groupId, userId);
      if (Platform.OS === 'android') ToastAndroid.show('Member removed', ToastAndroid.SHORT);
      else Alert.alert('Success', 'Member removed');
      const g = await GroupService.getGroup(groupId);
      setGroup(g);
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      if (Platform.OS === 'android') ToastAndroid.show(err.message || 'Failed to remove member', ToastAndroid.SHORT);
      else Alert.alert('Error', err.message || 'Failed to remove member');
    }
  };

  const toggleAdmin = async (userId: number, toAdmin: boolean) => {
    try {
      await GroupService.updateMemberRole(groupId, userId, toAdmin ? 'ADMIN' : 'MEMBER');
      if (Platform.OS === 'android') ToastAndroid.show(toAdmin ? 'Promoted to admin' : 'Demoted to member', ToastAndroid.SHORT);
      else Alert.alert('Success', toAdmin ? 'Promoted to admin' : 'Demoted to member');
      const g = await GroupService.getGroup(groupId);
      setGroup(g);
    } catch (err: any) {
      console.error('Failed to update role:', err);
      if (Platform.OS === 'android') ToastAndroid.show(err.message || 'Failed to update role', ToastAndroid.SHORT);
      else Alert.alert('Error', err.message || 'Failed to update role');
    }
  };

  const loadAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const allUsers = await GroupService.listUsers('', 50);
      const currentMemberIds = (group?.members || []).map(m => m.id);
      const available = allUsers.filter(u => !currentMemberIds.includes(u.id));
      setAvailableUsers(available);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const addMember = async (userId: number) => {
    setAddingMember(true);
    try {
      await GroupService.addMember(groupId, userId);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Member added successfully', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Member added successfully');
      }
      setShowAddMember(false);
      // Reload group
      const g = await GroupService.getGroup(groupId);
      setGroup(g);
    } catch (err: any) {
      console.error('Failed to add member:', err);
      if (Platform.OS === 'android') {
        ToastAndroid.show(err.message || 'Failed to add member', ToastAndroid.SHORT);
      } else {
        Alert.alert('Error', err.message || 'Failed to add member');
      }
    } finally {
      setAddingMember(false);
    }
  };

  const renderMember = ({ item }: { item: UserSummary }) => {
    return (
      <View style={styles.memberRow}>
        <View style={styles.avatar}><Text style={styles.avatarTxt}>{(item.name || '?').charAt(0).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <Text style={styles.memberName}>{item.name}</Text>
            <View style={{ flexDirection:'row', alignItems:'center', gap: 8 }}>
              {!!item.role && (
                <Text style={[styles.roleBadge, item.role?.toUpperCase()==='OWNER' && styles.roleOwner, item.role?.toUpperCase()==='ADMIN' && styles.roleAdmin]}>
                  {item.role?.toUpperCase()}
                </Text>
              )}
              {(() => {
                const roleUpper = (item.role || 'MEMBER').toUpperCase();
                const isOwner = roleUpper === 'OWNER';
                const isAdmin = roleUpper === 'ADMIN';
                const meRole = currentRole;
                const canOwnerAct = meRole === 'OWNER';
                const canAdminAct = meRole === 'ADMIN';
                const canRemove = (canOwnerAct && !isOwner) || (canAdminAct && !isOwner && !isAdmin);
                const canPromote = ((canOwnerAct || canAdminAct) && !isOwner && !isAdmin);
                const canDemote = (canOwnerAct && isAdmin);
                return (
                  <View style={{ flexDirection:'row', alignItems:'center' }}>
                    {canPromote && (
                      <TouchableOpacity style={styles.iconBtn} onPress={() => toggleAdmin(item.id, true)}>
                        <MaterialIcons name="admin-panel-settings" size={18} color="#065F46" />
                      </TouchableOpacity>
                    )}
                    {canDemote && (
                      <TouchableOpacity style={styles.iconBtn} onPress={() => toggleAdmin(item.id, false)}>
                        <MaterialIcons name="block" size={18} color="#1D4ED8" />
                      </TouchableOpacity>
                    )}
                    {canRemove && (
                      <TouchableOpacity style={styles.iconBtn} onPress={() => removeMember(item.id)}>
                        <MaterialIcons name="delete-outline" size={18} color="#B91C1C" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </View>
          </View>
          <Text style={styles.memberEmail}>{item.email}</Text>
          {(() => {
            const roleUpper = (item.role || 'MEMBER').toUpperCase();
            const isOwner = roleUpper === 'OWNER';
            const isAdmin = roleUpper === 'ADMIN';
            const meRole = currentRole;
            const canOwnerAct = meRole === 'OWNER';
            const canAdminAct = meRole === 'ADMIN';
            // Action rules
            let showRemove = false;
            let showPromote = false;
            let showDemote = false;
            if (canOwnerAct) {
              // Owner: can remove anyone except owner; can promote/demote ADMIN/MEMBER
              showRemove = !isOwner;
              showPromote = !isOwner && !isAdmin; // promote member to admin
              showDemote = !isOwner && isAdmin;   // demote admin to member
            } else if (canAdminAct) {
              // Admin: can remove MEMBERs only; can promote MEMBERs to ADMIN
              showRemove = !isOwner && !isAdmin;
              showPromote = !isOwner && !isAdmin;
              showDemote = false; // cannot demote admins
            }
            if (!(showRemove || showPromote || showDemote)) return null;
            return (
              <View style={styles.memberActions}>
                {showRemove && (
                  <TouchableOpacity style={[styles.actionBtn, styles.removeBtn]} onPress={() => removeMember(item.id)}>
                    <Text style={[styles.actionText, styles.removeText]}>Remove</Text>
                  </TouchableOpacity>
                )}
                {showPromote && (
                  <TouchableOpacity style={[styles.actionBtn, styles.promoteBtn]} onPress={() => toggleAdmin(item.id, true)}>
                    <Text style={[styles.actionText, styles.promoteText]}>Make admin</Text>
                  </TouchableOpacity>
                )}
                {showDemote && (
                  <TouchableOpacity style={[styles.actionBtn, styles.demoteBtn]} onPress={() => toggleAdmin(item.id, false)}>
                    <Text style={[styles.actionText, styles.demoteText]}>Remove admin</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}
        </View>
      </View>
    );
  };

  const renderAvailableUser = ({ item }: { item: UserSummary }) => {
    return (
      <TouchableOpacity 
        style={styles.userRow} 
        onPress={() => addMember(item.id)}
        disabled={addingMember}
      >
        <View style={styles.avatar}><Text style={styles.avatarTxt}>{(item.name || '?').charAt(0).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
        </View>
        <MaterialIcons name="add-circle" size={24} color="#4CAF50" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>{group?.name || 'Group Info'}</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} color="#4CAF50" />
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.heroCard}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
              {(localImageUri || group?.imageUrl) ? (
                <Image source={{ uri: localImageUri || (group?.imageUrl as string) }} style={{ width:50, height:50, borderRadius:12, backgroundColor:'#E5E7EB' }} />
              ) : (
                <View style={{ width:50, height:50, borderRadius:12, backgroundColor:'#E5E7EB', alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ fontSize:20, fontWeight:'800', color:'#0F172A' }}>{(group?.name||'?').trim().charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex:1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.heroTitle}>{group?.name}</Text>
                <Text style={styles.infoSub}>{group?.members?.length || 0} members</Text>
                <TouchableOpacity onPress={pickImage} style={styles.linkBtn}>
                  <Text style={styles.linkBtnText}>{localImageUri ? 'Change selected photo' : 'Change photo'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Group Details</Text>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput style={styles.input} value={nameInput} onChangeText={setNameInput} placeholder="Group name" placeholderTextColor="#94A3B8" />
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              value={descInput}
              onChangeText={setDescInput}
              placeholder="Add a description for members"
              placeholderTextColor="#94A3B8"
              multiline
            />
            <TouchableOpacity disabled={saving} onPress={saveDetails} style={[styles.primaryBtn, saving && { opacity: 0.6 }]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
              <Text style={styles.infoTitle}>Members</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap: 8 }}>
                <Text style={styles.infoSub}>{group?.members?.length || 0} total</Text>
                <TouchableOpacity onPress={() => { setShowAddMember(true); loadAvailableUsers(); }} style={styles.addBtn}>
                  <MaterialIcons name="person-add" size={18} color="#22C55E" />
                </TouchableOpacity>
              </View>
            </View>
            <FlatList
              data={group?.members || []}
              keyExtractor={(m) => String(m.id)}
              renderItem={renderMember}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              scrollEnabled={false}
            />
          </View>
          <View style={[styles.infoCard, { marginBottom: 8, paddingVertical: 6, paddingHorizontal: 10 }]}>
            <Text style={styles.infoTitle}>Group Actions</Text>
            <View style={{ marginTop: 6 }}>
              <TouchableOpacity onPress={deleteForMe} style={{ paddingVertical: 10 }}>
                <Text style={[styles.linkBtnText, { color:'#0F172A' }]}>Delete for me</Text>
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: '#E5E7EB' }} />
              <TouchableOpacity onPress={exitGroup} style={{ paddingVertical: 10 }}>
                <Text style={[styles.linkBtnText, { color:'#92400E' }]}>Exit group</Text>
              </TouchableOpacity>
              {(currentRole === 'OWNER') && (
                <>
                  <View style={{ height: 1, backgroundColor: '#E5E7EB' }} />
                  <TouchableOpacity onPress={deleteGroupOwner} style={{ paddingVertical: 10 }}>
                    <Text style={[styles.linkBtnText, { color:'#B91C1C' }]}>Delete group</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Add Member Modal */}
      <Modal visible={showAddMember} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Member</Text>
              <TouchableOpacity onPress={() => setShowAddMember(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            {loadingUsers ? (
              <ActivityIndicator style={{ marginTop: 20 }} color="#4CAF50" />
            ) : (
              <FlatList
                data={availableUsers}
                keyExtractor={(u) => String(u.id)}
                renderItem={renderAvailableUser}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: '#6b7280', marginTop: 20 }}>
                    No users available to add
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor:'#F1F5F9' },
  header: { 
    flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:10,
    paddingTop: Platform.OS === 'android' ? ((StatusBar.currentHeight || 0) + 6) : 10,
    backgroundColor:'rgba(255,255,255,0.95)',
    borderBottomWidth:0,
    shadowColor:'#0f172a', shadowOpacity:0.04, shadowRadius:12, shadowOffset:{width:0,height:4}, elevation:4
  },
  iconBtn: { padding: 6, borderRadius: 10, backgroundColor:'#F1F5F9' },
  title: { fontSize: 16, fontWeight:'800', color:'#0F172A', flex: 1, textAlign:'center', letterSpacing:-0.2 },
  content: { padding: 12 },
  heroCard: { backgroundColor:'rgba(255,255,255,0.98)', padding:12, borderRadius:12, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor:'#E5E7EB' },
  heroTitle: { fontSize: 16, fontWeight:'800', color:'#0F172A', marginTop: 0, letterSpacing:-0.15 },
  heroAvatarWrap: { }, heroAvatarShadow: { }, heroAvatarBg: { }, heroAvatarImgWrap: { },
  infoCard: { backgroundColor:'rgba(255,255,255,0.98)', padding:11, borderRadius:12, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor:'#E5E7EB' },
  infoTitle: { fontSize: 14, fontWeight:'800', color:'#0F172A' },
  infoSub: { fontSize: 11, color:'#64748B', marginTop: 1 },
  addBtn: { padding: 6, borderRadius: 10, backgroundColor: '#ECFDF5' },
  memberRow: { flexDirection:'row', alignItems:'center', paddingVertical: 5 },
  userRow: { flexDirection:'row', alignItems:'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F8FAFC', marginBottom: 5 },
  avatar: { width:32, height:32, borderRadius:999, backgroundColor:'#E5E7EB', alignItems:'center', justifyContent:'center', marginRight: 8 },
  avatarTxt: { color:'#0F172A', fontWeight:'800', fontSize: 12 },
  memberName: { color:'#0F172A', fontWeight:'600', fontSize: 13 },
  memberEmail: { color:'#6b7280', fontSize: 11 },
  roleBadge: { fontSize: 10, color:'#0f172a', backgroundColor:'#e2e8f0', paddingVertical:2, paddingHorizontal:6, borderRadius:999, overflow:'hidden' },
  roleOwner: { backgroundColor:'#fde68a', color:'#92400e' },
  roleAdmin: { backgroundColor:'#bbf7d0', color:'#065f46' },
  memberActions: { flexDirection:'row', alignItems:'center', marginTop: 5, gap: 6 },
  actionBtn: { paddingVertical:5, paddingHorizontal:8, borderRadius:8, borderWidth: StyleSheet.hairlineWidth },
  actionText: { fontSize: 11, fontWeight:'600' },
  removeBtn: { backgroundColor:'#FEF2F2', borderColor:'#FEE2E2' },
  removeText: { color:'#B91C1C' },
  promoteBtn: { backgroundColor:'#ECFDF5', borderColor:'#D1FAE5' },
  promoteText: { color:'#065F46' },
  demoteBtn: { backgroundColor:'#EFF6FF', borderColor:'#DBEAFE' },
  demoteText: { color:'#1D4ED8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'rgba(255,255,255,0.98)', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 14, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  // Action chips
  actionChip: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1 },
  actionChipTxt: { fontWeight: '700', fontSize: 11.5 },
  neutralChip: { backgroundColor:'transparent', borderColor:'#E5E7EB' },
  neutralTxt: { color:'#0F172A' },
  warnChip: { backgroundColor:'transparent', borderColor:'#FDE68A' },
  warnTxt: { color:'#92400E' },
  dangerChip: { backgroundColor:'transparent', borderColor:'#FECACA' },
  dangerTxt: { color:'#B91C1C' },
  // Form styles
  fieldLabel: { marginTop: 6, marginBottom: 4, color:'#0F172A', fontWeight:'700', fontSize: 12 },
  input: { backgroundColor:'#F8FAFC', borderRadius:9, paddingHorizontal:10, paddingVertical:8, color:'#0F172A', borderWidth:1, borderColor:'#E5E7EB', fontSize: 13 },
  primaryBtn: { backgroundColor:'#22C55E', borderRadius:9, alignItems:'center', paddingVertical:10, marginTop: 10 },
  primaryBtnText: { color:'#fff', fontWeight:'800', fontSize: 13 },
  smallBtn: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#EEF2FF', borderRadius:999, paddingHorizontal:10, paddingVertical:5, marginTop: 6 },
  smallBtnText: { color:'#0F172A', fontWeight:'700', fontSize: 12 },
  linkBtn: { paddingVertical: 2 },
  linkBtnText: { color:'#2563EB', fontWeight:'700', fontSize: 12 },
});
