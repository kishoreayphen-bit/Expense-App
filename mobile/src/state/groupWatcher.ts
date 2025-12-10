import { DeviceEventEmitter } from 'react-native';
import { GroupService } from '../api/groupService';
import { getLastGroupIds, setLastGroupIds } from './groupMeta';
import { getAuthToken } from '../api/client';

let timer: any = null;
let runningForUser: number | null = null;

async function currentUserId(): Promise<number | null> {
  try {
    // We don't have direct access to AuthContext here; rely on token presence only for now.
    // If needed, we can expose a getCurrentUser() in AuthContext and import it here.
    const token = await getAuthToken();
    if (!token) return null;
    // If needed, decode JWT to extract user id; keeping simple: return null to skip per-user storage if unknown
    return null;
  } catch { return null; }
}

export async function startGroupWatcher(userId: number | null, intervalMs: number = 20000) {
  if (timer) return; // already running
  runningForUser = userId ?? -1;
  const tick = async () => {
    try {
      const token = await getAuthToken();
      if (!token) { console.log('[GroupWatcher] No token; skipping tick'); return; }
      // If user id is unknown, try decode from JWT
      if (runningForUser === -1) {
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const pad = b64.length % 4 === 2 ? '==' : (b64.length % 4 === 3 ? '=' : '');
            const b64p = b64 + pad;
            // atob might not exist in RN; try Buffer if available
            let json = '';
            if (typeof atob === 'function') {
              json = decodeURIComponent(Array.prototype.map.call(atob(b64p), (c: string) => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            } else if (typeof Buffer !== 'undefined') {
              // @ts-ignore
              json = Buffer.from(b64p, 'base64').toString('utf-8');
            }
            if (json) {
              const payload = JSON.parse(json);
              const idLike = payload.sub || payload.id || payload.userId;
              const parsed = typeof idLike === 'string' ? parseInt(idLike, 10) : idLike;
              if (Number.isFinite(parsed)) runningForUser = parsed as number;
            }
          }
        } catch {}
      }
      const groups = await GroupService.listGroups();
      const latestIds = (groups || []).map(g => g.id);
      const keyUser = runningForUser ?? -1;
      const lastIds = await getLastGroupIds(keyUser);
      const newIds = latestIds.filter(id => !lastIds.includes(id));
      console.log('[GroupWatcher] tick', { keyUser, latestIds, lastIds, newIds });
      if (newIds.length > 0) {
        DeviceEventEmitter.emit('groups:new', { ids: newIds, count: newIds.length });
        await setLastGroupIds(keyUser, latestIds);
      }
    } catch {}
  };
  // run immediately once
  await tick();
  // then schedule interval
  timer = setInterval(tick, intervalMs);
}

export function stopGroupWatcher() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
