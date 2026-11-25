"use client";

import { useState, type MouseEvent } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import type { DiscordProfile, LogItem } from "@/lib/api";
import { CopyButton } from "./copy-button";
import { dateTimeFormat, formatValue, relativeTime, shortId, shortLicense, summarize, typeTone } from "./format";

// One grid template for header + rows when the list is ≥48rem wide (container query, so the sidebar is
// taken into account). Narrower lists show each row as a stacked card.
const GRID = "@3xl:grid @3xl:grid-cols-[7.5rem_8rem_minmax(0,1fr)_9rem_minmax(0,1.6fr)_2.5rem] @3xl:items-center @3xl:gap-4";

interface LogListProps {
  items: LogItem[];
  now: number;
  onFilterType: (resource: string, type: string) => void;
  onFilterPlayer: (identifier: string) => void;
  onFilterLicense: (license: string) => void;
}

export function LogList({ items, now, onFilterType, onFilterPlayer, onFilterLicense }: LogListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="@container overflow-hidden rounded-xl border border-border bg-card">
      <div
        aria-hidden
        className={`hidden border-b border-border px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase ${GRID}`}
      >
        <span>Time</span>
        <span>Type</span>
        <span>Player</span>
        <span>Resource</span>
        <span>Details</span>
        <span />
      </div>
      <ul>
        {items.map((log) => (
          <LogRow
            key={log.id}
            log={log}
            now={now}
            open={expanded.has(log.id)}
            onToggle={() => toggle(log.id)}
            onFilterType={onFilterType}
            onFilterPlayer={onFilterPlayer}
            onFilterLicense={onFilterLicense}
          />
        ))}
      </ul>
    </div>
  );
}

interface LogRowProps {
  log: LogItem;
  now: number;
  open: boolean;
  onToggle: () => void;
  onFilterType: (resource: string, type: string) => void;
  onFilterPlayer: (identifier: string) => void;
  onFilterLicense: (license: string) => void;
}

