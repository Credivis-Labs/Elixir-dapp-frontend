"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { shortAddress } from "@/lib/format";
import { addressKind } from "@/lib/strkey";

interface Props {
  address: string;
  label?: string;
  className?: string;
  full?: boolean;
  size?: "sm" | "md";
}

export function AddressChip({ address, label, className, full, size = "md" }: Props) {
  const [copied, setCopied] = useState(false);
  const kind = addressKind(address);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied" : address}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-sm)] bg-inset px-1.5 text-left hover:bg-line-strong",
        size === "sm" ? "h-6 text-[11.5px]" : "h-7 text-[12.5px]",
        className,
      )}
    >
      {kind && (
        <span
          className={cn(
            "grid size-4 shrink-0 place-items-center rounded-[3px] font-mono text-[10px] font-medium leading-none",
            kind === "C" ? "bg-accent text-accent-fg" : "bg-fg text-bg",
          )}
        >
          {kind}
        </span>
      )}
      {label && <span className="truncate font-medium">{label}</span>}
      <span className={cn("font-mono text-muted", label && "hidden sm:inline")}>
        {copied ? "copied" : full ? address : shortAddress(address)}
      </span>
    </button>
  );
}
