/** type ให้ตรงกับ response ของ admin-panel/api (src/routes/logs.ts, src/auth.ts) */
export interface LogItem {
  id: string;
  type: string;
  resource: string;
  identifier: string | null;
  playerName: string | null;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface LogPage {
  items: LogItem[];
  nextCursor: string | null;
}

/** GET /api/logs/menu */
export interface MenuResource {
  resource: string;
  count24h: number;
  types: { type: string; count24h: number }[];
}

export interface SessionUser {
  id: string;
  username: string;
  avatar: string | null;
}

export interface LogFilters {
  type?: string;
  identifier?: string;
  resource?: string;
  /** ISO date-time */
  from?: string;
  to?: string;
}

/** API ตอบ 401 = ยังไม่ login หรือไม่ใช่ admin */
export class UnauthorizedError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { cache: "no-store", ...init });
  if (res.status === 401) throw new UnauthorizedError();
  if (res.status === 503) throw new Error("Can't reach the database. Make sure MongoDB is running.");
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? body?.message ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  me: () => request<SessionUser>("/auth/me"),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  menu: () => request<MenuResource[]>("/logs/menu"),
  logs: (filters: LogFilters, cursor?: string | null, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    if (cursor) params.set("cursor", cursor);
    return request<LogPage>(`/logs?${params}`);
  },
};
