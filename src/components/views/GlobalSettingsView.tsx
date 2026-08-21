"use client";

import { useState } from "react";
import { useNetwork, DEFAULT_RPC, PASSPHRASE } from "@/hooks/use-network";
import { useWallet } from "@/hooks/use-wallet";
import { useClient } from "@/hooks/use-client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Segmented } from "@/components/ui/Field";
import { KeyValue, Notice } from "@/components/ui/Misc";
import { AddressChip } from "@/components/domain/AddressChip";
import type { Network } from "@/lib/types";

export function GlobalSettingsView() {
  const { network, rpc, rpcIsCustom, setNetwork, setRpc, resetRpc } = useNetwork();
  const { session, openSheet, disconnect } = useWallet();
  const client = useClient();
  const { push } = useToast();
  const [rpcDraft, setRpcDraft] = useState(rpc);

  let rpcError: string | null = null;
  try {
    const u = new URL(rpcDraft);
    if (u.protocol !== "https:") rpcError = "Use https.";
  } catch {
    rpcError = "Not a URL.";
  }

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-5">
      <PageHeader title="Settings" description="Stored in this browser only." />

      <Card>
        <CardHeader title="Network" />
        <CardBody className="flex flex-col gap-4">
          <Segmented<Network>
            value={network}
            onChange={(n) => { setNetwork(n); setRpcDraft(DEFAULT_RPC[n]); }}
            options={[
              { value: "testnet", label: "Testnet" },
              { value: "public", label: "Mainnet" },
            ]}
          />
          <KeyValue rows={[{ k: "Passphrase", v: <span className="font-mono text-xs">{PASSPHRASE[network]}</span> }]} />
          {network === "public" && <Notice tone="attn">Mainnet. Contracts are pre-audit; do not custody real funds yet.</Notice>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Soroban RPC" eyebrow="simulation source" />
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Every proposal is simulated locally against this endpoint before you sign, and the payload hash you verify comes from that simulation. Pick a provider you trust — this is what protects you from a compromised coordinator.
          </p>
          <Field label="Endpoint" error={rpcError} hint={rpcIsCustom ? "Custom endpoint in use." : "Using the default for this network."}>
            {(id) => <Input id={id} mono value={rpcDraft} onChange={(e) => setRpcDraft(e.target.value)} />}
          </Field>
          <div className="flex gap-2">
            <Button disabled={!!rpcError || rpcDraft === rpc} onClick={() => { setRpc(rpcDraft); push({ title: "RPC updated", tone: "ok" }); }}>Save</Button>
            {rpcIsCustom && <Button variant="ghost" onClick={() => { resetRpc(); setRpcDraft(DEFAULT_RPC[network]); }}>Use default</Button>}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Signer" />
        <CardBody>
          {session ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <KeyValue rows={[{ k: session.label, v: <AddressChip address={session.address} full /> }]} />
              <Button variant="secondary" onClick={disconnect}>Disconnect</Button>
            </div>
          ) : (
            <Button onClick={openSheet}>Connect a signer</Button>
          )}
        </CardBody>
      </Card>

      <Card tone="sunken">
        <CardHeader title="Demo data" eyebrow="development" />
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">This build runs against an in-browser mock of the Elixir API and contracts. Reset to the seeded state at any time.</p>
          <Button variant="secondary" onClick={() => { client.resetDemo(); push({ title: "Demo data reset", tone: "ok" }); }}>Reset demo</Button>
        </CardBody>
      </Card>
    </div>
  );
}
