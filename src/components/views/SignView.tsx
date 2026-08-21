"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountGuard } from "@/components/shell/AccountGuard";
import { useLabel, useMySigner, useProposal } from "@/hooks/use-data";
import { useSimulation, useVote } from "@/hooks/use-actions";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork, PASSPHRASE } from "@/hooks/use-network";
import { useAuthExpiry } from "@/hooks/use-clock";
import { Card, CardBody } from "@/components/ui/Card";
import { Button, LinkButton, Spinner } from "@/components/ui/Button";
import { EmptyState, Notice } from "@/components/ui/Misc";
import { IntentCard } from "@/components/domain/IntentCard";
import { HashSeal } from "@/components/domain/HashSeal";
import { Amount } from "@/components/domain/Amount";
import { AddressChip } from "@/components/domain/AddressChip";
import { formatAmount, formatCountdown } from "@/lib/format";
import type { ElixirAccount } from "@/lib/types";
import { ROLE_VOTE } from "@/lib/types";
import { cn } from "@/lib/cn";

// The signing surface. Threat model (docs/GAPS.md B1/B2): a compromised backend
// or frontend shows A while the user signs B. Defence here is structural:
//  1. The rendered intent and the hash come from a LOCAL simulation against the
//     user-chosen RPC, never from the API response.
//  2. The hash is shown chunked so it can be compared against a hardware wallet.
//  3. The user must acknowledge the hash matches before the wallet is invoked.
//  4. Auth-entry expiry is shown as a live countdown — stale signatures are a
//     top support issue (A3).

export function SignView({ address, id }: { address: string; id: number }) {
  return <AccountGuard address={address}>{(account) => <Sign address={address} id={id} account={account} />}</AccountGuard>;
}

type Phase = "simulating" | "review" | "signing" | "done";

