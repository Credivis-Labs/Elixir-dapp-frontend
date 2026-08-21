"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AccountGuard } from "@/components/shell/AccountGuard";
import { useMySigner, useProposalBuckets } from "@/hooks/use-data";
import { useFreeze, useProposeUnfreeze, useUpdateTimeLock } from "@/hooks/use-actions";
import { useNow } from "@/hooks/use-clock";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Select } from "@/components/ui/Field";
import { KeyValue, Notice } from "@/components/ui/Misc";
import { AddressChip } from "@/components/domain/AddressChip";
import { formatCountdown, formatDuration, formatDate } from "@/lib/format";
import type { ElixirAccount } from "@/lib/types";
import { ROLE_INITIATE, ROLE_VOTE } from "@/lib/types";

const TIMELOCKS = [0, 900, 3600, 21600, 86400, 259200, 604800];
const FREEZES = [3600, 6 * 3600, 24 * 3600, 72 * 3600];

export function AccountSettingsView({ address }: { address: string }) {
  return <AccountGuard address={address}>{(account) => <Settings address={address} account={account} />}</AccountGuard>;
}

function Settings({ address, account }: { address: string; account: ElixirAccount }) {
  const router = useRouter();
  const me = useMySigner(address);
  const buckets = useProposalBuckets(address);
  const now = useNow();
  const freeze = useFreeze(address);
  const unfreeze = useProposeUnfreeze(address);
  const setTimeLock = useUpdateTimeLock(address);
  const [tl, setTl] = useState(account.config.timeLock);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeDur, setFreezeDur] = useState(FREEZES[3]!);

  const frozen = account.config.frozenUntil > now;
  const canInitiate = !!me && (me.roles & ROLE_INITIATE) !== 0;
  const canFreeze = !!me && (me.roles & ROLE_VOTE) !== 0;
  const unfreezePending = buckets.active.concat(buckets.approved).find((p) => p.invocations.some((i) => i.summary.kind === "unfreeze"));

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <PageHeader title="Account settings" eyebrow={account.name} />

      <Card id="freeze" tone={frozen ? "danger" : "default"}>
        <CardHeader title={frozen ? "Frozen" : "Emergency freeze"} eyebrow="safety" />
        <CardBody className="flex flex-col gap-3">
          {frozen ? (
            <>
              <p className="text-sm">
                Non-config execution is halted until <strong>{formatDate(account.config.frozenUntil)}</strong> (<span className="font-mono">{formatCountdown(account.config.frozenUntil - now)}</span>). Config operations — including unfreeze — still go through normal threshold.
              </p>
              {unfreezePending ? (
                <Notice tone="attn">Unfreeze proposal #{unfreezePending.id} is {unfreezePending.status.toLowerCase()}. <button className="underline underline-offset-2" onClick={() => router.push(`/a/${address}/proposals/${unfreezePending.id}`)}>Open it</button>.</Notice>
              ) : (
                canInitiate && <div><Button variant="secondary" pending={unfreeze.pending} onClick={async () => { const p = await unfreeze.run(); if (p) router.push(`/a/${address}/proposals/${p.id}`); }}>Propose unfreeze</Button></div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                Any single voter can halt all non-config execution for up to 72 hours. Raising the alarm is deliberately easier than moving money. Freezes expire on their own; lifting one early takes normal threshold.
              </p>
              <div><Button variant="danger" disabled={!canFreeze || account.kind === "classic"} onClick={() => setFreezeOpen(true)}>Freeze account</Button></div>
              {account.kind === "classic" && <p className="text-xs text-muted">Classic accounts have no on-chain freeze. Rotate the compromised key via Signers instead.</p>}
            </>
          )}
        </CardBody>
      </Card>

      {account.kind === "smart" && (
        <Card>
          <CardHeader title="Execution timelock" eyebrow="governance" />
          <CardBody className="grid gap-4 sm:grid-cols-[220px_1fr] items-end">
            <Field label="Delay after approval" hint={`Currently ${formatDuration(account.config.timeLock)}`}>
              {(id) => (
                <Select id={id} value={tl} onChange={(e) => setTl(Number(e.target.value))}>
                  {TIMELOCKS.map((t) => (
                    <option key={t} value={t}>{formatDuration(t)}</option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex items-center gap-3">
              <Button disabled={!canInitiate || tl === account.config.timeLock} pending={setTimeLock.pending} onClick={async () => { const p = await setTimeLock.run(tl); if (p) router.push(`/a/${address}/proposals/${p.id}`); }}>
                Propose change
              </Button>
              <span className="text-xs text-muted">Config change; bumps the epoch.</span>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="On-chain details" eyebrow="reference" />
        <CardBody>
          <KeyValue
            rows={[
              { k: "Address", v: <AddressChip address={address} full /> },
              { k: "Kind", v: account.kind === "smart" ? "Soroban custom account (__check_auth)" : "Classic G-account multisig" },
              { k: "Network", v: account.network },
              { k: "Config epoch", v: <span className="font-mono">{account.config.configEpoch}</span> },
              { k: "Queue module", v: account.config.queue ? <AddressChip address={account.config.queue} size="sm" /> : "Disabled — off-chain coordination" },
              { k: "Sub-accounts", v: String(account.config.subaccounts) },
              ...(account.wasmHash ? [{ k: "Wasm hash", v: <span className="font-mono text-xs break-all">{account.wasmHash}</span> }] : []),
              { k: "Created", v: formatDate(account.createdAt) },
            ]}
          />
        </CardBody>
      </Card>

      {account.kind === "smart" && (
        <Card tone="sunken" className="p-4 text-xs text-muted">
          <p><strong className="text-fg">Upgrades.</strong> This account points at a fixed Wasm hash. New versions are published by the factory and adopted per-account by vote after a mandatory delay. Never adopting is a valid choice.</p>
          <p className="mt-2"><strong className="text-fg">TTL.</strong> Instance storage is extended on every entrypoint call. Accounts idle for 90+ days may need a restore before their next action.</p>
        </Card>
      )}

      <Dialog open={freezeOpen} onClose={() => setFreezeOpen(false)} title="Freeze this account?" description="Halts every transfer and contract call until the freeze expires or a threshold-approved unfreeze executes. Use this when a signer key is believed compromised." width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFreezeOpen(false)}>Cancel</Button>
            <Button variant="danger" pending={freeze.pending} onClick={async () => { await freeze.run(freezeDur); setFreezeOpen(false); }}>Freeze for {formatDuration(freezeDur)}</Button>
          </>
        }
      >
        <Field label="Duration" hint="Maximum 72h. Capped per signer per period to prevent griefing.">
          {(id) => (
            <Select id={id} value={freezeDur} onChange={(e) => setFreezeDur(Number(e.target.value))}>
              {FREEZES.map((f) => (
                <option key={f} value={f}>{formatDuration(f)}</option>
              ))}
            </Select>
          )}
        </Field>
      </Dialog>
    </div>
  );
}
