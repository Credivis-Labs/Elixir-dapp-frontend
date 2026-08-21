"use client";

import Link from "next/link";
import type { Asset, ElixirAccount, Proposal } from "@/lib/types";
import { VoteBar } from "./VoteBar";
import { formatAmount, formatDate, relativeTime, shortAddress } from "@/lib/format";
import { useNow } from "@/hooks/use-clock";
import { useLabel } from "@/hooks/use-data";
import { cn } from "@/lib/cn";

// A ledger line. Mono id in the margin, a verb, the title, the amount, the
// destination, the age, and the state as small caps — no pills. Accent marks
// only the rows waiting on you.
export function ProposalRow({ proposal, account, needsYou }: { proposal: Proposal; account: ElixirAccount; needsYou?: boolean }) {
  const now = useNow(30_000);
  const label = useLabel(account.address);
  const stale = proposal.configEpoch !== account.config.configEpoch;
  const first = proposal.invocations[0]?.summary;
  const open = proposal.status === "Active" || proposal.status === "Approved";

  const totals = new Map<string, { asset: Asset; amount: bigint }>();
  let dest: string | null = null;
  for (const inv of proposal.invocations) {
    if (inv.summary.kind !== "transfer") continue;
    const cur = totals.get(inv.summary.asset.code);
    totals.set(inv.summary.asset.code, { asset: inv.summary.asset, amount: (cur?.amount ?? 0n) + inv.summary.amount });
    dest = dest === null ? inv.summary.to : dest === inv.summary.to ? dest : "multiple";
  }

  const kind = first?.kind ?? "call";
  const verb = kind === "transfer" ? "Send" : kind === "reconfigure" ? "Reconfigure" : kind === "freeze" ? "Freeze" : kind === "unfreeze" ? "Unfreeze" : "Call";
  const state = stale && open ? "stale" : proposal.status.toLowerCase();
  const stateTone = stale && open ? "text-danger" : needsYou ? "text-accent" : proposal.status === "Approved" ? "text-ok" : proposal.status === "Active" ? "text-fg" : "text-faint";

  return (
    <Link
      href={`/a/${account.address}/proposals/${proposal.id}`}
      className={cn(
        "group relative grid grid-cols-[44px_1fr_auto] items-center gap-x-3 gap-y-2 border-t border-line py-3.5 first:border-t-0 hover:bg-sunken/50",
        "sm:grid-cols-[44px_minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1fr)_80px_88px]",
        "-mx-5 px-5",
      )}
    >
      {needsYou && <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-accent" />}
      <span className="font-mono text-[11px] text-faint tabular">{String(proposal.id).padStart(3, "0")}</span>

      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="text-[14px] font-medium">{verb}</span>
          <span className="truncate text-[13px] text-muted group-hover:text-fg">{proposal.title}</span>
          {proposal.invocations.length > 1 && <span className="font-mono text-[10.5px] text-faint">×{proposal.invocations.length}</span>}
        </span>
      </span>

      <span className="hidden min-w-0 sm:block">
        {[...totals.values()].slice(0, 2).map((t) => (
          <span key={t.asset.code} className="block font-mono text-[13px] tabular">
            {formatAmount(t.amount, t.asset.decimals)} <span className="text-[11px] text-muted">{t.asset.code}</span>
          </span>
        ))}
        {totals.size === 0 && first?.kind === "reconfigure" && <span className="font-mono text-[13px]">{first.threshold}-of-{first.signerCount}</span>}
        {totals.size === 0 && first?.kind === "call" && <span className="block truncate text-[12.5px] text-muted">{first.description}</span>}
      </span>

      <span className="hidden min-w-0 truncate text-[12.5px] text-muted sm:block">
        {dest && dest !== "multiple" && <>→ <span className="text-fg">{label(dest) || shortAddress(dest)}</span></>}
        {dest === "multiple" && <>→ <span className="text-fg">{proposal.invocations.length} recipients</span></>}
        {!dest && open && <VoteBar proposal={proposal} account={account} className="max-w-[120px]" />}
      </span>

      <span className="hidden font-mono text-[11.5px] text-faint tabular sm:block" title={formatDate(proposal.createdAt)}>
        {relativeTime(proposal.createdAt, now)}
      </span>

      <span className={cn("justify-self-end text-[11px] font-medium uppercase tracking-[0.12em]", stateTone)}>{needsYou ? "sign" : state}</span>

      {open && dest && (
        <span className="col-span-3 sm:col-span-6 sm:pl-[56px]">
          <VoteBar proposal={proposal} account={account} />
        </span>
      )}
    </Link>
  );
}
