"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountGuard } from "@/components/shell/AccountGuard";
import { useProposals, useSubaccounts } from "@/hooks/use-data";
import { useDeploySubaccount, useRenameSubaccount } from "@/hooks/use-actions";
import { Card, CardBody, CardHeader, PageHeader, Stat } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { EmptyState, KeyValue, Notice } from "@/components/ui/Misc";
import { Pill } from "@/components/ui/Pill";
import { AddressChip } from "@/components/domain/AddressChip";
import { Amount } from "@/components/domain/Amount";
import { ProposalRow } from "@/components/domain/ProposalRow";
import { formatUsd } from "@/lib/format";
import type { ElixirAccount } from "@/lib/types";

export function SubaccountsView({ address }: { address: string }) {
  return <AccountGuard address={address}>{(account) => <List address={address} account={account} />}</AccountGuard>;
}

function List({ address, account }: { address: string; account: ElixirAccount }) {
  const subs = useSubaccounts(address);
  const deploy = useDeploySubaccount(address);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");

  if (account.kind === "classic") {
    return (
      <div>
        <PageHeader title="Sub-accounts" eyebrow={account.name} />
        <EmptyState title="Classic accounts don't have sub-accounts" body="Sub-accounts are deployed contracts that delegate auth to a parent smart account. A classic G-account is a single address." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Sub-accounts"
        eyebrow={account.name}
        description="Segregated addresses under one policy set. Each is a deployed contract whose auth delegates to this account. Policies can be scoped per sub-account."
        action={<Button onClick={() => setOpen(true)}>New sub-account</Button>}
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subs.map((s) => {
          const total = s.balances.reduce((acc, b) => acc + (b.usd ?? 0), 0);
          return (
            <li key={s.index}>
              <Link href={`/a/${address}/subaccounts/${s.index}`} className="group block h-full rounded-[var(--radius-lg)] bg-elevated p-5 hover:bg-sunken">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] text-faint">#{s.index}</span>
                    <h2 className="font-display text-lg font-semibold leading-tight group-hover:underline underline-offset-2">{s.index === 0 ? account.name : s.label}</h2>
                  </div>
                  {s.deployed ? <Pill tone="ok">deployed</Pill> : <Pill tone="attn">pending deploy</Pill>}
                </div>
                <p className="font-display text-[22px] font-semibold tabular mt-3">{formatUsd(total)}</p>
                <div className="mt-2 flex flex-col gap-1">
                  {s.balances.slice(0, 3).map((b) => (
                    <Amount key={b.asset.code} amount={b.amount} asset={b.asset} size="sm" className="text-muted" />
                  ))}
                  {s.balances.length === 0 && <span className="text-xs text-muted">Empty</span>}
                </div>
                <div className="mt-4">
                  <AddressChip address={s.address} size="sm" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New sub-account"
        description={`Reserves index #${account.config.subaccounts}. The address is deterministic from (parent, index), so it is known now; a deploy proposal is opened for signers to approve.`}
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button pending={deploy.pending} disabled={!label.trim()} onClick={async () => { const s = await deploy.run(label.trim()); if (s) { setOpen(false); setLabel(""); } }}>
              Reserve &amp; propose deploy
            </Button>
          </>
        }
      >
        <Field label="Label" hint="Off-chain. Shown to signers and in the address book.">
          {(id) => <Input id={id} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Market making" autoFocus />}
        </Field>
      </Dialog>
    </div>
  );
}

export function SubaccountDetailView({ address, index }: { address: string; index: number }) {
  return <AccountGuard address={address}>{(account) => <Detail address={address} index={index} account={account} />}</AccountGuard>;
}

function Detail({ address, index, account }: { address: string; index: number; account: ElixirAccount }) {
  const subs = useSubaccounts(address);
  const proposals = useProposals(address);
  const rename = useRenameSubaccount(address);
  const sub = subs.find((s) => s.index === index);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(sub?.label ?? "");

  if (!sub) return <EmptyState title={`No sub-account #${index}`} action={<LinkButton href={`/a/${address}/subaccounts`} variant="secondary">All sub-accounts</LinkButton>} />;

  const related = proposals.filter((p) => (index === 0 ? p.subaccount === null : p.subaccount === sub.address));
  const total = sub.balances.reduce((acc, b) => acc + (b.usd ?? 0), 0);
  const name = index === 0 ? account.name : sub.label;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href={`/a/${address}/subaccounts`} className="hover:underline underline-offset-2">← Sub-accounts</Link>}
        title={<span className="flex items-center gap-3"><span className="font-mono text-[20px] text-faint">#{index}</span>{name}</span>}
        description={<span className="flex flex-wrap items-center gap-2"><AddressChip address={sub.address} full />{sub.deployed ? <Pill tone="ok">deployed</Pill> : <Pill tone="attn">pending deploy</Pill>}</span>}
        action={
          <>
            {index > 0 && <Button variant="secondary" onClick={() => { setLabel(sub.label); setEditing(true); }}>Rename</Button>}
            <LinkButton href={`/a/${address}/proposals/new`}>New proposal</LinkButton>
          </>
        }
      />

      {!sub.deployed && (
        <Notice tone="attn">
          Not deployed yet. The address is final — funds sent here are recoverable once the deploy proposal executes, pending the SAC-to-undeployed-address spike (ARCHITECTURE §9.1). Until that is confirmed on testnet, don&apos;t route external deposits here.
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <Stat label="Value" value={formatUsd(total)} sub={`${sub.balances.length} asset${sub.balances.length === 1 ? "" : "s"}`} />
            <div className="mt-4 flex flex-col gap-2">
              {sub.balances.map((b) => (
                <div key={b.asset.code} className="flex items-center justify-between border-t border-line/60 pt-2">
                  <Amount amount={b.amount} asset={b.asset} />
                  <span className="text-xs text-muted tabular">{formatUsd(b.usd)}</span>
                </div>
              ))}
              {sub.balances.length === 0 && <p className="text-sm text-muted">No assets.</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="How auth works here" />
            <CardBody>
              <KeyValue
                rows={[
                  { k: "Parent", v: <AddressChip address={address} label={account.name} size="sm" /> },
                  { k: "Policy", v: index === 0 ? "Account rules apply directly" : "Delegates __check_auth to parent via CAP-71; rules scoped to this address apply" },
                  { k: "Signs as", v: <span className="font-mono text-xs">{sub.address.slice(0, 8)}…</span> },
                ]}
              />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Proposals acting as this address" eyebrow={`${related.length}`} />
          {related.length === 0 ? (
            <CardBody><EmptyState title="None yet" body="Proposals that pick this sub-account in “Act as” show up here." /></CardBody>
          ) : (
            <div className="flex flex-col px-5 pb-2">{related.map((p) => <ProposalRow key={p.id} proposal={p} account={account} />)}</div>
          )}
        </Card>
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)} title="Rename sub-account" width="sm"
        footer={<><Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button><Button pending={rename.pending} disabled={!label.trim()} onClick={async () => { await rename.run(index, label.trim()); setEditing(false); }}>Save</Button></>}
      >
        <Field label="Label">{(id) => <Input id={id} value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />}</Field>
      </Dialog>
    </div>
  );
}
