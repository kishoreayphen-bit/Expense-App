import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, FlatList, Button, Platform, StatusBar } from 'react-native';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';

export default function SplitsScreen() {
  const { activeCompanyId } = useCompany();
  const isCompanyMode = !!activeCompanyId;
  const [total, setTotal] = useState('100');
  const [currency, setCurrency] = useState('USD');
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0,10));
  const [participants, setParticipants] = useState<string>('1:1,2:1'); // userId:ratio pairs
  const [result, setResult] = useState<any | null>(null);

  const simulate = async () => {
    try {
      const parts = participants.split(',').map(p => {
        const [id, ratio] = p.split(':');
        return { userId: Number(id.trim()), ratio: ratio ? Number(ratio) : 1 };
      });
      const body = { type: 'RATIO', totalAmount: Number(total), currency, occurredOn, participants: parts };
      const cfg: any = isCompanyMode
        ? { params: activeCompanyId ? { companyId: activeCompanyId, company_id: activeCompanyId } : undefined }
        : { _skipCompany: true };
      const resp = await api.post('/api/v1/split/simulate', body, cfg);
      setResult(resp.data);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Split Simulator</Text>
      <TextInput style={styles.input} value={total} onChangeText={setTotal} placeholder="Total Amount" keyboardType="numeric" />
      <TextInput style={styles.input} value={currency} onChangeText={setCurrency} placeholder="Currency" />
      <TextInput style={styles.input} value={occurredOn} onChangeText={setOccurredOn} placeholder="YYYY-MM-DD" />
      <TextInput style={styles.input} value={participants} onChangeText={setParticipants} placeholder="Participants userId:ratio, e.g., 1:1,2:1" />
      <Button title="Simulate" onPress={simulate} />

      {result && (
        <View style={{ marginTop: 16 }}>
          <Text>Base Total: {result.baseTotal} {result.baseCurrency}</Text>
          <FlatList data={result.shares || []} keyExtractor={(s, i) => String(i)} renderItem={({ item }) => (
            <Text>- User {item.userId}: {item.amount} {result.currency || currency} (≈ {item.baseAmount} {result.baseCurrency})</Text>
          )} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 32 : 32 },
  title: { fontSize: 20, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginVertical: 6 },
});
