"use client";

import Link from "next/link";
import { useAccounts } from "@/hooks/use-data";
import { useWallet } from "@/hooks/use-wallet";
import { useClient, useClientVersion } from "@/hooks/use-client";
import { useNow } from "@/hooks/use-clock";
import { PageHeader } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { KindPill } from "@/components/domain/StatusPill";
import { AddressChip } from "@/components/domain/AddressChip";
import { Pill } from "@/components/ui/Pill";
import { formatUsd, relativeTime } from "@/lib/format";
import { ROLE_VOTE } from "@/lib/types";

export function AccountsView() {
  const accounts = useAccounts();
  const { session, openSheet } = useWallet();
  const client = useClient();
  useClientVersion();
  const now = useNow(30_000);

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Accounts" />
        <EmptyState title="Connect to see your accounts" body="Elixir lists every account where your key is a signer." action={<Button onClick={openSheet}>Connect a signer</Button>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Accounts"
        description="Every Elixir account where your connected key is a signer."
        action={<LinkButton href="/accounts/new">New account</LinkButton>}
      />

      {accounts.length === 0 ? (
        <EmptyState title="No accounts yet" body="Create a smart account for policy-governed custody, or a classic G-account multisig if you need SDEX and trustline operations." action={<LinkButton href="/accounts/new">Create one</LinkButton>} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {accounts.map((a) => {
            const balances = client.getBalances(a.address);
            const total = balances.reduce((s, b) => s + (b.usd ?? 0), 0);
            const proposals = client.listProposals(a.address);
            const me = a.signers.find((s) => s.address === session.address);
            const needsYou = me && me.roles & ROLE_VOTE ? proposals.filter((p) => p.status === "Active" && !p.votes.some((v) => v.signer === me.address)).length : 0;
            const frozen = a.config.frozenUntil > now;
            return (
              <li key={a.address}>
                <Link href={`/a/${a.address}`} className="group block rounded-[var(--radius-lg)] bg-elevated p-5 hover:bg-sunken">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-semibold leading-tight truncate group-hover:underline underline-offset-2">{a.name}</h2>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <KindPill kind={a.kind} />
                        <Pill tone="faint">{a.threshold}-of-{a.signers.length}</Pill>
                        {a.config.queue && <Pill tone="faint">queue</Pill>}
                        {frozen && <Pill tone="danger" dot>frozen</Pill>}
                        {needsYou > 0 && <Pill tone="attn">{needsYou} need you</Pill>}
                      </div>
                    </div>
                    <span className="font-display text-[22px] font-semibold tabular shrink-0">{formatUsd(total)}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
                    <AddressChip address={a.address} size="sm" />
                    <span>active {relativeTime(a.lastActivity, now)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
