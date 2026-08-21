"use client";

import { cn } from "@/lib/cn";
import type { GateResult } from "@/lib/gate";

// The signature element. Six real checks from elixir_queue::execute, drawn as a gate:
// each bar is a check; the gate opens only when every bar is lit.
export function ExecuteGate({ gate, className }: { gate: GateResult; className?: string }) {
  return (
    <div className={cn("rounded-[var(--radius-lg)] bg-elevated overflow-hidden glass", className)}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <span className="eyebrow">Execute gate</span>
          <p className="font-display text-[17px] font-semibold leading-tight">
            {gate.open ? "Open" : `${gate.checks.filter((c) => !c.pass).length} of ${gate.checks.length} blocking`}
          </p>
        </div>
        <GateGlyph checks={gate.checks.map((c) => c.pass)} />
      </div>
      <ol className="border-t border-line">
        {gate.checks.map((c, i) => (
          <li
            key={c.id}
            className={cn(
              "grid grid-cols-[20px_1fr] gap-x-3 px-5 py-2.5 text-sm",
              i > 0 && "border-t border-line/60",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-[3px] size-3.5 rounded-[3px] border",
                c.pass ? "bg-accent border-accent" : "bg-transparent border-danger",
              )}
            />
            <div className="min-w-0">
              <p className={cn("font-medium", !c.pass && "text-danger")}>{c.label}</p>
              <p className="text-xs text-muted">{c.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function GateGlyph({ checks }: { checks: boolean[] }) {
  return (
    <svg width="64" height="40" viewBox="0 0 64 40" aria-hidden className="shrink-0">
      {checks.map((ok, i) => (
        <rect
          key={i}
          x={4 + i * 10}
          y={ok ? 6 : 16}
          width="6"
          height={ok ? 28 : 18}
          rx="1.5"
          className={cn("transition-all duration-300", ok ? "fill-accent" : "fill-danger/60")}
        />
      ))}
      <rect x="0" y="34" width="64" height="2" className="fill-line-strong" />
    </svg>
  );
}
