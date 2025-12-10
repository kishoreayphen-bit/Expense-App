import { api, getAuthToken } from './client';
import { Buffer } from 'buffer';

// Types
export type UserSummary = { id: number; name: string; email: string; role?: string };
export type Group = {
  id: number;
  name: string;
  members: UserSummary[];
  owner?: UserSummary;
  createdAt?: string;
  unreadCount?: number;
  imageUrl?: string;
  description?: string;
};
export type Message = {
  id: string;
  groupId: number;
  sender: UserSummary;
  type: 'text' | 'split';
  text?: string;
  createdAt: string;
  // For split messages
  split?: {
    id: number;
    title: string;
    totalAmount: number;
    currency: string;
    involvedUserIds: number[]; // only these users are part of this split
    shares?: Array<{ userId: number; amount: number }>;
  };
};

// Group APIs
export const GroupService = {
  async listUsers(query: string = '', limit = 50, offset = 0): Promise<UserSummary[]> {
    try {
      // 1) Canonical users endpoint (preferred)
      const resp = await api.get('/api/v1/users', {
        params: { query, limit, offset },
        _suppressErrorLog: true as any,
      } as any);
      const arr = Array.isArray(resp.data) ? resp.data : (resp.data?.items || []);
      const mapped = arr
        .map((u: any) => {
          const idNum = typeof u?.id === 'number' ? u.id : (typeof u?.id === 'string' ? parseInt(u.id, 10) : NaN);
          if (!Number.isFinite(idNum)) return null;
          const name = u?.name || u?.fullName || u?.displayName || u?.email || `User #${idNum}`;
          const email = u?.email || '';
          return { id: idNum as number, name, email } as UserSummary;
        })
        .filter(Boolean) as UserSummary[];
      if (mapped.length > 0) return mapped;

      // 2) Derive from groups members
      try {
        const gResp = await api.get('/api/v1/groups', { _suppressErrorLog: true } as any);
        const gArr = Array.isArray(gResp.data) ? gResp.data : (gResp.data?.items || []);
        const usersMap = new Map<number, UserSummary>();
        for (const g of gArr) {
          const members = Array.isArray(g?.members) ? g.members : [];
          for (const m of members) {
            const idRaw: any = (m?.id ?? m?.userId ?? m?.uid ?? m?.user?.id);
            const idNum = typeof idRaw === 'number' ? idRaw : (typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN);
            if (!Number.isFinite(idNum)) continue;
            const email: string = m?.email || m?.emailAddress || m?.username || m?.user?.email || '';
            const name: string = m?.name || m?.fullName || m?.displayName || m?.user?.name || email || `User #${idNum}`;
            if (!usersMap.has(idNum)) usersMap.set(idNum, { id: idNum, name, email });
          }
        }
        const users = Array.from(usersMap.values());
        const q = (query || '').toLowerCase();
        const filtered = q
          ? users.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
          : users;
        if (filtered.length > 0) return filtered.slice(offset, offset + limit);
      } catch (_) {}

      // 3) Demo fallback
      console.warn('[GroupService] listUsers: no directory/users/groups members; using demo users');
      return [
        { id: -101, name: 'Alice', email: 'alice@example.com' },
        { id: -102, name: 'Bob', email: 'bob@example.com' },
        { id: -103, name: 'Charlie', email: 'charlie@example.com' },
        { id: -104, name: 'Dana', email: 'dana@example.com' },
      ];
    } catch (e) {
      // Try fallback from groups before demo
      try {
        // Try deriving from groups if /api/v1/users failed
        const gResp = await api.get('/api/v1/groups', { _suppressErrorLog: true } as any);
        const gArr = Array.isArray(gResp.data) ? gResp.data : (gResp.data?.items || []);
        const usersMap = new Map<number, UserSummary>();
        for (const g of gArr) {
          const members = Array.isArray(g?.members) ? g.members : [];
          for (const m of members) {
            const idRaw: any = (m?.id ?? m?.userId ?? m?.uid ?? m?.user?.id);
            const idNum = typeof idRaw === 'number' ? idRaw : (typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN);
            if (!Number.isFinite(idNum)) continue;
            const email: string = m?.email || m?.emailAddress || m?.username || m?.user?.email || '';
            const name: string = m?.name || m?.fullName || m?.displayName || m?.user?.name || email || `User #${idNum}`;
            if (!usersMap.has(idNum)) {
              usersMap.set(idNum, { id: idNum, name, email });
            }
          }
        }
        const users = Array.from(usersMap.values());
        if (users.length > 0) {
          const q = (query || '').toLowerCase();
          const filtered = q
            ? users.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
            : users;
          return filtered.slice(offset, offset + limit);
        }
      } catch (_) {}
      console.warn('[GroupService] listUsers error, using demo users. Error:', e);
      return [
        { id: -101, name: 'Alice', email: 'alice@example.com' },
        { id: -102, name: 'Bob', email: 'bob@example.com' },
        { id: -103, name: 'Charlie', email: 'charlie@example.com' },
        { id: -104, name: 'Dana', email: 'dana@example.com' },
      ];
    }
  },

  async updateGroupImage(groupId: number, imageUrl: string): Promise<Group | null> {
    try {
      // Try a few common API shapes
      const attempts = [
        { method: 'put', url: `/api/v1/groups/${groupId}/image`, body: { imageUrl } },
        { method: 'patch', url: `/api/v1/groups/${groupId}`, body: { imageUrl } },
      ] as const;
      for (const a of attempts) {
        try {
          const resp = await (api as any)[a.method](a.url, a.body);
          const updated = resp?.data;
          if (updated) {
            // Normalize minimal Group shape with imageUrl
            return {
              id: updated.id ?? groupId,
              name: updated.name ?? `Group #${groupId}`,
              members: Array.isArray(updated.members) ? updated.members : [],
              owner: updated.owner,
              createdAt: updated.createdAt,
              unreadCount: updated.unreadCount,
              imageUrl: updated.imageUrl || updated.avatarUrl || updated.iconUrl || updated.pictureUrl || updated.picture || imageUrl,
            } as Group;
          }
        } catch (_) { /* try next */ }
      }
      return null;
    } catch {
      return null;
    }
  },

  async createGroup(name: string, memberIds: number[], imageUrl?: string): Promise<Group | null> {
    try {
      // Prefer passing memberIds directly (backend supports it)
      const cleanIds = Array.isArray(memberIds)
        ? memberIds.filter((x: any) => Number.isFinite(x) && typeof x === 'number' && x > 0)
        : [];
      const payload: any = { name, type: 'TEAM', memberIds: cleanIds };
      if (imageUrl) payload.imageUrl = imageUrl;
      const resp = await api.post('/api/v1/groups', payload);
      const created = resp.data as Group;
      const groupId = (created as any)?.id;
      if (!groupId) return created;
      // Fallback: add members one by one (in case server ignored memberIds)
      if (Array.isArray(cleanIds) && cleanIds.length > 0) {
        const payloads = cleanIds.map(uid => ({ userId: uid, role: 'MEMBER' }));
        for (const p of payloads) {
          try {
            await api.post(`/api/v1/groups/${groupId}/members`, p);
          } catch (e) {
            console.warn('[GroupService] add member failed (continuing):', p, e);
          }
        }
      }
      // Fetch final view from server so members are included
      try {
        const final = await GroupService.getGroup(groupId);
        return final ?? created;
      } catch {
        return created;
      }
    } catch (e) {
      console.warn('[GroupService] createGroup failed', e);
      return null;
    }
  },

  async listGroups(): Promise<Group[]> {
    try {
      const resp = await api.get('/api/v1/groups');
      const arr = Array.isArray(resp.data) ? resp.data : (resp.data?.items || []);
      // Normalize imageUrl if present under different keys
      const groups = (arr as any[]).map((g:any) => ({
        id: g.id,
        name: g.name,
        members: Array.isArray(g.members) ? g.members : [],
        owner: g.owner,
        createdAt: g.createdAt,
        unreadCount: g.unreadCount,
        imageUrl: g.imageUrl || g.image_url || g.image || g.photoUrl || g.photo_url || g.avatarUrl || g.avatar_url || g.iconUrl || g.icon_url || g.pictureUrl || g.picture_url || g.picture || undefined,
        description: g.description || g.desc || g.about || g.bio || g.details || g.groupDescription || g.descriptionText || g.info || g.summary || g.notes || g.note || g.detailsText || g.aboutUs || undefined,
      })) as Group[];
      if (!groups || groups.length === 0) {
        const token = await getAuthToken();
        if (token) {
          // Authenticated: do NOT mask server empties with demo data
          console.warn('[GroupService] listGroups: empty response while authenticated. Returning [].');
          return [];
        }
        // Unauthenticated: allow demo fallback for UX
        const users = await GroupService.listUsers('', 10);
        const demo: Group[] = [
          { id: 1, name: 'Weekend Trip', members: users.slice(0, 3), owner: users[0], createdAt: new Date().toISOString() },
          { id: 2, name: 'Office Lunch', members: users.slice(1, 5), owner: users[1], createdAt: new Date().toISOString() },
        ];
        console.warn('[GroupService] listGroups: unauthenticated, using demo groups');
        return demo;
      }
      return groups;
    } catch (e) {
      const token = await getAuthToken();
      if (token) {
        console.warn('[GroupService] listGroups error while authenticated. Returning []. Error:', e);
        return [];
      }
      console.warn('[GroupService] listGroups error unauthenticated, using demo groups. Error:', e);
      const users = await GroupService.listUsers('', 10);
      return [
        { id: 1, name: 'Weekend Trip', members: users.slice(0, 3), owner: users[0], createdAt: new Date().toISOString() },
        { id: 2, name: 'Office Lunch', members: users.slice(1, 5), owner: users[1], createdAt: new Date().toISOString() },
      ];
    }
  },

  async getGroup(groupId: number): Promise<Group | null> {
    try {
      const resp = await api.get(`/api/v1/groups/${groupId}`, { _skipCompany: true } as any);
      const raw = resp.data;
      const normalizeUser = (m: any, idx: number) => {
        if (m == null) return null;
        if (typeof m === 'number') {
          return { id: m, name: `User #${m}` , email: '' } as UserSummary;
        }
        const id = (typeof m.id === 'number' && isFinite(m.id)) ? m.id
          : (typeof m.userId === 'number' && isFinite(m.userId)) ? m.userId
          : (typeof m.uid === 'number' && isFinite(m.uid)) ? m.uid
          : -(idx + 1);
        const email = m.email || m.emailAddress || m.username || '';
        const name = m.name || m.fullName || m.displayName || email || `User #${id}`;
        const role = (m.role || m.userRole || '').toString() || undefined;
        return { id, name, email, role } as UserSummary;
      };
      const membersRaw = raw?.members || [];
      const members: UserSummary[] = Array.isArray(membersRaw)
        ? membersRaw.map((m: any, i: number) => normalizeUser(m, i)).filter(Boolean) as UserSummary[]
        : [];
      const ownerRaw = raw?.owner || null;
      const owner = ownerRaw ? normalizeUser(ownerRaw, 999) as UserSummary : undefined;
      const g: Group = {
        id: raw?.id ?? groupId,
        name: raw?.name || `Group #${groupId}`,
        members,
        owner,
        createdAt: raw?.createdAt,
        imageUrl: raw?.imageUrl || raw?.image_url || raw?.image || raw?.photoUrl || raw?.photo_url || raw?.avatarUrl || raw?.avatar_url || raw?.iconUrl || raw?.icon_url || raw?.pictureUrl || raw?.picture_url || raw?.picture,
        description: raw?.description || raw?.desc || raw?.about || raw?.bio || raw?.details || raw?.groupDescription || raw?.descriptionText || raw?.info || raw?.summary || raw?.notes || raw?.note || raw?.detailsText || raw?.aboutUs,
      };
      return g;
    } catch (e) {
      const token = await getAuthToken();
      if (token) {
        console.warn('[GroupService] getGroup error while authenticated. Returning null. Error:', e);
        return null;
      }
      // Unauthenticated demo fallback
      const users = await GroupService.listUsers('', 10);
      const g: Group = { id: groupId, name: `Group #${groupId}`, members: users.slice(0, 4), owner: users[0], createdAt: new Date().toISOString() };
      console.warn('[GroupService] getGroup error unauthenticated, returning demo group. Error:', e);
      return g;
    }
  },

  async listMessages(groupId: number): Promise<Message[]> {
    try {
      // Prefer paginated, sorted descending by createdAt
      const resp = await api.get(`/api/v1/groups/${groupId}/messages`, {
        params: { page: 0, size: 50, sort: 'createdAt,desc' },
        _suppressErrorLog: true as any,
      } as any);
      // Support various response shapes: array | {items} | {content}
      const data = resp.data;
      const arr = Array.isArray(data) ? data : (data?.items || data?.content || []);
      const msgs = (arr || []) as Message[];
      if (msgs.length > 0) return msgs;

      // Retry once without params in case backend does not support them
      try {
        const retry = await api.get(`/api/v1/groups/${groupId}/messages`, { _suppressErrorLog: true } as any);
        const d2 = retry.data;
        const arr2 = Array.isArray(d2) ? d2 : (d2?.items || d2?.content || []);
        const msgs2 = (arr2 || []) as Message[];
        if (msgs2.length > 0) return msgs2;
      } catch {}

      // Empty from server: if authenticated, return [] so UI can rely on local cache
      const token = await getAuthToken();
      if (token) {
        console.warn('[GroupService] listMessages: server returned empty while authenticated. Returning [].');
        return [];
      }
      // Unauthenticated demo fallback
      const users = await GroupService.listUsers('', 10);
      const now = new Date();
      return [
        { id: 'm1', groupId, sender: users[0], type: 'text', text: 'Welcome to the group!', createdAt: now.toISOString() },
      ];
    } catch (e: any) {
      // Suppress noisy interceptor error by setting _suppressErrorLog above; keep one concise warn here.
      const status = e?.status || e?.originalError?.response?.status;
      const msg = e?.message || e?.originalError?.message;
      const bodyMsg = e?.originalError?.response?.data?.message;
      console.warn('[GroupService] listMessages error.', { status, message: msg, body: bodyMsg });
      // If authenticated, return [] to allow UI to show local cache instead of demo content
      const token = await getAuthToken();
      if (token) return [];
      // Unauthenticated demo fallback
      const users = await GroupService.listUsers('', 10);
      const now = new Date();
      return [
        { id: 'm1', groupId, sender: users[0], type: 'text', text: 'Welcome to the group!', createdAt: now.toISOString() },
        { id: 'm2', groupId, sender: users[1], type: 'split', createdAt: now.toISOString(), split: { id: 10, title: 'Gongura lunch', totalAmount: 200, currency: 'INR', involvedUserIds: [users[0].id, users[1].id] } },
      ];
    }
  },

  async sendText(groupId: number, text: string): Promise<Message | null> {
    // Try multiple payload shapes to accommodate differing backends
    const attempts = [
      { body: { type: 'text', text }, note: 'type+text' },
      { body: { text }, note: 'text' },
      { body: { message: text }, note: 'message' },
      { body: { content: text }, note: 'content' },
    ];
    for (const a of attempts) {
      try {
        const resp = await api.post(`/api/v1/groups/${groupId}/messages`, a.body, {
          timeout: 8000,
          _suppressErrorLog: true as any,
        } as any);
        if (resp?.data) return resp.data as Message;
      } catch (_) { /* try next shape */ }
    }
    // Fallback local echo to keep UI responsive
    let me: UserSummary | undefined;
    try {
      const token = await getAuthToken();
      if (token) {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
          const data = JSON.parse(payload || '{}');
          const idNum = Number(data.userId ?? data.sub ?? data.id);
          const email = String(data.email || data.sub || '') || '';
          const name = String(data.name || data.fullName || email || (Number.isFinite(idNum) ? `User #${idNum}` : 'You'));
          me = { id: Number.isFinite(idNum) ? idNum : -1, name, email };
        }
      }
    } catch {}
    if (!me) {
      const users = await GroupService.listUsers('', 10);
      me = users[0];
    }
    return {
      id: `local-${Date.now()}`,
      groupId,
      sender: me!,
      type: 'text',
      text,
      createdAt: new Date().toISOString(),
    } as Message;
  },

  async createSplitMessage(groupId: number, split: { title: string; totalAmount: number; currency: string; involvedUserIds: number[]; shares?: Array<{ userId: number; amount: number }> }): Promise<Message | null> {
    try {
      // Try preferred shape first
      const resp = await api.post(`/api/v1/groups/${groupId}/messages`, { type: 'split', split }, {
        timeout: 10000,
        _suppressErrorLog: true as any,
      } as any);
      const data = resp?.data;
      // Normalize only if response looks like a Message with split
      if (data && (data.type === 'split' || !!data.split)) {
        const id = (data as any).id ?? `srv-${Date.now()}`;
        const createdAt = (data as any).createdAt ?? new Date().toISOString();
        const sender = (data as any).sender ?? undefined;
        const normalized: Message = {
          id,
          groupId,
          type: 'split',
          createdAt,
          sender,
          split: {
            id: (data.split && (data.split.id ?? Date.now())) || Date.now(),
            title: data.split?.title ?? split.title,
            totalAmount: Number(data.split?.totalAmount ?? split.totalAmount) || 0,
            currency: data.split?.currency ?? split.currency,
            involvedUserIds: data.split?.involvedUserIds ?? split.involvedUserIds,
            shares: data.split?.shares ?? split.shares,
          },
        } as Message;
        return normalized;
      }
      // Retry with flat body some backends expect
      try {
        const alt = await api.post(`/api/v1/groups/${groupId}/messages`, {
          title: split.title,
          totalAmount: split.totalAmount,
          currency: split.currency,
          involvedUserIds: split.involvedUserIds,
          shares: split.shares,
        }, { timeout: 10000, _suppressErrorLog: true } as any);
        const d = alt?.data || {};
        if (d) {
          return {
            id: (d as any).id ?? `srv-${Date.now()}`,
            groupId,
            type: 'split',
            createdAt: (d as any).createdAt ?? new Date().toISOString(),
            sender: (d as any).sender,
            split: {
              id: (d.split && (d.split.id ?? Date.now())) || Date.now(),
              title: d.split?.title ?? split.title,
              totalAmount: Number(d.split?.totalAmount ?? split.totalAmount) || 0,
              currency: d.split?.currency ?? split.currency,
              involvedUserIds: d.split?.involvedUserIds ?? split.involvedUserIds,
              shares: d.split?.shares ?? split.shares,
            },
          } as Message;
        }
      } catch (_) {}
      // Unexpected shape; treat as failure
      console.warn('[GroupService] createSplitMessage: unexpected response shape, returning null.');
      return null;
    } catch (e: any) {
      const status = e?.status || e?.originalError?.response?.status;
      const msg = e?.message || e?.originalError?.message;
      const bodyMsg = e?.originalError?.response?.data?.message;
      console.warn('[GroupService] createSplitMessage failed, returning local echo.', { status, message: msg, body: bodyMsg });
      // Return a local echo so UI doesn't break
      let me: UserSummary | undefined;
      try {
        const token = await getAuthToken();
        if (token) {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
            const data = JSON.parse(payload || '{}');
            const idNum = Number(data.userId ?? data.sub ?? data.id);
            const email = String(data.email || data.sub || '') || '';
            const name = String(data.name || data.fullName || email || (Number.isFinite(idNum) ? `User #${idNum}` : 'You'));
            me = { id: Number.isFinite(idNum) ? idNum : -1, name, email };
          }
        }
      } catch {}
      if (!me) {
        const users = await GroupService.listUsers('', 10);
        me = users[0];
      }
      return {
        id: `local-split-${Date.now()}`,
        groupId,
        sender: me!,
        type: 'split',
        createdAt: new Date().toISOString(),
        split: {
          id: Date.now(),
          title: split.title,
          totalAmount: split.totalAmount,
          currency: split.currency,
          involvedUserIds: split.involvedUserIds,
          shares: split.shares,
        },
      } as Message;
    }
  },

  async sendReminder(groupId: number, messageId: number): Promise<{ success: boolean; message: string }> {
    try {
      const resp = await api.post(`/api/v1/groups/${groupId}/messages/${messageId}/remind`, {} as any);
      return {
        success: true,
        message: resp.data?.message || 'Reminder sent successfully'
      };
    } catch (e: any) {
      console.error('[GroupService] sendReminder error:', e);
      throw new Error(e.response?.data?.error || 'Failed to send reminder');
    }
  },

  async addMember(groupId: number, userId: number, role: string = 'MEMBER'): Promise<void> {
    try {
      await api.post(`/api/v1/groups/${groupId}/members`, { userId, role });
    } catch (e: any) {
      console.error('[GroupService] addMember error:', e);
      throw new Error(e.response?.data?.error || e.response?.data?.message || 'Failed to add member');
    }
  },

  async removeMember(groupId: number, userId: number): Promise<void> {
    try {
      await api.delete(`/api/v1/groups/${groupId}/members/${userId}`);
    } catch (e: any) {
      console.error('[GroupService] removeMember error:', e);
      throw new Error(e.response?.data?.error || e.response?.data?.message || 'Failed to remove member');
    }
  },

  async updateMemberRole(groupId: number, userId: number, role: 'ADMIN' | 'MEMBER'): Promise<void> {
    try {
      await api.post(`/api/v1/groups/${groupId}/members/role`, { userId, role });
    } catch (e: any) {
      console.error('[GroupService] updateMemberRole error:', e);
      throw new Error(e.response?.data?.error || e.response?.data?.message || 'Failed to update role');
    }
  },

  async markGroupRead(groupId: number, messageId?: number): Promise<{ groupId: number; lastReadMessageId: number } | null> {
    try {
      console.log('[GroupService] markGroupRead called for group', groupId, 'messageId:', messageId);
      const body = messageId ? { messageId } : {};
      const resp = await api.post(`/api/v1/groups/${groupId}/messages/read`, body as any);
      console.log('[GroupService] markGroupRead response:', resp?.data);
      return resp?.data || null;
    } catch (e: any) {
      console.warn('[GroupService] markGroupRead failed (non-fatal):', e?.message || e);
      return null;
    }
  },

  async getSeenBy(groupId: number, messageId: number): Promise<UserSummary[]> {
    try {
      const resp = await api.get(`/api/v1/groups/${groupId}/messages/${messageId}/seen`);
      const arr = Array.isArray(resp?.data) ? resp.data : [];
      return arr.map((u: any) => ({ id: Number(u.id), name: u.name || u.email || `User #${u.id}`, email: u.email || '' }));
    } catch (e: any) {
      console.warn('[GroupService] getSeenBy failed:', e?.message || e);
      return [];
    }
  },

  async leaveGroup(groupId: number): Promise<boolean> {
    // User leaves the group (remains for others)
    const attempts = [
      { method: 'post', url: `/api/v1/groups/${groupId}/leave`, body: {} },
      { method: 'delete', url: `/api/v1/groups/${groupId}/members/me`, body: undefined },
      { method: 'delete', url: `/api/v1/groups/${groupId}/me`, body: undefined },
    ] as const;
    for (const a of attempts) {
      try {
        const resp = await (api as any)[a.method](a.url, a.body);
        if (!resp || resp.status >= 400) continue;
        return true;
      } catch {}
    }
    return false;
  },

  async deleteGroupForMe(groupId: number): Promise<boolean> {
    // Soft-delete/hide group for current user only
    const attempts = [
      { method: 'delete', url: `/api/v1/groups/${groupId}`, body: undefined, params: { scope: 'me' } },
      { method: 'post', url: `/api/v1/groups/${groupId}/hide`, body: {} },
      { method: 'post', url: `/api/v1/groups/${groupId}/archive`, body: {} },
    ] as const;
    for (const a of attempts) {
      try {
        if ('params' in a && a.params) {
          const resp = await (api as any)[a.method](a.url, { params: a.params } as any);
          if (!resp || resp.status >= 400) continue;
          return true;
        }
        const resp = await (api as any)[a.method](a.url, a.body);
        if (!resp || resp.status >= 400) continue;
        return true;
      } catch {}
    }
    return false;
  },

  async deleteGroup(groupId: number): Promise<boolean> {
    // Permanent delete (owner only)
    const attempts = [
      { method: 'delete', url: `/api/v1/groups/${groupId}`, body: undefined },
      { method: 'post', url: `/api/v1/groups/${groupId}/delete`, body: {} },
    ] as const;
    for (const a of attempts) {
      try {
        const resp = await (api as any)[a.method](a.url, a.body);
        if (!resp || resp.status >= 400) continue;
        return true;
      } catch {}
    }
    return false;
  },

  async updateGroup(groupId: number, fields: { name?: string; description?: string; imageUrl?: string }): Promise<Group | null> {
    try {
      const urlVariants = [
        `/api/v1/groups/${groupId}`,
        `/api/v1/groups/${groupId}/update`,
        `/api/v1/groups/${groupId}/settings`,
        `/api/v1/groups/${groupId}/meta`,
      ];
      const bodyVariants: Array<any> = [
        { ...fields },
        { id: groupId, ...fields },
        { name: fields.name, desc: fields.description, imageUrl: fields.imageUrl },
        { name: fields.name, about: fields.description, imageUrl: fields.imageUrl },
        { group: { id: groupId, name: fields.name, description: fields.description, imageUrl: fields.imageUrl } },
      ];
      const methodVariants = ['patch', 'put', 'post'] as const;
      for (const url of urlVariants) {
        for (const body of bodyVariants) {
          for (const method of methodVariants) {
            try {
              const resp = await (api as any)[method](url, body, { _suppressErrorLog: true } as any);
              const updated = resp?.data;
              if (updated) {
                return {
                  id: updated.id ?? groupId,
                  name: updated.name ?? fields.name ?? `Group #${groupId}`,
                  members: Array.isArray(updated.members) ? updated.members : [],
                  owner: updated.owner,
                  createdAt: updated.createdAt,
                  unreadCount: updated.unreadCount,
                  imageUrl: updated.imageUrl || updated.image_url || updated.avatarUrl || updated.iconUrl || updated.pictureUrl || updated.picture || fields.imageUrl,
                  description: updated.description || updated.desc || updated.about || updated.bio || updated.details || fields.description,
                } as Group;
              }
            } catch (_) { /* try next */ }
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  },
};
