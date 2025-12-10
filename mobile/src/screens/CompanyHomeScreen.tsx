import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCompany } from '../context/CompanyContext';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function CompanyHomeScreen() {
  const { activeCompany, activeCompanyId, setActiveCompanyId, refreshActiveCompany } = useCompany();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // If navigated with a companyId param, ensure context is aligned
  useEffect(() => {
    const id = route?.params?.companyId as number | undefined;
    if (id && id !== activeCompanyId) {
      setActiveCompanyId(id);
      refreshActiveCompany();
    }
  }, [route?.params?.companyId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{activeCompany?.companyName || 'Company'}</Text>
        <Text style={styles.subtitle}>{activeCompany?.companyEmail || ''}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Budgets</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MainTabs' as never, { screen: 'Budgets', params: { fromCompany: true, companyId: activeCompanyId } } as never)}>
              <Text style={styles.link}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.emptyRow}>
            <MaterialIcons name="account-balance-wallet" size={22} color="#9CA3AF" />
            <View style={{ flex:1 }}>
              <Text style={styles.emptyTitle}>No budgets yet</Text>
              <Text style={styles.emptyText}>Create your first budget to get started.</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('MainTabs' as never, { screen: 'Budgets', params: { openCreate: true, fromCompany: true, companyId: activeCompanyId } } as never)}>
              <Text style={styles.primaryBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Expenses</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MainTabs' as never, { screen: 'Expenses', params: { fromCompany: true, companyId: activeCompanyId } } as never)}>
              <Text style={styles.link}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.emptyRow}>
            <MaterialIcons name="receipt" size={22} color="#9CA3AF" />
            <View style={{ flex:1 }}>
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptyText}>Add your first expense for this company.</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('AddExpense' as never, { fromCompany: true, companyId: activeCompanyId } as never)}>
              <Text style={styles.primaryBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Splits</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MainTabs' as never, { screen: 'Splits', params: { fromCompany: true, companyId: activeCompanyId } } as never)}>
              <Text style={styles.link}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.emptyRow}>
            <MaterialIcons name="group" size={22} color="#9CA3AF" />
            <View style={{ flex:1 }}>
              <Text style={styles.emptyTitle}>No splits yet</Text>
              <Text style={styles.emptyText}>Create a split to share expenses.</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('SplitCreate' as never, { fromCompany: true, companyId: activeCompanyId } as never)}>
              <Text style={styles.primaryBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f9' },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#6b7280', marginTop: 2 },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, elevation: 1, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:5, shadowOffset:{width:0,height:1} },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontWeight: '800', color: '#0f172a' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyTitle: { color: '#111827', fontWeight:'700' },
  emptyText: { color: '#6b7280', fontSize: 12 },
  link: { color: '#16a34a', fontWeight: '800' },
  primaryBtn: { backgroundColor:'#22C55E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  primaryBtnText: { color:'#fff', fontWeight:'800' },
});
