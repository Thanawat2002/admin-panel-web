"use client";

import { useSearchParams } from "next/navigation";
import { WarningCircleIcon } from "@phosphor-icons/react";

/** Errors the API sends back via /login?error=... (see admin-panel/api/src/auth.ts) */
const MESSAGES: Record<string, string> = {
  forbidden: "This Discord account doesn't have access.",
  invalid_state: "Your sign-in expired. Please try again.",
  discord_failed: "Couldn't reach Discord. Please try again.",
};

export function LoginError() {
  const error = useSearchParams().get("error");
  if (!error) return null;
  return (
    <p role="alert" className="mt-5 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-red-300">
      <WarningCircleIcon size={18} className="mt-0.5 shrink-0" aria-hidden />
      {MESSAGES[error] ?? "Sign-in failed. Please try again."}
    </p>
  );
}
