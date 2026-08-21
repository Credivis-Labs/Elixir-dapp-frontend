"use client";

import Link from "next/link";
import type { Subaccount } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

// The signature. Each sub-account is a glass column; the accent fill is its share
// of the whole treasury. Allocation at a glance, no legend needed.
export function Vessels({ subs, accountName, base, className }: { subs: Subaccount[]; accountName: string; base: string; className?: string }) {
  const totals = subs.map((s) => s.balances.reduce((acc, b) => acc + (b.usd ?? 0), 0));
  const grand = totals.reduce((a, b) => a + b, 0) || 1;
  const max = Math.max(...totals, 1);

  return (
    <div className={cn("grid gap-3", className)} style={{ gridTemplateColumns: `repeat(${subs.length}, minmax(0, 1fr))` }}>
      {subs.map((s, i) => {
        const share = totals[i]! / grand;
        const fill = totals[i]! / max;
        return (
          <Link key={s.index} href={`${base}/subaccounts/${s.index}`} className="group flex min-w-0 flex-col gap-2" title={`${s.index === 0 ? accountName : s.label}: ${formatUsd(totals[i]!)}`}>
            <div className="flex items-center justify-between px-0.5 font-mono text-[10.5px] text-faint">
              <span>{String(s.index).padStart(2, "0")}</span>
              <span className="tabular">{Math.round(share * 100)}%</span>
            </div>
            <div className="relative h-32 overflow-hidden rounded-t-[3px] rounded-b-[10px] border border-line-strong bg-sunken">
              <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-fg/10" />
              <div
                className="pour absolute inset-x-0 bottom-0"
                style={{ height: `${Math.max(fill * 88, s.deployed ? 3 : 0)}%`, animationDelay: `${i * 90}ms` }}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-accent" />
                <div className="absolute inset-0 bg-gradient-to-b from-accent/85 via-accent/70 to-accent/55" />
                <div aria-hidden className="absolute inset-y-0 left-[12%] w-[3px] bg-white/20 blur-[1px]" />
              </div>
              {!s.deployed && (
                <span className="absolute inset-x-0 bottom-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-faint">reserved</span>
              )}
            </div>
            <div className="min-w-0 px-0.5">
              <p className="truncate text-[13px] font-medium group-hover:text-accent">{s.index === 0 ? accountName : s.label}</p>
              <p className="font-mono text-[12px] text-muted tabular">{formatUsd(totals[i]!)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
