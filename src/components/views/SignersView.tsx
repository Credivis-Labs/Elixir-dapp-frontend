"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountGuard } from "@/components/shell/AccountGuard";
import { useMySigner, useProposalBuckets } from "@/hooks/use-data";
import { useReconfigure } from "@/hooks/use-actions";
import { useNow } from "@/hooks/use-clock";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { EmptyState, Notice } from "@/components/ui/Misc";
import { Pill } from "@/components/ui/Pill";
import { AddressChip } from "@/components/domain/AddressChip";
import { RoleBadges } from "@/components/domain/StatusPill";
import { SignerEditor, type DraftSigner } from "@/components/domain/SignerEditor";
import { relativeTime } from "@/lib/format";
import { isAddress } from "@/lib/strkey";
import type { ElixirAccount } from "@/lib/types";
import { ROLE_INITIATE, ROLE_VOTE } from "@/lib/types";

export function SignersView({ address }: { address: string }) {
  return <AccountGuard address={address}>{(account) => <Signers address={address} account={account} />}</AccountGuard>;
}

function Signers({ address, account }: { address: string; account: ElixirAccount }) {
  const router = useRouter();
  const me = useMySigner(address);
  const buckets = useProposalBuckets(address);
  const reconfigure = useReconfigure(address);
  const now = useNow(30_000);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftSigner[]>([]);
  const [threshold, setThreshold] = useState(account.threshold);

  const canInitiate = !!me && (me.roles & ROLE_INITIATE) !== 0;
  const pendingCount = buckets.active.length + buckets.approved.length;

  function startEdit() {
    setDraft(account.signers.map(({ address, label, kind, roles, weight }) => ({ address, label, kind, roles, weight })));
    setThreshold(account.threshold);
    setEditing(true);
  }

  const validation = useMemo(() => {
    const errs: string[] = [];
    const valid = draft.filter((s) => isAddress(s.address));
    if (valid.length !== draft.length) errs.push("Every signer needs a valid address.");
    if (new Set(draft.map((s) => s.address)).size !== draft.length) errs.push("Duplicate signer.");
    if (threshold < 1) errs.push("Threshold must be at least 1.");
    const voters = draft.filter((s) => (s.roles & ROLE_VOTE) !== 0).length;
    if (threshold > voters) errs.push(`Threshold ${threshold} exceeds the ${voters} signer${voters === 1 ? "" : "s"} with the Vote role. Unsatisfiable.`);
    if (!draft.some((s) => (s.roles & ROLE_INITIATE) !== 0)) errs.push("At least one signer must be able to Initiate.");
    if (!draft.some((s) => (s.roles & 4) !== 0)) errs.push("At least one signer must be able to Execute.");
    if (account.kind === "classic" && draft.length > 20) errs.push("Classic accounts allow at most 20 signers.");
    return errs;
  }, [draft, threshold, account.kind]);

  const changed = useMemo(() => {
    if (threshold !== account.threshold) return true;
    if (draft.length !== account.signers.length) return true;
    return draft.some((d) => {
      const o = account.signers.find((s) => s.address === d.address);
      return !o || o.roles !== d.roles || o.weight !== d.weight || o.label !== d.label;
    });
  }, [draft, threshold, account]);

  async function propose() {
    const p = await reconfigure.run(draft, threshold);
    if (p) router.push(`/a/${address}/proposals/${p.id}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Signers"
        eyebrow={account.name}
        description={`${account.threshold}-of-${account.signers.length} · config epoch ${account.config.configEpoch}`}
        action={!editing && canInitiate && <Button onClick={startEdit}>Propose changes</Button>}
      />

      {!editing ? (
        <Card>
          <ul className="divide-y divide-line">
            {account.signers.map((s) => (
              <li key={s.address} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[1fr_120px_100px_auto]">
                <div className="min-w-0 flex items-center gap-2">
                  <AddressChip address={s.address} label={s.label} />
                  {me?.address === s.address && <Pill tone="accent">you</Pill>}
                </div>
                <span className="text-xs text-muted capitalize hidden sm:inline">{s.kind}</span>
                <span className="text-xs text-muted hidden sm:inline">added {relativeTime(s.addedAt, now)}</span>
                <RoleBadges roles={s.roles} />
              </li>
            ))}
          </ul>
          {!canInitiate && <p className="px-5 py-3 text-xs text-muted border-t border-line">Your key can view signers but lacks the Initiate role needed to propose changes.</p>}
        </Card>
      ) : (
        <>
          <Notice tone="attn">
            Signer and threshold changes ship as <strong>one atomic reconfigure</strong> — never a raw add/remove — so the account can&apos;t pass through an unsatisfiable state. Executing it bumps the config epoch
            {pendingCount > 0 && <> and will make <strong>{pendingCount} pending proposal{pendingCount === 1 ? "" : "s"}</strong> stale</>}.
          </Notice>
          <Card>
            <CardHeader title="Proposed signer set" />
            <CardBody>
              <SignerEditor signers={draft} onChange={setDraft} allowRoles={account.kind === "smart"} allowWeights={account.kind === "classic"} lockedAddress={me?.address} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Threshold" />
            <CardBody className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <Field label="Approvals required" hint={`${threshold}-of-${draft.filter((s) => (s.roles & ROLE_VOTE) !== 0).length} voters`}>
                {(id) => <Input id={id} type="number" min={1} max={Math.max(1, draft.length)} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />}
              </Field>
              <div className="flex flex-col gap-1 pt-6">
                {validation.map((v) => (
                  <p key={v} className="text-xs text-danger">{v}</p>
                ))}
                {validation.length === 0 && changed && <p className="text-xs text-ok">Valid. Resulting configuration is satisfiable.</p>}
                {validation.length === 0 && !changed && <p className="text-xs text-muted">No changes yet.</p>}
              </div>
            </CardBody>
          </Card>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditing(false)}>Discard</Button>
            <Button onClick={propose} pending={reconfigure.pending} disabled={validation.length > 0 || !changed}>Propose reconfigure</Button>
          </div>
        </>
      )}

      {!editing && (
        <Card tone="sunken" className="p-4 text-xs text-muted">
          <p><strong className="text-fg">Roles.</strong> Initiate opens proposals. Vote approves or rejects. Execute submits once the gate is open. A compromised Initiate-only key can&apos;t move anything.</p>
          <p className="mt-2"><strong className="text-fg">Recovery.</strong> Guardian and dead-man rules live under Policies as context rules scoped to reconfigure().</p>
        </Card>
      )}
      {account.signers.length === 0 && <EmptyState title="No signers" />}
    </div>
  );
}
