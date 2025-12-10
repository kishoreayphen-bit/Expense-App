import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, ScrollView, FlatList, Linking } from 'react-native';
import axios from 'axios';
import { RouteProp, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export default function ReceiptPagesScreen() {
  const route = useRoute<RouteProp<any, any>>();
  const receiptId = (route.params as any)?.receiptId as number;
  const [receipt, setReceipt] = useState<any | null>(null);
  const [pages, setPages] = useState<any[]>([]);

  const load = async () => {
    try {
      const [r, p] = await Promise.all([
        axios.get(`/api/v1/receipts/${receiptId}`),
        axios.get(`/api/v1/receipts/${receiptId}/pages`)
      ]);
      setReceipt(r.data);
      setPages(p.data || []);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => { load(); }, [receiptId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {receipt ? (
        <>
          <Text style={styles.title}>Receipt #{receipt.id}</Text>
          <Text>Status: {receipt.ocrStatus || receipt.status || '-'}</Text>
          {receipt.fileUri ? <Text>File: {receipt.fileUri}</Text> : null}
          {receipt.createdAt ? <Text>Created: {new Date(receipt.createdAt).toLocaleString()}</Text> : null}
          {receipt.extractedJson ? <Text>Extracted: {receipt.extractedJson}</Text> : null}
          <View style={{ height: 12 }} />
          <Button title="Refresh" onPress={load} />
          <View style={{ height: 8 }} />
          <Button title="Open Download Link" onPress={async () => {
            try {
              const presign = await axios.get(`/api/v1/receipts/${receiptId}/presign-download`);
              const url = presign.data?.url || presign.data;
              if (url) Linking.openURL(url);
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || e.message);
            }
          }} />
          <View style={{ height: 16 }} />
          <Text style={styles.subtitle}>Pages</Text>
          <FlatList data={pages} keyExtractor={(it, i) => String(it.id || i)} renderItem={({ item }) => (
            <View style={styles.pageItem}>
              <Text>Page {item.pageNumber}: {item.fileName || ''}</Text>
            </View>
          )} />
          <View style={{ height: 16 }} />
          <Button title="Upload Page" onPress={async () => {
            try {
              const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
              // @ts-ignore: older expo types return 'canceled'
              if (!res.canceled) {
                // @ts-ignore: data shape differs by SDK, normalize
                const file = (res.assets && res.assets[0]) || res; // handle both shapes
                const name = file.name || 'upload.bin';
                const mime = file.mimeType || 'application/octet-stream';
                const size = file.size || 0;
                const presign = await axios.get(`/api/v1/receipts/${receiptId}/presign-upload`, { params: { fileName: name, contentType: mime, fileSize: size } });
                const url = presign.data?.url || presign.data;
                if (!url) throw new Error('No presigned URL returned');
                const fileUri = file.uri;
                const result = await FileSystem.uploadAsync(url, fileUri, {
                  httpMethod: 'PUT',
                  uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                  headers: { 'Content-Type': mime }
                });
                if (result.status >= 200 && result.status < 300) {
                  Alert.alert('Uploaded', 'Page uploaded successfully');
                  load();
                } else {
                  throw new Error(`Upload failed with status ${result.status}`);
                }
              }
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || e.message);
            }
          }} />
        </>
      ) : (
        <Text>Loading...</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { marginTop: 12, marginBottom: 8, fontWeight: '600' },
  pageItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' }
});
