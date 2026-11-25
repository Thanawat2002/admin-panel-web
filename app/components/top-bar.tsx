"use client";

import { ListIcon, ListMagnifyingGlassIcon, SignOutIcon } from "@phosphor-icons/react";
import type { SessionUser } from "@/lib/api";

interface TopBarProps {
  user: SessionUser | null;
  onSignOut: () => void;
  /** Opens the scripts drawer (below lg, where the sidebar is hidden) */
  onOpenMenu: () => void;
}

export function TopBar({ user, onSignOut, onOpenMenu }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-14 w-full items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open scripts menu"
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <ListIcon size={20} aria-hidden />
          </button>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <ListMagnifyingGlassIcon size={18} weight="bold" aria-hidden />
          </span>
          <span className="font-semibold">Admin Panel</span>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 rounded-full"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold"
              >
                {user.username.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="hidden text-sm sm:inline">{user.username}</span>
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            >
              <SignOutIcon size={18} aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