function LogRow({ log, now, open, onToggle, onFilterType, onFilterPlayer, onFilterLicense }: LogRowProps) {
  const detailsId = `log-${log.id}`;
  const summary = summarize(log.data);

  // Clicking anywhere on the row toggles it, except on its own buttons
  function onRowClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest("button, a")) return;
    onToggle();
  }

  return (
    <li className="border-b border-border last:border-0">
      <div
        onClick={onRowClick}
        className={`flex cursor-pointer flex-col gap-2 px-4 py-3 transition-colors duration-150 hover:bg-muted/50 ${open ? "bg-muted/40" : ""} ${GRID}`}
      >
        {/* Mobile: type + time on one line */}
        <div className="flex items-center justify-between gap-3 @3xl:contents">
          <time
            dateTime={log.createdAt}
            title={dateTimeFormat.format(new Date(log.createdAt))}
            className="order-2 text-sm text-muted-foreground tabular-nums @3xl:order-none"
          >
            {relativeTime(log.createdAt, now)}
          </time>
          <div className="order-1 @3xl:order-none">
            <button
              type="button"
              onClick={() => onFilterType(log.resource, log.type)}
              title={`Show only ${log.type}`}
              className={`inline-flex h-6 max-w-full items-center rounded-md px-2 font-mono text-xs font-medium ring-1 ring-inset ${typeTone(log.type)}`}
            >
              <span className="truncate">{log.type}</span>
            </button>
          </div>
        </div>

        <div className="min-w-0">
          {log.identifier ? (
            <div className="flex min-w-0 items-center gap-2">
              <Avatar log={log} />
              <button
                type="button"
                onClick={() => onFilterPlayer(log.identifier!)}
                title="Show this player's logs"
                className="min-w-0 text-left hover:text-accent"
              >
                <span className="block truncate text-sm">{log.playerName ?? "Unknown"}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {log.discord ? (
                    discordName(log.discord)
                  ) : (
                    <span className="font-mono">{shortId(log.identifier)}</span>
                  )}
                </span>
              </button>
              <CopyButton value={shortId(log.identifier)} label="Copy Discord ID" className="h-6 w-6 justify-center" />
            </div>
          ) : log.license ? (
            <button
              type="button"
              onClick={() => onFilterLicense(log.license!)}
              title="Show logs for this license"
              className="min-w-0 text-left hover:text-accent"
            >
              <span className="block truncate text-sm">{log.playerName ?? "Unknown"}</span>
              <span className="block truncate font-mono text-xs text-muted-foreground">{shortLicense(log.license)}</span>
            </button>
          ) : (
            <span className="text-sm text-muted-foreground">{log.playerName ?? "—"}</span>
          )}
        </div>

        <span className="truncate font-mono text-xs text-muted-foreground @3xl:text-sm">{log.resource}</span>

        <span className="truncate font-mono text-xs text-foreground/90" title={summary}>
          {summary}
        </span>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={detailsId}
          aria-label={open ? "Hide details" : "Show details"}
          className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground @3xl:flex"
        >
          <CaretDownIcon
            size={16}
            aria-hidden
            className={`transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && <LogDetails id={detailsId} log={log} onFilterLicense={onFilterLicense} />}
    </li>
  );
}

/** "Display Name (@username)" or "@username" */
function discordName(profile: DiscordProfile): string {
  return profile.globalName && profile.globalName !== profile.username
    ? `${profile.globalName} (@${profile.username})`
    : `@${profile.username}`;
}

function Avatar({ log }: { log: LogItem }) {
  const letter = (log.playerName ?? log.discord?.username ?? "?").slice(0, 1).toUpperCase();
  if (log.discord) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={log.discord.avatarUrl}
        alt=""
        width={28}
        height={28}
        loading="lazy"
        className="h-7 w-7 shrink-0 rounded-full bg-muted"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
    >
      {letter}
    </span>
  );
}

function LogDetails({
  id,
  log,
  onFilterLicense,
}: {
  id: string;
  log: LogItem;
  onFilterLicense: (license: string) => void;
}) {
  const entries = Object.entries(log.data);
  return (
    <div id={id} className="border-t border-border bg-background/60 px-4 py-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Details</h3>
            <CopyButton
              value={JSON.stringify(log.data, null, 2)}
              label="Copy JSON"
              showLabel
              className="h-8 px-2 text-xs hover:bg-muted"
            />
          </div>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No details</p>
          ) : (
            <dl className="grid grid-cols-[minmax(6rem,auto)_minmax(0,1fr)] gap-x-4 gap-y-1.5 font-mono text-sm">
              {entries.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="[overflow-wrap:anywhere]">
                    {typeof value === "object" && value !== null ? (
                      <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                    ) : (
                      formatValue(value)
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Event</h3>
          <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Time</dt>
            <dd className="tabular-nums">{dateTimeFormat.format(new Date(log.createdAt))}</dd>
            <dt className="text-muted-foreground">Resource</dt>
            <dd className="font-mono">{log.resource}</dd>
            <dt className="text-muted-foreground">Character</dt>
            <dd className="[overflow-wrap:anywhere]">{log.playerName ?? "—"}</dd>
            <dt className="text-muted-foreground">Discord</dt>
            <dd className="[overflow-wrap:anywhere]">{log.discord ? discordName(log.discord) : "—"}</dd>
            <dt className="text-muted-foreground">Discord ID</dt>
            <dd className="font-mono [overflow-wrap:anywhere]">{log.identifier ? shortId(log.identifier) : "—"}</dd>
            <dt className="text-muted-foreground">License</dt>
            <dd className="min-w-0">
              {log.license ? (
                <span className="flex min-w-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onFilterLicense(log.license!)}
                    title="Show logs for this license"
                    className="min-w-0 text-left font-mono text-xs [overflow-wrap:anywhere] hover:text-accent"
                  >
                    {log.license}
                  </button>
                  <CopyButton value={log.license} label="Copy license" className="h-6 w-6 shrink-0 justify-center" />
                </span>
              ) : (
                "—"
              )}
            </dd>
            <dt className="text-muted-foreground">Log ID</dt>
            <dd className="font-mono text-xs [overflow-wrap:anywhere] text-muted-foreground">{log.id}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

export function LogListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="@container overflow-hidden rounded-xl border border-border bg-card" aria-busy="true" aria-label="Loading logs">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`flex flex-col gap-2 border-b border-border px-4 py-4 last:border-0 ${GRID}`}>
          {["w-16", "w-14", "w-28", "w-20", "w-48", "w-0"].map((w, j) => (
            <span key={j} className={`h-3.5 rounded bg-muted motion-safe:animate-pulse ${w}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
