"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowClockwiseIcon,
  CaretRightIcon,
  SpinnerGapIcon,
  TrayIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { api, UnauthorizedError, type LogFilters, type LogItem, type MenuResource, type SessionUser } from "@/lib/api";
import { TopBar } from "./components/top-bar";
import { FilterBar } from "./components/filter-bar";
import { LogList, LogListSkeleton } from "./components/log-list";
import { Sidebar, type MenuSelection } from "./components/sidebar";
import { EMPTY_FILTERS, hasFilters, readFilters, toApiFilters, toSearch, type Filters } from "./components/filters";

const MENU_REFRESH_MS = 60_000;

export function LogsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = readFilters(searchParams);
  const filtersKey = searchParams.toString();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [menu, setMenu] = useState<MenuResource[] | null>(null);
  const [items, setItems] = useState<LogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  // filters actually sent for the current page set, reused by "Load more"
  const apiFilters = useRef<LogFilters>({});
  const drawer = useRef<HTMLDialogElement>(null);

  function handleError(err: unknown) {
    if (err instanceof UnauthorizedError) router.replace("/login");
    else setError(err instanceof Error ? err.message : String(err));
  }

  useEffect(() => {
    const loadMenu = () => api.menu().then(setMenu).catch(handleError);
    api.me().then(setUser).catch(handleError);
    loadMenu();
    const menuTimer = setInterval(loadMenu, MENU_REFRESH_MS);
    // keep "5 min ago" labels fresh
    const clockTimer = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearInterval(menuTimer);
      clearInterval(clockTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL filters changed (or Retry) → reset during render, then fetch in the effect below
  const loadKey = `${filtersKey}#${reloadKey}`;
  const [syncedKey, setSyncedKey] = useState(loadKey);
  if (syncedKey !== loadKey) {
    setSyncedKey(loadKey);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    const requestedAt = Date.now();
    apiFilters.current = toApiFilters(readFilters(new URLSearchParams(filtersKey)), requestedAt);
    api
      .logs(apiFilters.current)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setNow(requestedAt);
      })
      .catch((err) => !cancelled && handleError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, reloadKey]);

  // push (not replace) so the browser Back button steps through previous filters
  function applyFilters(next: Filters) {
    router.push(`/${toSearch(next)}`, { scroll: false });
  }

  function selectScript(selection: MenuSelection) {
    drawer.current?.close();
    applyFilters({ ...filters, ...selection });
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await api.logs(apiFilters.current, nextCursor);
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      handleError(err);
    } finally {
      setLoadingMore(false);
    }
  }

  async function signOut() {
    await api.logout().catch(() => {});
    router.replace("/login");
  }

  const selection = { resource: filters.resource, type: filters.type };
  const filtered = hasFilters(filters);

  return (
    <>
      <TopBar user={user} onSignOut={signOut} onOpenMenu={() => drawer.current?.showModal()} />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-72 shrink-0 border-r border-border lg:block">
          <Sidebar menu={menu} selected={selection} onSelect={selectScript} />
        </aside>

        {/* Mobile drawer: native <dialog> gives focus trap + Esc to close */}
        <dialog
          ref={drawer}
          aria-label="Scripts"
          onClick={(e) => e.target === e.currentTarget && drawer.current?.close()}
          className="m-0 h-dvh max-h-none w-80 max-w-[85vw] border-r border-border bg-card p-0 text-foreground backdrop:bg-black/60 lg:hidden"
        >
          <div className="flex h-full flex-col">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="font-semibold">Scripts</span>
              <button
                type="button"
                onClick={() => drawer.current?.close()}
                aria-label="Close scripts menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon size={18} aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <Sidebar menu={menu} selected={selection} onSelect={selectScript} />
            </div>
          </div>
        </dialog>

        <main className="min-w-0 flex-1 space-y-4 px-4 py-6 lg:px-6">
          <Breadcrumb
            resource={filters.resource}
            type={filters.type}
            onSelect={(s) => applyFilters({ ...filters, ...s })}
          />

          <FilterBar key={filtersKey} filters={filters} onChange={applyFilters} />

          {error && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm">
              <WarningCircleIcon size={18} className="shrink-0 text-red-300" aria-hidden />
              <span className="flex-1 text-red-200">{error}</span>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="flex h-8 items-center gap-1.5 rounded-lg px-3 font-medium text-red-100 ring-1 ring-red-300/40 ring-inset hover:bg-destructive/20"
              >
                <ArrowClockwiseIcon size={14} aria-hidden />
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <LogListSkeleton />
          ) : items.length === 0 ? (
            !error && (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-4 py-16 text-center">
                <TrayIcon size={32} className="text-muted-foreground" aria-hidden />
                <p className="mt-3 font-medium">No logs found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {filtered ? "Try a different script, player or time range." : "Logs from the server will show up here."}
                </p>
                {filtered && (
                  <button
                    type="button"
                    onClick={() => applyFilters(EMPTY_FILTERS)}
                    className="mt-4 h-9 rounded-lg px-4 text-sm font-medium ring-1 ring-border ring-inset hover:bg-muted"
                  >
                    Show all logs
                  </button>
                )}
              </div>
            )
          ) : (
            <>
              <LogList
                items={items}
                now={now}
                onFilterType={(resource, type) => applyFilters({ ...filters, resource, type })}
                onFilterPlayer={(player) => applyFilters({ ...filters, player })}
              />
              <div className="flex flex-col items-center gap-3 py-2 sm:flex-row sm:justify-between">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  Showing {items.length.toLocaleString("en-US")} {items.length === 1 ? "log" : "logs"}
                  {!nextCursor && " · end of results"}
                </p>
                {nextCursor && (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex h-10 items-center gap-2 rounded-lg bg-muted px-4 text-sm font-medium transition-colors duration-150 hover:bg-border disabled:cursor-wait disabled:opacity-60"
                  >
                    {loadingMore && <SpinnerGapIcon size={16} className="motion-safe:animate-spin" aria-hidden />}
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

/** "All logs" or "pp_inventory › item.drop" — each part clickable, ✕ goes back to all logs */
function Breadcrumb({
  resource,
  type,
  onSelect,
}: {
  resource: string;
  type: string;
  onSelect: (selection: MenuSelection) => void;
}) {
  if (!resource && !type) return <h1 className="text-lg font-semibold">All logs</h1>;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <h1 className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-lg font-semibold">
        <button
          type="button"
          onClick={() => onSelect({ resource: "", type: "" })}
          className="font-sans text-muted-foreground hover:text-foreground"
        >
          All logs
        </button>
        <CaretRightIcon size={14} aria-hidden className="text-muted-foreground" />
        {resource && (
          <button
            type="button"
            onClick={() => onSelect({ resource, type: "" })}
            disabled={!type}
            className={`truncate ${type ? "text-muted-foreground hover:text-foreground" : "cursor-default"}`}
          >
            {resource}
          </button>
        )}
        {resource && type && <CaretRightIcon size={14} aria-hidden className="text-muted-foreground" />}
        {type && <span className="truncate">{type}</span>}
      </h1>
      <button
        type="button"
        onClick={() => onSelect({ resource: "", type: "" })}
        aria-label="Show all logs"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <XIcon size={14} aria-hidden />
      </button>
    </div>
  );
}
