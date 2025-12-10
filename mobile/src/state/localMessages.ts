// Safe AsyncStorage require with in-memory fallback
import { Message } from '../api/groupService';
import * as SecureStore from 'expo-secure-store';

let AsyncStorage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}

const keyFor = (groupId: number) => `local_msgs_${groupId}`;
const memoryStore: Record<number, Message[]> = {};

export async function getLocalMessages(groupId: number): Promise<Message[]> {
  if (AsyncStorage) {
    try {
      const raw = await AsyncStorage.getItem(keyFor(groupId));
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      // fallthrough
    }
  }
  try {
    const raw = await SecureStore.getItemAsync(keyFor(groupId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return memoryStore[groupId] ? [...memoryStore[groupId]] : [];
  }
}

export async function addLocalMessage(groupId: number, msg: Message): Promise<void> {
  const list = await getLocalMessages(groupId);
  const exists = list.some(m => m && String((m as any).id) === String((msg as any).id));
  if (exists) return;
  const next = [...list, msg];
  try {
    if (AsyncStorage) {
      await AsyncStorage.setItem(keyFor(groupId), JSON.stringify(next));
      return;
    }
  } catch {}
  try {
    await SecureStore.setItemAsync(keyFor(groupId), JSON.stringify(next));
    return;
  } catch {}
  const mem = memoryStore[groupId] || [];
  memoryStore[groupId] = [...mem, msg];
}

export async function removeLocalMessage(groupId: number, id: string | number): Promise<void> {
  const list = await getLocalMessages(groupId);
  const next = list.filter(m => String((m as any).id) !== String(id));
  try {
    if (AsyncStorage) {
      await AsyncStorage.setItem(keyFor(groupId), JSON.stringify(next));
      return;
    }
  } catch {}
  try {
    await SecureStore.setItemAsync(keyFor(groupId), JSON.stringify(next));
    return;
  } catch {}
  const mem = memoryStore[groupId] || [];
  memoryStore[groupId] = mem.filter(m => String((m as any).id) !== String(id));
}

export async function clearLocalMessages(groupId: number): Promise<void> {
  try {
    if (AsyncStorage) {
      await AsyncStorage.removeItem(keyFor(groupId));
      return;
    }
  } catch {}
  try {
    await SecureStore.deleteItemAsync(keyFor(groupId));
    return;
  } catch {}
  delete memoryStore[groupId];
}

// Replace local cache with the provided list
export async function setLocalMessages(groupId: number, msgs: Message[]): Promise<void> {
  if (!Array.isArray(msgs)) return;
  try {
    if (AsyncStorage) {
      await AsyncStorage.setItem(keyFor(groupId), JSON.stringify(msgs));
      return;
    }
  } catch {}
  try {
    await SecureStore.setItemAsync(keyFor(groupId), JSON.stringify(msgs));
    return;
  } catch {}
  memoryStore[groupId] = [...msgs];
}
