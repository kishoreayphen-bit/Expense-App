import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Modal, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../components/ThemeView';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GroupService } from '../api/groupService';

export default function SplitCreateScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const groupId = route.params?.groupId as number;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState('INR');
  const [paidByUserId, setPaidByUserId] = useState<number | null>(null);
  const [members, setMembers] = useState<Array<{ id:number; name:string; email:string }>>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const canNext = useMemo(() => Number(amount) > 0, [amount]);

  // Helper to sanitize incoming members (ensure id, fallback labels)
  const sanitizeMembers = (arr: Array<{ id?: number; name?: string; email?: string }> | undefined) => {
    const list = (arr || []).map((m, idx) => ({
      id: typeof m.id === 'number' && isFinite(m.id) ? m.id : -(idx + 1),
      name: (m.name as string) || '',
      email: (m.email as string) || '',
    }));
    return list;
  };

  const uniqueMerge = (a: Array<{id:number;name:string;email:string}>, b: Array<{id:number;name:string;email:string}>) => {
    const map = new Map<number, {id:number;name:string;email:string}>();
    [...a, ...b].forEach(u => { map.set(u.id, u); });
    return Array.from(map.values());
  };

  useEffect(() => {
    (async () => {
      // prefer preloaded members from navigation params
      const pre = (route.params as any)?.members as Array<{ id:number; name:string; email:string }> | undefined;
      if (pre && pre.length > 0) {
        let sanitized = sanitizeMembers(pre);
        // If only one member, try to augment from backend for a better list
        if (sanitized.length < 2 && groupId) {
          const g = await GroupService.getGroup(groupId);
          const more = sanitizeMembers(g?.members as any);
          if (more.length < 2) {
            const extra = sanitizeMembers(await GroupService.listUsers('', 10) as any);
            sanitized = uniqueMerge(sanitized, extra);
          } else {
            sanitized = uniqueMerge(sanitized, more);
          }
        }
        setMembers(sanitized);
        if (!paidByUserId) setPaidByUserId(sanitized[0].id);
        return;
      }
      // Only fetch group if groupId is valid
      if (groupId) {
        const g = await GroupService.getGroup(groupId);
        let list = sanitizeMembers(g?.members as any);
        if (!list || list.length === 0) {
          // final fallback: load demo users so UI is usable
          list = sanitizeMembers(await GroupService.listUsers('', 10) as any);
        }
        setMembers(list);
        if (!paidByUserId && list.length > 0) setPaidByUserId(list[0].id);
      } else {
        // No groupId: load users list for new split
        const list = sanitizeMembers(await GroupService.listUsers('', 10) as any);
        setMembers(list);
        if (!paidByUserId && list.length > 0) setPaidByUserId(list[0].id);
      }
    })();
  }, [groupId]);

  const goNext = () => {
    if (!canNext) return;
    navigation.navigate('SplitMembers', {
      groupId,
      draft: {
        title: title.trim() || 'Untitled',
        totalAmount: Number(amount) || 0,
        currency: currency.trim() || 'INR',
        paidByUserId,
        members,
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Split expense with</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Total Amount</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1, marginRight: 8, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} placeholder="0.00" placeholderTextColor={theme.textDim} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <TextInput style={[styles.input, { width: 110, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} placeholder="INR" placeholderTextColor={theme.textDim} value={currency} onChangeText={setCurrency} />
        </View>

        <Text style={styles.label}>What is this expense for?</Text>
        <TextInput style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} placeholder="e.g. Dinner" placeholderTextColor={theme.textDim} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Paid by</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={async () => {
            if (!members || members.length === 0) {
              setLoadingMembers(true);
              let list = sanitizeMembers(((route.params as any)?.members) as any);
              if (!list || list.length === 0) {
                const g = await GroupService.getGroup(groupId);
                list = sanitizeMembers(g?.members as any);
              }
              if (!list || list.length === 0) {
                list = sanitizeMembers(await GroupService.listUsers('', 10) as any);
              }
              setMembers(list);
              if (!paidByUserId && list.length > 0) setPaidByUserId(list[0].id);
              setLoadingMembers(false);
            }
            setPickerOpen(true);
          }}
        >
          <MaterialIcons name="person" size={18} color={theme.textDim} />
          <Text style={[styles.selectorText, { color: theme.text }]}>{(() => { const sel = members.find(m=>m.id===paidByUserId); return sel ? (sel.name || sel.email || `User #${sel.id}`) : 'You'; })()}</Text>
          <MaterialIcons name="arrow-drop-down" size={18} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }, !canNext && { opacity: 0.6 }]} disabled={!canNext} onPress={goNext}>
          <Text style={styles.primaryBtnText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Payer picker */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={()=>setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Payer ({members.length})</Text>
              <TouchableOpacity onPress={()=>setPickerOpen(false)}>
                <MaterialIcons name="close" size={20} color={theme.textDim} />
              </TouchableOpacity>
            </View>
            {loadingMembers ? (
              <View style={{ paddingVertical: 16, alignItems:'center' }}>
                <Text style={{ color:theme.textDim }}>Loading members…</Text>
              </View>
            ) : members.length === 0 ? (
              <View>
                <Text style={{ color:theme.textDim, marginBottom: 8 }}>No members available.</Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: theme.primary, alignSelf:'flex-start' }]}
                  onPress={async ()=>{
                    const list = await GroupService.listUsers('', 10);
                    setMembers(list);
                    if (!paidByUserId && list.length > 0) setPaidByUserId(list[0].id);
                  }}
                >
                  <Text style={styles.primaryBtnText}>Load demo users</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={members}
                keyExtractor={(m, i)=> String(typeof m.id === 'number' ? m.id : i)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.payerRow} onPress={()=>{ setPaidByUserId(item.id); setPickerOpen(false); }}>
                    <MaterialIcons name={item.id===paidByUserId? 'radio-button-checked':'radio-button-unchecked'} size={18} color={item.id===paidByUserId? theme.primary:theme.textDim} />
                    <Text style={styles.payerName}>{item.name || item.email || `User #${item.id}`}</Text>
                    {!!item.email && <Text style={styles.payerEmail}>{item.email}</Text>}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={()=> <View style={{ height:8 }} />}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F14' },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: '#1C2530' },
  iconBtn: { padding: space.sm, borderRadius: radius.sm, backgroundColor: 'transparent' },
  title: { fontSize: 18, fontWeight: '800', color: '#E5E7EB', flex:1, textAlign:'center' },
  content: { padding: space.lg },
  label: { color: '#94A3B8', fontSize: 12, marginTop: space.xs, marginBottom: space.xs },
  row: { flexDirection:'row', alignItems:'center' },
  input: { borderWidth:1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.md },
  selector: { flexDirection:'row', alignItems:'center', gap:8, borderWidth:1, borderColor: '#1E293B', borderRadius: radius.full, paddingHorizontal: space.md, paddingVertical: space.sm, alignSelf:'flex-start', backgroundColor: '#161D26' },
  selectorText: { fontWeight:'600' },
  footer: { padding: space.lg, borderTopWidth:1, borderTopColor: '#1C2530', backgroundColor: '#0F141A' },
  primaryBtn: { backgroundColor: '#4CAF50', borderRadius: radius.lg, paddingVertical: space.md, alignItems:'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  modalBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', alignItems:'center', justifyContent:'flex-end' },
  modalCard: { backgroundColor: '#111821', width:'100%', maxHeight:'80%', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg },
  modalHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: space.sm },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#E5E7EB' },
  payerRow: { flexDirection:'row', alignItems:'center', gap:10, backgroundColor: '#161D26', padding: space.md, borderRadius: radius.md },
  payerName: { color: '#E5E7EB', fontWeight:'600', flex:1 },
  payerEmail: { color: '#94A3B8', fontSize:12 },
});
