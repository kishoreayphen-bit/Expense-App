import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import axios from 'axios';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

export default function ReceiptsListScreen() {
  const route = useRoute<RouteProp<any, any>>();
  const nav = useNavigation<any>();
  const expenseId = (route.params as any)?.expenseId as number;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Backend list receipts for an expense. Adjust endpoint if different in your backend.
      const resp = await axios.get(`/api/v1/expenses/${expenseId}/receipts`);
      setItems(resp.data || []);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [expenseId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => nav.navigate('ReceiptPages', { receiptId: item.id })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Receipt #{item.id}</Text>
              <Text style={styles.sub}>{item.status || ''}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontWeight: '600' },
  sub: { color: '#666', fontSize: 12 },
});
