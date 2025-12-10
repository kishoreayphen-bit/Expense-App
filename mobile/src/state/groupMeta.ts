// Local group meta storage for membership change detection
let AsyncStorage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

const keyForMembers = (groupId: number) => `group_members_${groupId}`;
const keyForMyGroups = (userId: number) => `user_${userId}_groups`;
const keyForSeenGroups = (userId: number) => `user_${userId}_groups_seen`;

export async function getLastMemberIds(groupId: number): Promise<number[]> {
  if (!AsyncStorage) return [];
  try {
    const raw = await AsyncStorage.getItem(keyForMembers(groupId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export async function setLastMemberIds(groupId: number, ids: number[]): Promise<void> {
  if (!AsyncStorage) return;
  try {
    await AsyncStorage.setItem(keyForMembers(groupId), JSON.stringify(ids));
  } catch {}
}

export async function getLastGroupIds(userId: number): Promise<number[]> {
  if (!AsyncStorage) return [];
  try {
    const raw = await AsyncStorage.getItem(keyForMyGroups(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export async function setLastGroupIds(userId: number, ids: number[]): Promise<void> {
  if (!AsyncStorage) return;
  try {
    await AsyncStorage.setItem(keyForMyGroups(userId), JSON.stringify(ids));
  } catch {}
}

// Seen groups (for persistent NEW badge)
export async function getSeenGroupIds(userId: number): Promise<number[]> {
  if (!AsyncStorage) return [];
  try {
    const raw = await AsyncStorage.getItem(keyForSeenGroups(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export async function setSeenGroupIds(userId: number, ids: number[]): Promise<void> {
  if (!AsyncStorage) return;
  try {
    await AsyncStorage.setItem(keyForSeenGroups(userId), JSON.stringify(ids));
  } catch {}
}

export async function addSeenGroupId(userId: number, id: number): Promise<void> {
  if (!AsyncStorage) return;
  try {
    const existing = await getSeenGroupIds(userId);
    const set = new Set<number>(existing);
    set.add(id);
    await setSeenGroupIds(userId, Array.from(set.values()));
  } catch {}
}

export async function clearSeenGroupIds(userId: number): Promise<void> {
  if (!AsyncStorage) return;
  try {
    await AsyncStorage.removeItem(keyForSeenGroups(userId));
  } catch {}
}
