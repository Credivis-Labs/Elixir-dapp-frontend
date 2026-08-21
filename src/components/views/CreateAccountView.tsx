"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { useCreateAccount } from "@/hooks/use-actions";
import { PageHeader, Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Segmented, Select, Toggle } from "@/components/ui/Field";
import { EmptyState, Notice } from "@/components/ui/Misc";
import { SignerEditor, type DraftSigner } from "@/components/domain/SignerEditor";
import type { AccountKind } from "@/lib/types";
import { ROLE_ALL } from "@/lib/types";
import { isAddress } from "@/lib/strkey";
import { formatDuration } from "@/lib/format";

const TIMELOCKS = [0, 900, 3600, 21600, 86400, 259200];

export function CreateAccountView() {
  const router = useRouter();
  const { session, openSheet } = useWallet();
  const { network } = useNetwork();
  const create = useCreateAccount();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("smart");
  const [signers, setSigners] = useState<DraftSigner[]>(() =>
    session ? [{ address: session.address, label: "You", kind: session.kind, roles: ROLE_ALL, weight: 1 }] : [],
  );
  const [threshold, setThreshold] = useState(1);
  const [timeLock, setTimeLock] = useState(3600);
  const [queue, setQueue] = useState(true);

  const validSigners = useMemo(() => signers.filter((s) => isAddress(s.address)), [signers]);
  const dupes = useMemo(() => new Set(signers.map((s) => s.address)).size !== signers.length, [signers]);
  const thresholdError =
    threshold < 1 ? "Threshold must be at least 1" : threshold > validSigners.length ? `Only ${validSigners.length} valid signers` : null;
  const canSubmit = name.trim().length > 0 && validSigners.length === signers.length && signers.length > 0 && !dupes && !thresholdError && (kind === "smart" || signers.length <= 20);

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="New account" />
        <EmptyState title="Connect first" body="The connected key becomes the first signer." action={<Button onClick={openSheet}>Connect a signer</Button>} />
      </div>
    );
  }

  async function submit() {
    const a = await create.run({ name: name.trim(), kind, network, signers: validSigners, threshold, timeLock: kind === "smart" ? timeLock : 0, queue: kind === "smart" && queue });
    if (a) router.push(`/a/${a.address}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New account" description={`Deploys on ${network}. Signers and threshold are set atomically so the account can never start unsatisfiable.`} />

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Kind" eyebrow="1" />
          <CardBody className="flex flex-col gap-4">
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { value: "smart", label: "Smart account" },
                { value: "classic", label: "Classic G-account" },
              ]}
            />
            {kind === "smart" ? (
              <Notice>
                A Soroban contract account. Policies, sub-accounts, spending limits, passkey signers, optional on-chain queue.
                Cannot place SDEX offers or change trustlines as itself.
              </Notice>
            ) : (
              <Notice>
                Plain Stellar multisig, up to 20 signers with weights. Full classic-op support (offers, trustlines, path payments).
                No policies, no sub-accounts, no contract risk. Coordination is off-chain.
              </Notice>
            )}
            <Field label="Name" hint="Shown to signers; not stored on-chain.">
              {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Protocol treasury" autoFocus />}
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Signers" eyebrow="2" />
          <CardBody>
            <SignerEditor signers={signers} onChange={setSigners} allowRoles={kind === "smart"} allowWeights={kind === "classic"} />
            {dupes && <p className="mt-2 text-xs text-danger">Duplicate signer address.</p>}
            {kind === "classic" && signers.length > 20 && <p className="mt-2 text-xs text-danger">Classic accounts allow at most 20 signers.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Threshold" eyebrow="3" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Approvals required" error={thresholdError} hint={`${threshold}-of-${validSigners.length}`}>
              {(id) => <Input id={id} type="number" min={1} max={Math.max(1, validSigners.length)} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />}
            </Field>
            {kind === "smart" && (
              <Field label="Execution timelock" hint="Delay between approval and execution. Gives observers a window to cancel.">
                {(id) => (
                  <Select id={id} value={timeLock} onChange={(e) => setTimeLock(Number(e.target.value))}>
                    {TIMELOCKS.map((t) => (
                      <option key={t} value={t}>
                        {formatDuration(t)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
          </CardBody>
        </Card>

        {kind === "smart" && (
          <Card>
            <CardHeader title="Modules" eyebrow="4" />
            <CardBody>
              <Toggle
                checked={queue}
                onChange={setQueue}
                label="On-chain proposal queue"
                description="Proposals, votes and timelock recorded on-chain. Without it, signatures are collected off-chain and submitted once — cheaper, but no on-chain audit trail."
              />
            </CardBody>
          </Card>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={submit} pending={create.pending} disabled={!canSubmit}>
            {kind === "smart" ? "Deploy account" : "Create account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
