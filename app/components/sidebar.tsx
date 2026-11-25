"use client";

import { useState, type ReactNode } from "react";
import { CaretRightIcon, MagnifyingGlassIcon, StackIcon, XIcon } from "@phosphor-icons/react";
import type { MenuResource } from "@/lib/api";

export interface MenuSelection {
  resource: string;
  type: string;
}

interface SidebarProps {
  menu: MenuResource[] | null;
  selected: MenuSelection;
  onSelect: (selection: MenuSelection) => void;
}

const numberFormat = new Intl.NumberFormat("en-US", { notation: "compact" });

/** Script (resource) → type navigation with search. Counts are for the last 24 hours. */
export function Sidebar({ menu, selected, onSelect }: SidebarProps) {
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<Set<string>>(() => new Set(selected.resource ? [selected.resource] : []));

  // selection changed from outside (URL, clicking a type in the log list) → open that script
  const [lastResource, setLastResource] = useState(selected.resource);
  if (lastResource !== selected.resource) {
    setLastResource(selected.resource);
    if (selected.resource && !opened.has(selected.resource)) setOpened(new Set(opened).add(selected.resource));
  }

  const q = query.trim().toLowerCase();
  const visible = (menu ?? [])
    .map((r) => {
      if (!q || r.resource.toLowerCase().includes(q)) return r;
      // keep a script if one of its types matches, showing only those types
      const types = r.types.filter((t) => t.type.toLowerCase().includes(q));
      return types.length ? { ...r, types } : null;
    })
    .filter((r): r is MenuResource => r !== null);

  const total = (menu ?? []).reduce((sum, r) => sum + r.count24h, 0);

  function toggle(resource: string) {
    setOpened((prev) => {
      const next = new Set(prev);
      if (next.has(resource)) next.delete(resource);
      else next.add(resource);
      return next;
    });
  }

  return (
    <nav aria-label="Scripts" className="flex h-full min-h-0 flex-col">
      <div className="p-3">
        <label className="relative block">
          <span className="sr-only">Search scripts and types</span>
          <MagnifyingGlassIcon
            size={16}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scripts…"
            spellCheck={false}
            autoComplete="off"
            className="h-10 w-full rounded-lg border border-border bg-background pr-9 pl-9 text-base text-foreground placeholder:text-muted-foreground/70 transition-colors duration-150 hover:border-border-strong focus:border-accent focus:outline-none sm:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-1 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <XIcon size={14} aria-hidden />
            </button>
          )}
        </label>
      </div>

      <div className="flex items-center justify-between px-4 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        <span>Scripts</span>
        <span title="Logs in the last 24 hours">24h</span>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <li>
          <MenuItem
            label="All logs"
            count={menu ? total : null}
            active={!selected.resource && !selected.type}
            onClick={() => onSelect({ resource: "", type: "" })}
            icon={<StackIcon size={16} aria-hidden className="shrink-0" />}
          />
        </li>

        {menu === null &&
          Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="px-3 py-2.5">
              <span className="block h-3.5 w-3/4 rounded bg-muted motion-safe:animate-pulse" />
            </li>
          ))}

        {menu !== null && visible.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            {q ? `No scripts match “${query.trim()}”` : "No scripts have logged yet"}
          </li>
        )}

        {visible.map((r) => {
          const isSelected = selected.resource === r.resource;
          const isOpen = q !== "" || opened.has(r.resource);
          const listId = `types-${r.resource}`;
          return (
            <li key={r.resource}>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => toggle(r.resource)}
                  aria-expanded={isOpen}
                  aria-controls={listId}
                  aria-label={`${isOpen ? "Collapse" : "Expand"} ${r.resource}`}
                  className="flex h-9 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                >
                  <CaretRightIcon
                    size={12}
                    weight="bold"
                    aria-hidden
                    className={`transition-transform duration-150 motion-reduce:transition-none ${isOpen ? "rotate-90" : ""}`}
                  />
                </button>
                <MenuItem
                  label={r.resource}
                  count={r.count24h}
                  active={isSelected && !selected.type}
                  mono
                  onClick={() => onSelect({ resource: r.resource, type: "" })}
                />
              </div>

              {isOpen && (
                <ul id={listId} className="mb-1 ml-7 border-l border-border pl-2">
                  {r.types.map((t) => (
                    <li key={t.type}>
                      <MenuItem
                        label={t.type}
                        count={t.count24h}
                        active={isSelected && selected.type === t.type}
                        mono
                        small
                        onClick={() => onSelect({ resource: r.resource, type: t.type })}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MenuItem(props: {
  label: string;
  count: number | null;
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-current={props.active ? "page" : undefined}
      title={props.label}
      className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 text-left transition-colors duration-150 ${
        props.small ? "h-8 text-[13px]" : "h-9 text-sm"
      } ${
        props.active
          ? "bg-accent/15 font-medium text-accent"
          : "text-foreground/85 hover:bg-muted hover:text-foreground"
      } w-full`}
    >
      {props.icon}
      <span className={`min-w-0 flex-1 truncate ${props.mono ? "font-mono" : ""}`}>{props.label}</span>
      {props.count !== null && (
        <span
          className={`shrink-0 text-xs tabular-nums ${props.active ? "text-accent" : "text-muted-foreground"} ${props.count === 0 ? "opacity-50" : ""}`}
          aria-label={`${props.count} logs in the last 24 hours`}
        >
          {numberFormat.format(props.count)}
        </span>
      )}
    </button>
  );
}
