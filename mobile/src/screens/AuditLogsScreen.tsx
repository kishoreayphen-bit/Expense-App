import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, RefreshControl } from 'react-native';
import axios from 'axios';

export default function AuditLogsScreen() {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [resourceType, setResourceType] = useState<string>('');
  const [outcome, setOutcome] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async (reset = false) => {
    setLoading(true);
    try {
      const params: any = { offset: reset ? 0 : offset, limit };
      if (from) params.from = from;
      if (to) params.to = to;
      if (action) params.action = action;
      if (resourceType) params.resourceType = resourceType;
      if (outcome) params.outcome = outcome;
      const resp = await axios.get('/api/v1/audit/logs', { params });
      setTotal(resp.data?.total || 0);
      const newItems = resp.data?.items || [];
      setItems(reset ? newItems : [...items, ...newItems]);
      setOffset((reset ? 0 : offset) + (resp.data?.limit || 0));
    } catch (e) {
      // no-op
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(true); }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audit Logs</Text>
      <View style={styles.row}>
        <TextInput style={styles.input} placeholder="From YYYY-MM-DD" value={from} onChangeText={setFrom} />
        <TextInput style={styles.input} placeholder="To YYYY-MM-DD" value={to} onChangeText={setTo} />
      </View>
      <View style={styles.row}>
        <TextInput style={styles.input} placeholder="Action" value={action} onChangeText={setAction} />
        <TextInput style={styles.input} placeholder="Resource Type" value={resourceType} onChangeText={setResourceType} />
        <TextInput style={styles.input} placeholder="Outcome" value={outcome} onChangeText={setOutcome} />
      </View>
      <View style={styles.row}>
        <Button title="Search" onPress={() => load(true)} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(true)} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemTitle}>{item.action} · {item.outcome}</Text>
            <Text style={styles.itemSub}>{item.resourceType}#{item.resourceId} · {item.actorEmail || item.actorId || ''}</Text>
            <Text style={styles.itemSub}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
        ListFooterComponent={() => (
          items.length < total ? (
            <View style={{ padding: 12 }}>
              <Button title={loading ? 'Loading...' : 'Load more'} onPress={() => load(false)} disabled={loading} />
            </View>
          ) : null
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginVertical: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, flex: 1 },
  item: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemTitle: { fontWeight: '600' },
  itemSub: { color: '#666', fontSize: 12 },
});
