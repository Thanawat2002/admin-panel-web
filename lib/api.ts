/** Types matching the admin-panel/api responses (src/routes/logs.ts, src/auth.ts) */
export interface LogItem {
  id: string;
  type: string;
  resource: string;
  identifier: string | null;
  /** Rockstar license ("license:…"), missing on older logs */
  license: string | null;
  /** In-game character name (or FiveM name for scripts that don't send one) */
  playerName: string | null;
  /** Discord profile, null when unknown or the API has no DISCORD_BOT_TOKEN */
  discord: DiscordProfile | null;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface DiscordProfile {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
}

export interface LogPage {
  items: LogItem[];
  nextCursor: string | null;
  /** Position of the newest log returned; pass it as `after` to poll for newer logs */
  newestCursor: string | null;
  /** Only for `after` requests: more new logs are waiting, ask again right away */
  hasNewer: boolean;
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
  license?: string;
  resource?: string;
  /** ISO date-time */
  from?: string;
  to?: string;
}

/** The API returned 401: not signed in, or not an admin */
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
  /** Logs newer than `after` (a newestCursor), oldest-first chunks of up to `limit`, returned newest first */
  newer: (filters: LogFilters, after: string, limit = 100) => {
    const params = new URLSearchParams({ limit: String(limit), after });
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    return request<LogPage>(`/logs?${params}`);
  },
};
