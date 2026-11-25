"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { parsePlayerSearch, RANGES, rangeLabel, type Filters } from "./filters";
import { shortId, shortLicense } from "./format";

interface FilterBarProps {
  filters: Filters;
  onChange: (next: Filters) => void;
}

const chipBase =
  "inline-flex h-8 items-center rounded-full px-3 text-sm transition-colors duration-150 ring-1 ring-inset";
const chipOff = "text-muted-foreground ring-border hover:text-foreground hover:ring-border-strong";
const chipOn = "bg-accent/15 text-accent ring-accent/40";

/**
 * Time + Player filters (script/type are picked in the Sidebar).
 * Render with key={current URL} — drafts reset whenever the applied filters change.
 * Time buttons apply instantly; Player applies on Enter.
 */
export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [player, setPlayer] = useState(filters.license || filters.player);
  const [showCustom, setShowCustom] = useState(filters.range === "custom");
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  function submitText(e: FormEvent) {
    e.preventDefault();
    set(parsePlayerSearch(player));
  }

  function submitCustom(e: FormEvent) {
    e.preventDefault();
    set({ range: "custom", from, to });
  }

  const timeButtons = [{ id: "", label: "All time" }, ...RANGES];

  return (
    <section aria-label="Filters" className="space-y-4 rounded-xl border border-border bg-card p-4">
      {/* Time */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Time range">
        <span className="mr-1 w-16 shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">Time</span>
        {timeButtons.map((r) => {
          const active = filters.range === r.id && !showCustom;
          return (
            <button
              key={r.id || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setShowCustom(false);
                set({ range: r.id, from: "", to: "" });
              }}
              className={`${chipBase} ${active ? chipOn : chipOff}`}
            >
              {r.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={showCustom}
          aria-expanded={showCustom}
          onClick={() => setShowCustom((v) => !v)}
          className={`${chipBase} ${showCustom ? chipOn : chipOff}`}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <form onSubmit={submitCustom} className="flex flex-wrap items-end gap-3 sm:pl-[4.75rem]">
          <Field label="From">
            <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </Field>
          <Field label="To">
            <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </Field>
          <button
            type="submit"
            disabled={!from && !to}
            className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-on-accent transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply
          </button>
        </form>
      )}

      <form onSubmit={submitText} className="max-w-xl">
        <SearchInput
          label="Player"
          placeholder="Discord ID or Rockstar license"
          value={player}
          onChange={setPlayer}
          onClear={() => set({ player: "", license: "" })}
        />
        <button type="submit" className="sr-only">
          Apply filters
        </button>
      </form>

      <ActiveFilters filters={filters} onChange={onChange} />
    </section>
  );
}

const inputClass =
  // text-base on mobile: iOS zooms into inputs smaller than 16px
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors duration-150 hover:border-border-strong focus:border-accent focus:outline-none";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-48 flex-1 sm:flex-none">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SearchInput(props: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        {props.label}
        <span className="text-muted-foreground/70">Press Enter</span>
      </span>
      <span className="relative block">
        <MagnifyingGlassIcon
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className={`${inputClass} pr-10 pl-9 font-mono`}
          spellCheck={false}
          autoComplete="off"
        />
        {props.value && (
          <button
            type="button"
            onClick={() => {
              props.onChange("");
              props.onClear();
            }}
            aria-label={`Clear ${props.label}`}
            className="absolute top-1/2 right-1 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <XIcon size={14} aria-hidden />
          </button>
        )}
      </span>
    </label>
  );
}

/** Applied filters as removable chips + Clear all */
function ActiveFilters({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  if (!filters.player && !filters.license && !filters.range) return null;

  const chips: { key: string; label: string; value: string; clear: Partial<Filters> }[] = [];
  if (filters.player) chips.push({ key: "player", label: "Discord", value: shortId(filters.player), clear: { player: "" } });
  if (filters.license)
    chips.push({ key: "license", label: "License", value: shortLicense(filters.license), clear: { license: "" } });
  const time = rangeLabel(filters);
  if (time) chips.push({ key: "time", label: "Time", value: time, clear: { range: "", from: "", to: "" } });

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
      <span className="sr-only">Active filters:</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex h-8 max-w-full items-center gap-1 rounded-full bg-muted pr-1 pl-3 text-sm"
        >
          <span className="text-muted-foreground">{chip.label}:</span>
          <span className="truncate font-mono">{chip.value}</span>
          <button
            type="button"
            onClick={() => onChange({ ...filters, ...chip.clear })}
            aria-label={`Remove ${chip.label} filter`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <XIcon size={12} aria-hidden />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...filters, player: "", license: "", range: "", from: "", to: "" })}
        className="h-8 rounded-full px-3 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
