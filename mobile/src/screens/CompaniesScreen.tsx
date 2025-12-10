import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { MaterialIcons } from '@expo/vector-icons';
import { companiesService, Company } from '../api/companyService';
import { useCompany } from '../context/CompanyContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export default function CompaniesScreen() {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Company[]>([]);
  const { activeCompanyId, setActiveCompanyId } = useCompany();
  const navigation = useNavigation<any>();

  const load = async () => {
    try {
      setLoading(true);
      const data = await companiesService.list();
      let next = Array.isArray(data) ? data : [];
      // Fallback: if API list is empty but we have an active company, try fetching it directly
      if ((next.length === 0) && activeCompanyId) {
        try {
          const single = await companiesService.get(activeCompanyId);
          if (single && typeof single.id === 'number') {
            next = [single];
          }
        } catch {}
      }
      // Fallback 2: load last created company from storage (written on create)
      if (next.length === 0) {
        try {
          const raw = await SecureStore.getItemAsync('last_created_company');
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved && typeof saved.id === 'number') {
              next = [saved];
            }
          }
        } catch {}
      }
      setList(next);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const onSelect = (c: Company) => {
    setActiveCompanyId(c.id);
    navigation.navigate('MainTabs', { screen: 'Dashboard' });
  };

  const renderItem = ({ item }: { item: Company }) => {
    const active = activeCompanyId === item.id;
    return (
      <TouchableOpacity style={[styles.row, active && styles.rowActive]} onPress={() => onSelect(item)}>
        <View style={styles.iconWrap}><MaterialIcons name="business" size={20} color={active ? '#fff' : '#111827'} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, active && { color: '#fff' }]}>{item.companyName}</Text>
          <Text style={[styles.meta, active && { color: '#E5E7EB' }]}>{item.companyEmail}</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap: 10, marginTop: 4 }}>
            <Text style={[styles.badge, active && styles.badgeActive]}>
              <MaterialIcons name="place" size={12} color={active ? '#fff' : '#6b7280'} /> {item.country || '—'}
            </Text>
            <Text style={[styles.badge, active && styles.badgeActive]}>
              <MaterialIcons name="euro" size={12} color={active ? '#fff' : '#6b7280'} /> {item.currency || '—'}
            </Text>
            <Text style={[styles.badge, active && styles.badgeActive]}>
              <MaterialIcons name="apartment" size={12} color={active ? '#fff' : '#6b7280'} /> {item.industryType || '—'}
            </Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={active ? '#fff' : '#9CA3AF'} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Companies</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CompanyRegistration') }>
          <MaterialIcons name="add" size={18} color="#fff" />
          <Text style={styles.createText}>Create</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <MaterialIcons name="business" size={28} color="#9CA3AF" />
            <Text style={styles.emptyText}>No companies yet</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CompanyRegistration')}>
              <Text style={styles.link}>Create your first company</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f9' },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop: 12 },
  title: { fontSize: 18, fontWeight:'800', color:'#0f172a' },
  createBtn: { flexDirection:'row', alignItems:'center', gap: 6, backgroundColor:'#22C55E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  createText: { color:'#fff', fontWeight:'800' },
  row: { flexDirection:'row', alignItems:'center', gap: 12, backgroundColor:'#fff', marginBottom: 10, padding: 14, borderRadius: 12, elevation: 1, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:5, shadowOffset:{width:0,height:1} },
  rowActive: { backgroundColor:'#22C55E' },
  name: { color:'#111827', fontWeight:'800' },
  meta: { color:'#6b7280', fontSize: 12, marginTop: 2 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor:'#E5E7EB', alignItems:'center', justifyContent:'center' },
  empty: { alignItems:'center', paddingTop: 60 },
  emptyText: { color:'#6b7280', marginTop: 8 },
  link: { color:'#16a34a', fontWeight:'800', marginTop: 6 },
  badge: { color:'#6b7280', fontSize: 12 },
  badgeActive: { color:'#fff' },
});