function Sign({ address, id, account }: { address: string; id: number; account: ElixirAccount }) {
  const router = useRouter();
  const proposal = useProposal(address, id);
  const me = useMySigner(address);
  const { session, sign } = useWallet();
  const { rpc, network } = useNetwork();
  const label = useLabel(address);
  const sim = useSimulation(address);
  const vote = useVote(address);
  const auth = useAuthExpiry(proposal?.authExpiresAtLedger ?? 0);

  const [phase, setPhase] = useState<Phase>("simulating");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proposal) return;
    let live = true;
    sim.simulate(proposal.invocations, proposal.id).then(() => live && setPhase("review"));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal?.id]);

  if (!proposal) return <EmptyState title={`No proposal #${id}`} action={<LinkButton href={`/a/${address}/proposals`} variant="secondary">Back</LinkButton>} />;

  const stale = proposal.configEpoch !== account.config.configEpoch;
  const already = me ? proposal.votes.some((v) => v.signer === me.address) : false;
  const canVote = !!me && (me.roles & ROLE_VOTE) !== 0 && proposal.status === "Active" && !already && !stale;
  const hashMatches = sim.result ? sim.result.signaturePayload === proposal.signaturePayload : false;
  const mismatch = sim.result && !hashMatches;

  if (!canVote) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          title={already ? "You already voted" : stale ? "This proposal is stale" : proposal.status !== "Active" ? `Proposal is ${proposal.status}` : "Your key can't vote here"}
          body={stale ? "Config changed after it was created. It can't be executed; cancel and re-propose." : undefined}
          action={<LinkButton href={`/a/${address}/proposals/${id}`} variant="secondary">Back to proposal</LinkButton>}
        />
      </div>
    );
  }

  async function approve() {
    if (!sim.result) return;
    setPhase("signing");
    setError(null);
    try {
      await sign(sim.result.signaturePayload);
      const p = await vote.run(id, "approve");
      if (p) {
        setPhase("done");
        window.setTimeout(() => router.push(`/a/${address}/proposals/${id}`), 900);
      } else {
        setPhase("review");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("review");
    }
  }

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link href={`/a/${address}/proposals/${id}`} className="text-sm text-muted hover:text-fg">
          ← #{proposal.id} {proposal.title}
        </Link>
        <span className="text-xs text-muted">
          Signing as <span className="font-medium text-fg">{session?.label}</span> · {network}
        </span>
      </div>

      <Card tone={mismatch ? "danger" : "default"} className="overflow-hidden">
        <div className="bg-seal text-seal-fg px-6 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] opacity-70">You are about to authorize</p>
          <p className="font-display text-[26px] font-semibold leading-tight mt-1">{proposal.title}</p>
          <p className="text-sm opacity-80 mt-1">
            as {proposal.subaccount ? label(proposal.subaccount) : account.name} · rule: {account.threshold}-of-{account.signers.length} · epoch {proposal.configEpoch}
          </p>
        </div>

        <CardBody className="pt-5 flex flex-col gap-4">
          {phase === "simulating" && (
            <div className="flex items-center gap-3 text-sm text-muted py-4">
              <Spinner /> Simulating locally against {new URL(rpc).host}…
            </div>
          )}

          {sim.result && (
            <>
              <div className="flex flex-col gap-2">
                {proposal.invocations.map((inv, i) => (
                  <IntentCard key={i} invocation={inv} index={i} total={proposal.invocations.length} label={label} />
                ))}
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted mb-1.5">Simulated effects</p>
                <ul className="flex flex-col gap-1 text-sm">
                  {sim.result.effects.map((e, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      <span className={cn("w-12 font-mono text-[11px] uppercase", e.kind === "debit" ? "text-danger" : e.kind === "credit" ? "text-ok" : "text-muted")}>{e.kind}</span>
                      {e.asset && e.amount !== undefined ? <Amount amount={e.amount} asset={e.asset} size="sm" sign={e.kind === "debit" ? "-" : "+"} /> : <span>{e.description}</span>}
                      <AddressChip address={e.address} label={label(e.address) || undefined} size="sm" />
                    </li>
                  ))}
                </ul>
                {sim.result.error && <Notice tone="danger" className="mt-2">{sim.result.error}</Notice>}
              </div>

              {mismatch ? (
                <Notice tone="danger">
                  <strong>Do not sign.</strong> The locally simulated payload does not match the hash attached to this proposal. Either the proposal was tampered with in transit or the RPC disagrees with the coordinator. Report this before doing anything else.
                </Notice>
              ) : (
                <HashSeal hash={sim.result.signaturePayload} animate />
              )}

              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Meta k="RPC" v={new URL(rpc).host} />
                <Meta k="Network" v={PASSPHRASE[network].split(";")[0]!.trim()} />
                <Meta k="Fee (min)" v={`${formatAmount(sim.result.minResourceFee, 7, 5)} XLM`} />
                <Meta k="Auth valid" v={auth.expired ? "expired" : formatCountdown(auth.secondsLeft)} warn={auth.secondsLeft < 3600} />
              </div>

              {auth.expired && (
                <Notice tone="danger">The auth entry for this proposal has expired. Signing now would produce a worthless signature. The proposer must rebuild it.</Notice>
              )}

              <label className={cn("flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm cursor-pointer", ack ? "border-accent bg-accent-soft/40" : "border-line")}>
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} disabled={!!mismatch || auth.expired} className="mt-0.5 size-4 accent-[var(--accent)]" />
                <span>
                  I compared the payload above with my {session?.kind === "ledger" ? "Ledger screen" : "wallet prompt"} and the amounts, destinations, and hash match.
                </span>
              </label>

              {error && <Notice tone="danger">{error}</Notice>}

              <div className="flex items-center justify-between gap-3 pt-1">
                <Button variant="ghost" onClick={() => router.back()} disabled={phase === "signing"}>Back</Button>
                <Button
                  size="lg"
                  onClick={approve}
                  disabled={!ack || !!mismatch || auth.expired || !sim.result.ok || phase === "done"}
                  pending={phase === "signing"}
                  variant={phase === "done" ? "secondary" : "primary"}
                >
                  {phase === "signing" ? "Waiting for wallet…" : phase === "done" ? "Signed" : "Sign & approve"}
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <p className="text-xs text-muted px-1">
        Your signature is a detached Soroban auth entry: it commits to this payload, this network passphrase, a nonce, and an expiry ledger. It cannot be replayed on another network or for a different invocation.
      </p>
    </div>
  );
}

function Meta({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div>
      <span className="block text-[10.5px] uppercase tracking-[0.08em] text-muted">{k}</span>
      <span className={cn("font-mono text-fg break-all", warn && "text-attn")}>{v}</span>
    </div>
  );
}
