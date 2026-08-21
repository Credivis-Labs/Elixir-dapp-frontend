"use client";

import Link from "next/link";
import { AccountGuard } from "@/components/shell/AccountGuard";
import { useActivity, useLabel, useProposalBuckets, useProposals, useSubaccounts } from "@/hooks/use-data";
import { useNow } from "@/hooks/use-clock";
import { useToast } from "@/hooks/use-toast";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { AddressChip } from "@/components/domain/AddressChip";
import { Amount } from "@/components/domain/Amount";
import { ProposalRow } from "@/components/domain/ProposalRow";
import { Timeline } from "@/components/domain/Timeline";
import { Sparkline } from "@/components/domain/Sparkline";
import { Vessels } from "@/components/domain/Vessels";
import { Icon } from "@/components/shell/Icons";
import { formatUsd, formatDuration, relativeTime } from "@/lib/format";
import type { Asset, ElixirAccount } from "@/lib/types";
import { cn } from "@/lib/cn";

export function DashboardView({ address }: { address: string }) {
  return <AccountGuard address={address}>{(account) => <Dashboard address={address} account={account} />}</AccountGuard>;
}

function Dashboard({ address, account }: { address: string; account: ElixirAccount }) {
  const subs = useSubaccounts(address);
  const proposals = useProposals(address);
  const buckets = useProposalBuckets(address);
  const activity = useActivity(address);
  const label = useLabel(address);
  const now = useNow(30_000);
  const { push } = useToast();

  const allBalances = subs.flatMap((s) => s.balances);
  const total = allBalances.reduce((s, b) => s + (b.usd ?? 0), 0);
  const stale = [...buckets.active, ...buckets.approved].filter((p) => p.configEpoch !== account.config.configEpoch);
  const openList = [...buckets.needsYou, ...buckets.active.filter((p) => !buckets.needsYou.includes(p)), ...buckets.approved];
  const base = `/a/${address}`;

  const assets = new Map<string, { asset: Asset; amount: bigint; usd: number }>();
  for (const b of allBalances) {
    const cur = assets.get(b.asset.code);
    assets.set(b.asset.code, { asset: b.asset, amount: (cur?.amount ?? 0n) + b.amount, usd: (cur?.usd ?? 0) + (b.usd ?? 0) });
  }

  async function copyAddress() {
    await navigator.clipboard.writeText(address);
    push({ title: "Address copied", detail: "This account is vessel 00 — deposits land here, never on a dead address.", tone: "ok" });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Hero: the number, what you can do, and the vessels. */}
      <section className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
        <div className="rise">
          <p className="eyebrow">{account.name} · {account.kind === "smart" ? "smart account" : "classic multisig"}</p>
          <p className="font-display mt-3 text-[56px] font-semibold leading-[0.95] tabular sm:text-[68px]">
            {formatUsd(total)}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            <AddressChip address={address} size="sm" />
            <span>
              <span className="font-mono text-fg">{account.threshold}</span> of <span className="font-mono text-fg">{account.signers.length}</span> to move
            </span>
            {account.config.timeLock > 0 && <span>{formatDuration(account.config.timeLock)} timelock</span>}
            <span>epoch {account.config.configEpoch}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <LinkButton href={`${base}/proposals/new`} variant="primary" className="gap-2">
              <Icon.send width={15} height={15} /> Send
            </LinkButton>
            <Button variant="secondary" onClick={copyAddress} className="gap-2">
              <Icon.receive width={15} height={15} /> Receive
            </Button>
            <LinkButton href={`${base}/proposals/new`} variant="secondary" className="gap-2">
              <Icon.plus width={15} height={15} /> Proposal
            </LinkButton>
          </div>
        </div>

        <div className="rise" style={{ animationDelay: "80ms" }}>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="eyebrow">Vessels · allocation</span>
            <Link href={`${base}/subaccounts`} className="text-[12px] text-muted hover:text-accent">
              Manage vessels →
            </Link>
          </div>
          <Vessels subs={subs} accountName={account.name} base={base} />
        </div>
      </section>

      {/* Pulse row: what needs attention, with the 30d line under it. */}
      <Card attention={buckets.needsYou.length > 0}>
        <CardBody className="grid gap-4 pt-5 sm:grid-cols-[repeat(3,auto)_1fr] sm:items-center">
          <Pulse href={`${base}/proposals?f=needs-you`} n={buckets.needsYou.length} label="need your signature" tone={buckets.needsYou.length ? "accent" : undefined} />
          <Pulse href={`${base}/proposals`} n={buckets.approved.length} label="in timelock" />
          <Pulse href={`${base}/proposals`} n={stale.length} label="stale" tone={stale.length ? "danger" : undefined} />
          <div className="flex items-center gap-3 sm:justify-self-end">
            <span className="eyebrow hidden sm:inline">30d</span>
            <Sparkline current={total} proposals={proposals} events={activity} className="h-10 w-full sm:w-44" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Proposals" eyebrow={`${openList.length} open`} action={<Link href={`${base}/proposals`} className="text-[13px] text-muted hover:text-accent">All proposals →</Link>} />
        <CardBody className="pt-0">
          {openList.length === 0 ? (
            <EmptyState title="Nothing open" action={<LinkButton href={`${base}/proposals/new`} variant="secondary" size="sm">New proposal</LinkButton>} />
          ) : (
            <div className="flex flex-col">
              {openList.slice(0, 6).map((p) => (
                <ProposalRow key={p.id} proposal={p} account={account} needsYou={buckets.needsYou.includes(p)} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card>
          <CardHeader title="Ledger" action={<Link href={`${base}/activity`} className="text-[13px] text-muted hover:text-accent">Full ledger →</Link>} />
          <Timeline events={activity} accountAddress={address} limit={6} label={label} className="pb-3" />
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Assets" eyebrow={`${assets.size}`} />
            <CardBody className="flex flex-col pt-0">
              {[...assets.values()].map((a, i) => (
                <div key={a.asset.code} className={cn("flex items-center justify-between py-2.5", i > 0 && "border-t border-line")}>
                  <span className="flex items-center gap-3">
                    <span className="grid size-7 place-items-center rounded-full bg-inset font-mono text-[10px]">{a.asset.code.slice(0, 2)}</span>
                    <Amount amount={a.amount} asset={a.asset} size="sm" />
                  </span>
                  <span className="font-mono text-[12px] text-muted tabular">{formatUsd(a.usd)}</span>
                </div>
              ))}
              {assets.size === 0 && <p className="py-3 text-[13px] text-muted">No assets yet.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Signers" eyebrow={`${account.threshold} of ${account.signers.length}`} action={<Link href={`${base}/signers`} className="text-[13px] text-muted hover:text-accent">Manage →</Link>} />
            <CardBody className="flex flex-col pt-0">
              {account.signers.map((s, i) => (
                <div key={s.address} className={cn("flex items-center justify-between gap-2 py-2", i > 0 && "border-t border-line")}>
                  <AddressChip address={s.address} label={s.label} size="sm" />
                  <span className="font-mono text-[11px] text-faint">{s.kind}</span>
                </div>
              ))}
              <p className="mt-2 text-[12px] text-faint">Last activity {relativeTime(account.lastActivity, now)}.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Pulse({ n, label, tone, href }: { n: number; label: string; tone?: "accent" | "danger"; href: string }) {
  return (
    <Link href={href} className="group flex items-baseline gap-2">
      <span className={cn("font-display text-[30px] font-semibold leading-none tabular", tone === "accent" && "text-accent", tone === "danger" && "text-danger", !tone && "text-fg")}>{n}</span>
      <span className="text-[13px] text-muted group-hover:text-fg">{label}</span>
    </Link>
  );
}
