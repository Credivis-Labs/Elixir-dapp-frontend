"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountGuard } from "@/components/shell/AccountGuard";
import { useLabel, useMySigner, useProposal } from "@/hooks/use-data";
import { useCancel, useExecute, useVote } from "@/hooks/use-actions";
import { useWallet } from "@/hooks/use-wallet";
import { useAuthExpiry, useNow } from "@/hooks/use-clock";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState, KeyValue, Notice } from "@/components/ui/Misc";
import { Pill } from "@/components/ui/Pill";
import { StatusPill } from "@/components/domain/StatusPill";
import { VoteBar } from "@/components/domain/VoteBar";
import { ExecuteGate } from "@/components/domain/ExecuteGate";
import { IntentCard } from "@/components/domain/IntentCard";
import { HashSeal } from "@/components/domain/HashSeal";
import { AddressChip } from "@/components/domain/AddressChip";
import { evaluateGate } from "@/lib/gate";
import { formatCountdown, formatDate, relativeTime } from "@/lib/format";
import type { ElixirAccount } from "@/lib/types";
import { ROLE_VOTE } from "@/lib/types";

export function ProposalDetailView({ address, id }: { address: string; id: number }) {
  return <AccountGuard address={address}>{(account) => <Detail address={address} id={id} account={account} />}</AccountGuard>;
}

