import { Message } from '../api/groupService';

// Simple in-memory pending message buffer per group
const store: Record<number, Message[]> = {};

export function addPendingMessage(groupId: number, msg: Message) {
  if (!msg) return;
  if (!store[groupId]) store[groupId] = [];
  const id = (msg as any)?.id;
  // if id missing, synthesize one to keep React keys stable
  const normalized: Message = {
    ...msg,
    id: id ?? `local-${Date.now()}`,
    createdAt: (msg as any)?.createdAt ?? new Date().toISOString(),
  } as Message;
  const exists = store[groupId].some(m => m && String((m as any).id) === String((normalized as any).id));
  if (!exists) store[groupId].push(normalized);
}

export function drainPendingMessages(groupId: number): Message[] {
  const list = (store[groupId] || []).filter(m => !!m && ((m as any).split || (m as any).text));
  store[groupId] = [];
  return list;
}
