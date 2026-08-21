"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ActivityEvent } from "@/lib/types";
import { formatDate, relativeTime, shortAddress } from "@/lib/format";
import { useNow } from "@/hooks/use-clock";

const glyph: Record<ActivityEvent["kind"], { tone: string; char: string }> = {
  "proposal.created": { tone: "bg-sunken text-fg border-line-strong", char: "+" },
  "proposal.approved": { tone: "bg-accent-soft text-accent border-accent/40", char: "✓" },
  "proposal.rejected": { tone: "bg-danger-soft text-danger border-danger/40", char: "✕" },
  "proposal.executed": { tone: "bg-ok-soft text-ok border-ok/40", char: "→" },
  "proposal.cancelled": { tone: "bg-sunken text-muted border-line", char: "–" },
  "proposal.expired": { tone: "bg-sunken text-muted border-line", char: "⌛" },
  "account.reconfigured": { tone: "bg-attn-soft text-attn border-attn/40", char: "⟳" },
  "account.frozen": { tone: "bg-danger-soft text-danger border-danger/40", char: "❄" },
  "account.unfrozen": { tone: "bg-ok-soft text-ok border-ok/40", char: "☼" },
  "subaccount.deployed": { tone: "bg-accent-soft text-accent border-accent/40", char: "▣" },
  "transfer.in": { tone: "bg-ok-soft text-ok border-ok/40", char: "↓" },
};

export function Timeline({ events, accountAddress, limit, label, className }: { events: ActivityEvent[]; accountAddress: string; limit?: number; label?: (a: string) => string; className?: string }) {
  const now = useNow(30_000);
  const shown = limit ? events.slice(0, limit) : events;
  if (shown.length === 0) return <p className="text-sm text-muted px-5 py-4">Nothing yet.</p>;
  return (
    <ol className={cn("relative", className)}>
      {shown.map((e, i) => {
        const g = glyph[e.kind];
        const actor = e.actor ? (label?.(e.actor) || shortAddress(e.actor)) : null;
        return (
          <li key={e.id} className="grid grid-cols-[28px_1fr_auto] gap-x-3 px-5 py-2.5 relative">
            {i < shown.length - 1 && <span aria-hidden className="absolute left-[38px] top-8 bottom-0 w-px bg-line" />}
            <span className={cn("grid size-7 place-items-center rounded-full border text-[12px] font-medium", g.tone)} aria-hidden>
              {g.char}
            </span>
            <div className="min-w-0">
              <p className="text-sm leading-snug">
                {e.proposalId !== null ? (
                  <Link href={`/a/${accountAddress}/proposals/${e.proposalId}`} className="hover:underline underline-offset-2">
                    {e.detail}
                  </Link>
                ) : (
                  e.detail
                )}
              </p>
              <p className="text-[11.5px] text-muted mt-0.5 flex flex-wrap gap-x-2">
                {actor && <span>{actor}</span>}
                <span className="font-mono">ledger {e.ledger.toLocaleString()}</span>
                {e.txHash && <span className="font-mono">tx {e.txHash.slice(0, 8)}</span>}
              </p>
            </div>
            <time className="text-[11.5px] text-faint tabular whitespace-nowrap" title={formatDate(e.at)} dateTime={new Date(e.at * 1000).toISOString()}>
              {relativeTime(e.at, now)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
