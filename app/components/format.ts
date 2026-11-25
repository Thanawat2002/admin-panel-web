const numberFormat = new Intl.NumberFormat("en-US");
const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });
export const dateTimeFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "medium" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "just now", "5 min. ago", "3 hr. ago", "2 days ago" */
export function relativeTime(iso: string, now: number): string {
  const diff = new Date(iso).getTime() - now;
  if (Math.abs(diff) < 60_000) return "just now";
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === "minute") return relativeFormat.format(Math.round(diff / ms), unit);
  }
  return "";
}

export function formatValue(value: unknown): string {
  if (typeof value === "number") return numberFormat.format(value);
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
  return JSON.stringify(value);
}

/** { action: "add", amount: 5000 } → "action: add · amount: 5,000" */
export function summarize(data: Record<string, unknown>): string {
  const entries = Object.entries(data);
  if (entries.length === 0) return "No details";
  return entries.map(([key, value]) => `${key}: ${formatValue(value)}`).join(" · ");
}

export function shortId(identifier: string): string {
  return identifier.replace(/^discord:/, "");
}

// Each type always gets the same tone. Text is always shown too, so color isn't the only signal.
const TONES = [
  "bg-sky-400/10 text-sky-300 ring-sky-400/25",
  "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
  "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  "bg-rose-400/10 text-rose-300 ring-rose-400/25",
  "bg-violet-400/10 text-violet-300 ring-violet-400/25",
  "bg-teal-400/10 text-teal-300 ring-teal-400/25",
  "bg-orange-400/10 text-orange-300 ring-orange-400/25",
];

export function typeTone(type: string): string {
  let hash = 0;
  for (const ch of type) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return TONES[Math.abs(hash) % TONES.length]!;
}
