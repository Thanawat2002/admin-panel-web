"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";

interface CopyButtonProps {
  value: string;
  /** Accessible name, e.g. "Copy Discord ID" */
  label: string;
  /** Show the label as text next to the icon */
  showLabel?: boolean;
  className?: string;
}

export function CopyButton({ value, label, showLabel = false, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked (e.g. insecure context) — nothing useful to do
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={showLabel ? undefined : label}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground ${className}`}
    >
      {copied ? <CheckIcon size={16} className="text-accent" aria-hidden /> : <CopyIcon size={16} aria-hidden />}
      {showLabel && <span>{copied ? "Copied" : label}</span>}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
