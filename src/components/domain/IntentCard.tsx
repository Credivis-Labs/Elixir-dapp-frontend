"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Invocation } from "@/lib/types";
import { AddressChip } from "./AddressChip";
import { Amount } from "./Amount";
import { formatDuration } from "@/lib/format";

// Renders (contract, fn, args) as a human sentence, with raw args one click away.
// Never shows XDR. Labels come from the address book, not the backend.
export function IntentCard({ invocation, index, total, label, className }: { invocation: Invocation; index?: number; total?: number; label: (addr: string) => string; className?: string }) {
  const [raw, setRaw] = useState(false);
  const s = invocation.summary;

  return (
    <div className={cn("rounded-[var(--radius-md)] bg-sunken", className)}>
      <div className="flex items-start gap-3 px-4 py-3">
        {total !== undefined && total > 1 && (
          <span className="mt-0.5 font-mono text-[11px] text-faint tabular">
            {String((index ?? 0) + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {s.kind === "transfer" && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-muted">Send</span>
              <Amount amount={s.amount} asset={s.asset} />
              <span className="text-muted">to</span>
              <AddressChip address={s.to} label={label(s.to) || undefined} size="sm" />
              {!label(s.to) && <span className="text-[11px] text-attn font-medium">Not in address book</span>}
            </div>
          )}
          {s.kind === "reconfigure" && (
            <p className="text-sm">
              <span className="text-muted">Reconfigure rule {s.ruleId}:</span> {s.signerCount} signers, threshold{" "}
              <span className="font-mono">{s.threshold}-of-{s.signerCount}</span>.{" "}
              <span className="text-attn">Bumps config epoch — all pending proposals go stale.</span>
            </p>
          )}
          {s.kind === "freeze" && (
            <p className="text-sm">
              <span className="text-muted">Freeze</span> non-config execution for {formatDuration(s.durationSeconds)}.
            </p>
          )}
          {s.kind === "unfreeze" && <p className="text-sm">Clear the emergency freeze.</p>}
          {s.kind === "call" && (
            <p className="text-sm">
              {s.description}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
            <span className="font-mono">{invocation.fnName}()</span>
            <span>on</span>
            <AddressChip address={invocation.target} label={label(invocation.target) || undefined} size="sm" />
            <button type="button" onClick={() => setRaw((r) => !r)} className="ml-auto underline-offset-2 hover:underline">
              {raw ? "Hide args" : "Show args"}
            </button>
          </div>
        </div>
      </div>
      {raw && (
        <dl className="border-t border-line bg-inset px-4 py-3 font-mono text-[12px] grid grid-cols-[auto_auto_1fr] gap-x-4 gap-y-1">
          {invocation.args
            .filter((a) => !a.name.startsWith("__"))
            .map((a) => (
              <div key={a.name} className="contents">
                <dt className="text-muted">{a.name}</dt>
                <dd className="text-faint">{a.type}</dd>
                <dd className="break-all">{typeof a.value === "string" ? a.value : JSON.stringify(a.value)}</dd>
              </div>
            ))}
        </dl>
      )}
    </div>
  );
}
