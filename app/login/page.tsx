import { Suspense } from "react";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { LoginError } from "./login-error";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <ListMagnifyingGlassIcon size={22} weight="bold" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Admins only</p>
          </div>
        </div>

        <Suspense>
          <LoginError />
        </Suspense>

        {/* Plain link (not fetch): the API redirects to Discord */}
        <a
          href="/api/auth/login"
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 font-medium text-white transition-colors duration-150 hover:bg-[#4752C4]"
        >
          <DiscordIcon />
          Sign in with Discord
        </a>
      </div>
    </main>
  );
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2.1a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.7ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
    </svg>
  );
}
