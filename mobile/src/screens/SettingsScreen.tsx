import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { backendUrl, setBackendUrl, email, logout } = useAuth();
  const [url, setUrl] = useState(backendUrl);

  const save = () => {
    setBackendUrl(url);
    Alert.alert('Saved', 'Backend URL updated');
  };

  const signOut = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text>User: {email || '-'}</Text>
      <Text style={styles.label}>Backend URL</Text>
      <TextInput style={styles.input} value={url} onChangeText={setUrl} />
      <Button title="Save" onPress={save} />
      <View style={{ height: 12 }} />
      <Button title="Logout" color="#b00020" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  label: { marginTop: 12, marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8 },
});