function Detail({ address, id, account }: { address: string; id: number; account: ElixirAccount }) {
  const proposal = useProposal(address, id);
  const me = useMySigner(address);
  const { session } = useWallet();
  const label = useLabel(address);
  const now = useNow();
  const vote = useVote(address);
  const execute = useExecute(address);
  const cancel = useCancel(address);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const auth = useAuthExpiry(proposal?.authExpiresAtLedger ?? 0);

  if (!proposal) {
    return <EmptyState title={`No proposal #${id}`} body="It may belong to a different account." action={<LinkButton href={`/a/${address}/proposals`} variant="secondary">Back to proposals</LinkButton>} />;
  }

  const gate = evaluateGate(proposal, account, session?.address ?? null, now);
  const stale = proposal.configEpoch !== account.config.configEpoch;
  const myVote = me ? proposal.votes.find((v) => v.signer === me.address) : undefined;
  const canVote = !!me && (me.roles & ROLE_VOTE) !== 0 && proposal.status === "Active" && !myVote && !stale;
  const canCancel = !!me && (me.roles & ROLE_VOTE) !== 0 && (proposal.status === "Active" || proposal.status === "Approved");
  const open = proposal.status === "Active" || proposal.status === "Approved";
  const timelockLeft = proposal.status === "Approved" && proposal.approvedAt !== null ? Math.max(0, proposal.approvedAt + account.config.timeLock - now) : 0;
  const base = `/a/${address}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link href={`${base}/proposals`} className="hover:underline underline-offset-2">
            ← Proposals
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono text-[20px] text-faint">#{proposal.id}</span>
            {proposal.title}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={proposal.status} stale={stale} />
            <span>by</span>
            <AddressChip address={proposal.creator} label={label(proposal.creator) || undefined} size="sm" />
            <span>{relativeTime(proposal.createdAt, now)}</span>
            {proposal.subaccount && (
              <>
                <span>· as</span>
                <AddressChip address={proposal.subaccount} label={label(proposal.subaccount) || undefined} size="sm" />
              </>
            )}
          </span>
        }
        action={
          open && (
            <>
              {canCancel && (
                <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
                  Cancel proposal
                </Button>
              )}
              {canVote && (
                <>
                  <Button variant="secondary" onClick={() => setConfirmReject(true)}>
                    Reject
                  </Button>
                  <LinkButton href={`${base}/proposals/${id}/sign`} variant="attn">
                    Review &amp; sign
                  </LinkButton>
                </>
              )}
              {proposal.status === "Approved" && gate.open && (
                <Button onClick={() => execute.run(id)} pending={execute.pending}>
                  Execute
                </Button>
              )}
            </>
          )
        }
      />

      {stale && open && (
        <Notice tone="danger">
          <strong>Stale.</strong> This proposal was created at config epoch {proposal.configEpoch}; the account is at {account.config.configEpoch}. Signers or policies changed after approvals were gathered, so it can never execute. Cancel it and re-propose.
        </Notice>
      )}
      {myVote && open && (
        <Notice tone={myVote.decision === "approve" ? "ok" : "neutral"}>
          You {myVote.decision === "approve" ? "approved" : "rejected"} this {relativeTime(myVote.at, now)}.
          {proposal.status === "Active" && auth.expired && " Your signature has expired; it must be re-collected."}
        </Notice>
      )}
      {proposal.status === "Approved" && timelockLeft > 0 && (
        <Notice tone="attn">
          <strong>In timelock.</strong> Executable in <span className="font-mono">{formatCountdown(timelockLeft)}</span>. Any voter can still cancel in this window.
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="What this does" eyebrow={`${proposal.invocations.length} operation${proposal.invocations.length === 1 ? "" : "s"} · atomic`} />
            <CardBody className="flex flex-col gap-2">
              {proposal.memo && <p className="text-sm text-muted mb-1 whitespace-pre-wrap">{proposal.memo}</p>}
              {proposal.invocations.map((inv, i) => (
                <IntentCard key={i} invocation={inv} index={i} total={proposal.invocations.length} label={label} />
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Votes" eyebrow={`${proposal.votes.filter((v) => v.decision === "approve").length} of ${account.threshold} needed`} />
            <CardBody className="flex flex-col gap-4">
              <VoteBar proposal={proposal} account={account} showLabels />
              <ul className="flex flex-col divide-y divide-line/60">
                {account.signers
                  .filter((s) => (s.roles & ROLE_VOTE) !== 0)
                  .map((s) => {
                    const v = proposal.votes.find((x) => x.signer === s.address);
                    return (
                      <li key={s.address} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <AddressChip address={s.address} label={s.label} size="sm" />
                        {v ? (
                          <span className="flex items-center gap-2 text-xs text-muted">
                            <Pill tone={v.decision === "approve" ? "accent" : "danger"}>{v.decision === "approve" ? "Approved" : "Rejected"}</Pill>
                            <time title={formatDate(v.at)}>{relativeTime(v.at, now)}</time>
                          </span>
                        ) : (
                          <span className="text-xs text-faint">{open ? "Pending" : "—"}</span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <ExecuteGate gate={gate} />

          <Card>
            <CardHeader title="Signature payload" eyebrow="from local simulation" />
            <CardBody className="flex flex-col gap-3">
              <HashSeal hash={proposal.signaturePayload} compact />
              <KeyValue
                rows={[
                  { k: "Config epoch", v: <span className="font-mono">{proposal.configEpoch}</span> },
                  { k: "Auth expires", v: <span className="font-mono">{auth.expired ? "expired" : `ledger ${proposal.authExpiresAtLedger.toLocaleString()} · ${formatCountdown(auth.secondsLeft)}`}</span> },
                  { k: "Proposal expires", v: <span title={formatDate(proposal.expiresAt)}>{relativeTime(proposal.expiresAt, now)}</span> },
                  ...(proposal.approvedAt ? [{ k: "Approved", v: formatDate(proposal.approvedAt) }] : []),
                  ...(proposal.executedAt ? [{ k: "Executed", v: formatDate(proposal.executedAt) }] : []),
                  ...(proposal.txHash ? [{ k: "Transaction", v: <span className="font-mono break-all">{proposal.txHash}</span> }] : []),
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <Dialog open={confirmReject} onClose={() => setConfirmReject(false)} title={`Reject #${proposal.id}?`} description="A rejection is recorded on-chain and cannot be changed. Enough rejections close the proposal." width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReject(false)}>Keep open</Button>
            <Button variant="danger" pending={vote.pending} onClick={async () => { await vote.run(id, "reject"); setConfirmReject(false); }}>Reject</Button>
          </>
        }
      >
        <p className="text-sm text-muted">{proposal.title}</p>
      </Dialog>

      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)} title={`Cancel #${proposal.id}?`} description={proposal.status === "Approved" ? "This proposal is approved and in its timelock window. Cancelling is the post-approval escape hatch." : "Collected approvals are discarded."} width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Back</Button>
            <Button variant="danger" pending={cancel.pending} onClick={async () => { await cancel.run(id); setConfirmCancel(false); }}>Cancel proposal</Button>
          </>
        }
      >
        <p className="text-sm text-muted">{proposal.title}</p>
      </Dialog>
    </div>
  );
}
