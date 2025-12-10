import React, { useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../api/client';
import { useNavigation } from '@react-navigation/native';

export default function ACLScreen() {
  const navigation = useNavigation<any>();
  useLayoutEffect(() => {
    navigation.setOptions({ title: 'ACL Management', tabBarLabel: 'ACL' });
  }, [navigation]);
  const [resourceType, setResourceType] = useState('EXPENSE');
  const [resourceId, setResourceId] = useState('');
  const [principalType, setPrincipalType] = useState('USER');
  const [principalId, setPrincipalId] = useState('');
  const [permission, setPermission] = useState('READ');
  const [grants, setGrants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const list = async () => {
    try {
      setLoading(true); setError(null);
      const resp = await api.get('/api/v1/acl/list', { params: { resourceType, resourceId } });
      setGrants(Array.isArray(resp.data) ? resp.data : (resp.data?.items || []));
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || 'Failed to load';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await list();
    } finally {
      setRefreshing(false);
    }
  };

  const share = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true); setError(null);
      await api.post('/api/v1/acl/share', { resourceType, resourceId: Number(resourceId), principalType, principalId: Number(principalId), permission });
      await list();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || 'Share failed';
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (g?: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true); setError(null);
      await api.delete('/api/v1/acl/share', { data: { resourceType: g?.resourceType||resourceType, resourceId: Number(g?.resourceId ?? resourceId), principalType: g?.principalType||principalType, principalId: Number(g?.principalId ?? principalId), permission: g?.permission||permission } });
      await list();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || 'Revoke failed';
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {error && (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={18} color="#D32F2F" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Share</Text>
          <Text style={styles.label}>Resource Type</Text>
          <View style={styles.chipsRow}>
            {['EXPENSE','RECEIPT'].map(rt => (
              <TouchableOpacity key={rt} style={[styles.chip, resourceType===rt && styles.chipActive]} onPress={()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setResourceType(rt);}}>
                <Text style={[styles.chipText, resourceType===rt && styles.chipTextActive]}>{rt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} value={resourceId} onChangeText={setResourceId} placeholder="Resource ID" placeholderTextColor="#94A3B8" keyboardType="numeric" />
          <Text style={styles.label}>Principal</Text>
          <View style={styles.chipsRow}>
            {['USER','GROUP'].map(pt => (
              <TouchableOpacity key={pt} style={[styles.chip, principalType===pt && styles.chipActive]} onPress={()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPrincipalType(pt);}}>
                <Text style={[styles.chipText, principalType===pt && styles.chipTextActive]}>{pt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} value={principalId} onChangeText={setPrincipalId} placeholder={principalType==='USER'?'User ID':'Group ID'} placeholderTextColor="#94A3B8" keyboardType="numeric" />
          <Text style={styles.label}>Permission</Text>
          <View style={styles.chipsRow}>
            {['READ','WRITE'].map(p => (
              <TouchableOpacity key={p} style={[styles.chip, permission===p && styles.chipActive]} onPress={()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPermission(p);}}>
                <Text style={[styles.chipText, permission===p && styles.chipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.primaryBtn, (!resourceId||!principalId)&&{opacity:0.6}]} disabled={!resourceId||!principalId} onPress={share}>
            <Text style={styles.primaryBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Grants</Text>
          {(grants||[]).map((g, i)=> (
            <View key={`g${i}`} style={styles.rowBetween}>
              <Text style={styles.rowLabel}>{g.principalType} {g.principalId} → {g.permission}</Text>
              <TouchableOpacity onPress={()=>revoke(g)}>
                <MaterialIcons name="delete-outline" size={20} color="#D32F2F" />
              </TouchableOpacity>
            </View>
          ))}
          {(!loading && (!grants || grants.length===0)) && <Text style={styles.dim}>No grants</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding: 20, backgroundColor:'rgba(255, 255, 255, 0.95)', borderBottomWidth:0, shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  title: { fontSize: 24, fontWeight: '800', color:'#0F172A', letterSpacing: -0.8 },
  input: { borderWidth: 0, borderColor: 'transparent', borderRadius: 14, padding: 16, backgroundColor: '#F1F5F9', marginVertical: 8, color: '#0F172A', fontSize: 15, fontWeight: '500', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  label: { color:'#64748B', fontSize: 11, marginTop: 16, marginBottom: 8, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  refreshBtn: { padding: 10, borderRadius: 12, backgroundColor: '#F0FDF4', shadowColor: '#22C55E', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  card: { backgroundColor:'rgba(255, 255, 255, 0.95)', margin:20, borderRadius:20, padding:20, elevation:4, shadowColor:'#0f172a', shadowOpacity:0.04, shadowRadius:16, shadowOffset:{width:0,height:8}, borderWidth: 0 },
  cardTitle: { fontSize:19, fontWeight:'800', color:'#0F172A', marginBottom: 12, letterSpacing: -0.5 },
  chipsRow: { flexDirection:'row', alignItems:'center', flexWrap:'wrap', gap:10, marginVertical:10 },
  chip: { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:16, paddingVertical:10, borderRadius:12, borderWidth:0, backgroundColor:'#F1F5F9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  chipActive: { backgroundColor:'#22C55E', borderColor:'transparent', shadowColor: '#22C55E', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  chipText: { color:'#64748B', fontWeight:'600', fontSize: 13 },
  chipTextActive: { color:'#FFFFFF', fontWeight:'700' },
  primaryBtn: { backgroundColor:'#22C55E', borderRadius:14, paddingVertical:16, alignItems:'center', marginTop: 20, shadowColor: '#22C55E', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  primaryBtnText: { color:'#FFFFFF', fontWeight:'700', fontSize: 16, letterSpacing: 0.5 },
  rowBetween: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowLabel: { color:'#0F172A', fontSize: 14, fontWeight: '600' },
  dim: { color:'#94A3B8', fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  errorBox: { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'#FEF2F2', padding:14, borderRadius:12, margin:20, borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  errorText: { color:'#DC2626', fontSize: 13, fontWeight: '500', flex: 1 },
});
