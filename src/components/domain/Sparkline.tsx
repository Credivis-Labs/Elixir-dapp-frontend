"use client";

import { useMemo } from "react";
import type { ActivityEvent, Proposal } from "@/lib/types";
import { useNow } from "@/hooks/use-clock";

// Balance history reconstructed from executed outflows + indexed inflows.
// Good enough for shape; the indexer will provide real per-ledger snapshots.
export function Sparkline({ current, proposals, events, days = 30, className }: { current: number; proposals: Proposal[]; events: ActivityEvent[]; days?: number; className?: string }) {
  const now = useNow(60_000);
  const points = useMemo(() => {
    const start = now - days * 86400;
    const deltas: { at: number; d: number }[] = [];
    for (const p of proposals) {
      if (p.status !== "Executed" || !p.executedAt || p.executedAt < start) continue;
      for (const inv of p.invocations) {
        if (inv.summary.kind === "transfer") deltas.push({ at: p.executedAt, d: -Number(inv.summary.amount) / 1e7 });
      }
    }
    for (const e of events) {
      if (e.kind === "transfer.in" && e.at >= start) {
        const m = e.detail.match(/([\d,]+(?:\.\d+)?)/);
        if (m) deltas.push({ at: e.at, d: Number(m[1]!.replace(/,/g, "")) });
      }
    }
    deltas.sort((a, b) => b.at - a.at);
    const series: number[] = [];
    let v = current;
    let i = 0;
    for (let t = now; t >= start; t -= 86400) {
      series.push(v);
      while (i < deltas.length && deltas[i]!.at > t - 86400) {
        v -= deltas[i]!.d;
        i++;
      }
    }
    return series.reverse();
  }, [current, proposals, events, days, now]);

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(max - min, Math.abs(max) * 0.04, 1);
  const w = 100;
  const h = 40;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * w).toFixed(2)},${(h - ((p - min) / span) * (h - 6) - 3).toFixed(2)}`).join(" ");
  const up = points[points.length - 1]! >= points[0]!;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-label={`${days}-day balance history`}>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={up ? "var(--accent)" : "var(--fg-muted)"} stopOpacity="0.25" />
          <stop offset="100%" stopColor={up ? "var(--accent)" : "var(--fg-muted)"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#spark)" />
      <path d={path} fill="none" stroke={up ? "var(--accent)" : "var(--fg-muted)"} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
