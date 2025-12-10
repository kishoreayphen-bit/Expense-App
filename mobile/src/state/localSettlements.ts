// Local settlement storage with AsyncStorage fallback
import { Message } from '../api/groupService';

let AsyncStorage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}

type SettlementState = {
  // splitId -> set of userIds who marked as paid
  [splitId: string]: number[];
};

const keyFor = (groupId: number) => `local_settlements_${groupId}`;
const mem: Record<number, SettlementState> = {};

async function getState(groupId: number): Promise<SettlementState> {
  if (!AsyncStorage) return mem[groupId] || {};
  try {
    const raw = await AsyncStorage.getItem(keyFor(groupId));
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj as SettlementState : {};
  } catch {
    return {};
  }
}

async function saveState(groupId: number, state: SettlementState): Promise<void> {
  if (!AsyncStorage) { mem[groupId] = state; return; }
  try {
    await AsyncStorage.setItem(keyFor(groupId), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export async function isPaid(groupId: number, splitId: number | string, userId: number): Promise<boolean> {
  const state = await getState(groupId);
  const arr = state[String(splitId)] || [];
  return arr.includes(userId);
}

export async function markPaid(groupId: number, splitId: number | string, userId: number): Promise<void> {
  const state = await getState(groupId);
  const key = String(splitId);
  const arr = state[key] || [];
  if (!arr.includes(userId)) arr.push(userId);
  state[key] = arr;
  await saveState(groupId, state);
}

export async function unmarkPaid(groupId: number, splitId: number | string, userId: number): Promise<void> {
  const state = await getState(groupId);
  const key = String(splitId);
  const arr = (state[key] || []).filter((id: number) => id !== userId);
  state[key] = arr;
  await saveState(groupId, state);
}
