"use client";

import { ArrowUpIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";

/** Live on/off switch with a status dot (green = live, amber = can't reach the API, grey = paused) */
export function LiveToggle({
  on,
  blocked,
  error,
  onToggle,
}: {
  on: boolean;
  /** Custom time range with an end time: there can't be new logs */
  blocked: boolean;
  error: boolean;
  onToggle: () => void;
}) {
  const active = on && !blocked;
  const label = blocked ? "Live off for this range" : !on ? "Paused" : error ? "Reconnecting…" : "Live";
  const title = blocked
    ? "Live updates need a time range without an end time"
    : on
      ? "New logs appear automatically. Click to pause."
      : "Click to show new logs automatically";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      disabled={blocked}
      title={title}
      className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-sm ring-1 ring-inset transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? error
            ? "bg-amber-400/10 text-amber-300 ring-amber-400/30"
            : "bg-accent/15 text-accent ring-accent/40"
          : "text-muted-foreground ring-border hover:text-foreground hover:ring-border-strong"
      }`}
    >
      <span aria-hidden className="relative flex h-2 w-2">
        {active && !error && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            active ? (error ? "bg-amber-400" : "bg-accent") : "bg-muted-foreground/60"
          }`}
        />
      </span>
      <span aria-live="polite">{label}</span>
    </button>
  );
}

/**
 * Floating "N new logs" pill shown while new logs are held back (viewer scrolled down or reading a row).
 * Zero-height sticky wrapper so it floats over the list without pushing anything down.
 */
export function NewLogsButton({
  count,
  overflow,
  onClick,
}: {
  count: number;
  /** Too many to keep: clicking reloads instead */
  overflow: boolean;
  onClick: () => void;
}) {
  return (
    <div className="sticky top-16 z-10 flex h-0 justify-center">
      <button
        type="button"
        onClick={onClick}
        className="flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-on-accent shadow-lg shadow-black/30 transition-opacity duration-150 hover:opacity-90"
      >
        {overflow ? <ArrowClockwiseIcon size={14} aria-hidden /> : <ArrowUpIcon size={14} aria-hidden />}
        {overflow
          ? `${count.toLocaleString("en-US")}+ new logs · refresh`
          : `${count.toLocaleString("en-US")} new ${count === 1 ? "log" : "logs"}`}
      </button>
    </div>
  );
}
