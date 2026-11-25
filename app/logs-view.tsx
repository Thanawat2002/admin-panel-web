"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { LiveToggle, NewLogsButton } from "./components/live";

const MENU_REFRESH_MS = 60_000;
/** Live: ask the API for newer logs this often */
const POLL_MS = 4_000;
/** Live: follow-up requests per tick when the API says more new logs are waiting */
const MAX_CATCH_UP = 5;
/** Live: more held-back logs than this → offer a full refresh instead (keeps memory and the DOM small) */
const MAX_PENDING = 500;
/** Live: tab hidden longer than this → reload the first page instead of catching up */
const HIDDEN_RELOAD_MS = 60_000;
/** Live: highlight new rows for this long */
const FRESH_MS = 3_000;
/** Live: scrolled further than this → hold new logs behind the "new logs" button */
const HOLD_SCROLL_PX = 120;
const LIVE_STORAGE_KEY = "logs-live";

// Live on/off is remembered per browser. Storage can be unavailable (private mode etc.),
// so the in-memory value wins once the viewer has toggled in this tab.
let liveOverride: boolean | null = null;
const liveListeners = new Set<() => void>();

function readLivePreference(): boolean {
  if (liveOverride !== null) return liveOverride;
  try {
    return localStorage.getItem(LIVE_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribeLivePreference(listener: () => void) {
  liveListeners.add(listener);
  return () => {
    liveListeners.delete(listener);
  };
}

function setLivePreference(on: boolean) {
  liveOverride = on;
  try {
    localStorage.setItem(LIVE_STORAGE_KEY, on ? "on" : "off");
  } catch {}
  for (const listener of liveListeners) listener();
}

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

  // Live (polling)
  const live = useSyncExternalStore(subscribeLivePreference, readLivePreference, () => true);
  const [liveError, setLiveError] = useState(false);
  // new logs held back while the viewer is scrolled down or reading an expanded row
  const [pending, setPending] = useState<LogItem[]>([]);
  const [pendingOverflow, setPendingOverflow] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const pendingRef = useRef<LogItem[]>([]);
  // position of the newest log we have (shown or pending); polling asks for logs after it
  const headCursor = useRef<string | null>(null);
  const expandedCount = useRef(0);
  // a custom range that ends at a fixed time never gets new logs
  const liveBlocked = filters.range === "custom" && Boolean(filters.to);
  const liveActive = live && !liveBlocked;

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
    setPending([]);
    setPendingOverflow(false);
  }

  useEffect(() => {
    let cancelled = false;
    const requestedAt = Date.now();
    apiFilters.current = toApiFilters(readFilters(new URLSearchParams(filtersKey)), requestedAt);
    headCursor.current = null;
    pendingRef.current = [];
    api
      .logs(apiFilters.current)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        headCursor.current = page.newestCursor;
        setNow(requestedAt);
      })
      .catch((err) => !cancelled && handleError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, reloadKey]);

  function toggleLive() {
    setLivePreference(!live);
    setLiveError(false);
  }

  function markFresh(ids: string[]) {
    if (ids.length === 0) return;
    setFresh((prev) => new Set([...prev, ...ids]));
    setTimeout(() => {
      setFresh((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }, FRESH_MS);
  }

  function setPendingLogs(next: LogItem[]) {
    pendingRef.current = next;
    setPending(next);
  }

  /** Put logs (newest first) on top of the list, skipping any already shown */
  function prepend(newItems: LogItem[]) {
    if (newItems.length === 0) return;
    setItems((prev) => {
      const seen = new Set(prev.map((i) => i.id));
      return [...newItems.filter((i) => !seen.has(i.id)), ...prev];
    });
    markFresh(newItems.map((i) => i.id));
    setNow(Date.now());
  }

  /** Show the held-back logs (the "N new logs" button) */
  function showPending() {
    if (pendingOverflow) {
      setReloadKey((k) => k + 1);
    } else {
      prepend(pendingRef.current);
      setPendingLogs([]);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Live polling: every POLL_MS ask for logs newer than headCursor.
  // New logs go straight to the top, unless the viewer is scrolled down or has a row open —
  // then they wait behind the "N new logs" button so the list doesn't jump while reading.
  useEffect(() => {
    if (!liveActive || loading) return;
    let stopped = false;
    let inFlight = false;
    let hiddenAt: number | null = null;

    const holding = () => window.scrollY > HOLD_SCROLL_PX || expandedCount.current > 0;

    function deliver(newItems: LogItem[]) {
      if (pendingOverflow) {
        // too many were held back (some dropped) — reload rather than show a list with a gap
        if (!holding()) setReloadKey((k) => k + 1);
        return;
      }
      if (holding()) {
        if (newItems.length === 0) return;
        const seen = new Set(pendingRef.current.map((i) => i.id));
        const next = [...newItems.filter((i) => !seen.has(i.id)), ...pendingRef.current];
        if (next.length > MAX_PENDING) {
          setPendingOverflow(true);
          setPendingLogs(next.slice(0, MAX_PENDING));
        } else {
          setPendingLogs(next);
        }
        return;
      }
      // back at the top: show everything that was waiting too
      prepend([...newItems, ...pendingRef.current]);
      setPendingLogs([]);
    }

    async function tick() {
      if (stopped || inFlight || document.hidden) return;
      inFlight = true;
      try {
        if (!headCursor.current) {
          // nothing matched yet: check the first page again
          const page = await api.logs(apiFilters.current);
          if (stopped) return;
          if (page.items.length > 0) {
            headCursor.current = page.newestCursor;
            setItems(page.items);
            setNextCursor(page.nextCursor);
            markFresh(page.items.map((i) => i.id));
            setNow(Date.now());
          }
        } else {
          const collected: LogItem[] = [];
          for (let round = 0; round < MAX_CATCH_UP; round++) {
            const page = await api.newer(apiFilters.current, headCursor.current);
            if (stopped) return;
            headCursor.current = page.newestCursor ?? headCursor.current;
            collected.unshift(...page.items); // each chunk is newer than the last
            if (!page.hasNewer) break;
          }
          if (collected.length > 0 || (pendingRef.current.length > 0 && !holding() && !pendingOverflow)) {
            deliver(collected);
          }
        }
        setLiveError(false);
      } catch (err) {
        if (stopped) return;
        if (err instanceof UnauthorizedError) handleError(err);
        else setLiveError(true); // keep trying on the next tick
      } finally {
        inFlight = false;
      }
    }

    function onVisibility() {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = null;
      if (away > HIDDEN_RELOAD_MS && !holding()) setReloadKey((k) => k + 1);
      else void tick();
    }

    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveActive, loading, filtersKey, reloadKey, pendingOverflow]);

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
          <div className="flex items-center justify-between gap-3">
            <Breadcrumb
              resource={filters.resource}
              type={filters.type}
              onSelect={(s) => applyFilters({ ...filters, ...s })}
            />
            <LiveToggle on={live} blocked={liveBlocked} error={liveError} onToggle={toggleLive} />
          </div>

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
                  {liveActive && " New logs will appear automatically."}
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
              {pending.length > 0 && (
                <NewLogsButton count={pending.length} overflow={pendingOverflow} onClick={showPending} />
              )}
              <LogList
                items={items}
                now={now}
                fresh={fresh}
                onExpandedChange={(count) => (expandedCount.current = count)}
                onFilterType={(resource, type) => applyFilters({ ...filters, resource, type })}
                onFilterPlayer={(player) => applyFilters({ ...filters, player, license: "" })}
                onFilterLicense={(license) => applyFilters({ ...filters, license, player: "" })}
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
