import type { LogFilters } from "@/lib/api";

/** Quick time ranges shown as buttons. "custom" uses from/to (datetime-local values in the viewer's timezone). */
export const RANGES = [
  { id: "1h", label: "1h", long: "Last hour", ms: 60 * 60 * 1000 },
  { id: "24h", label: "24h", long: "Last 24 hours", ms: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "7d", long: "Last 7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", label: "30d", long: "Last 30 days", ms: 30 * 24 * 60 * 60 * 1000 },
] as const;

/** Filter state as it lives in the URL (so links can be shared and Back works). */
export interface Filters {
  type: string;
  player: string;
  resource: string;
  range: string;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: Filters = { type: "", player: "", resource: "", range: "", from: "", to: "" };

const KEYS = Object.keys(EMPTY_FILTERS) as (keyof Filters)[];

export function readFilters(params: { get(name: string): string | null }): Filters {
  const filters = Object.fromEntries(KEYS.map((k) => [k, params.get(k) ?? ""])) as unknown as Filters;
  // older links only had from/to
  if (!filters.range && (filters.from || filters.to)) filters.range = "custom";
  return filters;
}

export function toSearch(filters: Filters): string {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = filters[key].trim();
    if (!value) continue;
    if ((key === "from" || key === "to") && filters.range !== "custom") continue;
    params.set(key, value);
  }
  return params.size ? `?${params}` : "";
}

export function hasFilters(filters: Filters): boolean {
  return Boolean(filters.type || filters.player || filters.resource || filters.range);
}

/** Convert to API query. `now` is passed in so relative ranges are fixed for the whole page set (load more stays consistent). */
export function toApiFilters(filters: Filters, now: number): LogFilters {
  const preset = RANGES.find((r) => r.id === filters.range);
  const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined);
  return {
    type: filters.type || undefined,
    identifier: filters.player.trim() || undefined,
    resource: filters.resource.trim() || undefined,
    from: preset ? new Date(now - preset.ms).toISOString() : filters.range === "custom" ? toIso(filters.from) : undefined,
    to: filters.range === "custom" ? toIso(filters.to) : undefined,
  };
}

export function rangeLabel(filters: Filters): string | null {
  const preset = RANGES.find((r) => r.id === filters.range);
  if (preset) return preset.long;
  if (filters.range === "custom") {
    const fmt = (v: string) => (v ? v.replace("T", " ") : "…");
    return `${fmt(filters.from)} → ${fmt(filters.to)}`;
  }
  return null;
}
