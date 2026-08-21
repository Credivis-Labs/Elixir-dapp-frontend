"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AccountGuard } from "@/components/shell/AccountGuard";
import { useAddressBook, useLabel, useMySigner, useSubaccounts } from "@/hooks/use-data";
import { useCreateProposal, useSimulation } from "@/hooks/use-actions";
import { useNetwork } from "@/hooks/use-network";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { EmptyState, Notice } from "@/components/ui/Misc";
import { IntentCard } from "@/components/domain/IntentCard";
import { HashSeal } from "@/components/domain/HashSeal";
import { Amount } from "@/components/domain/Amount";
import { AddressChip } from "@/components/domain/AddressChip";
import { ASSETS } from "@/lib/mock/seed";
import type { Asset, ElixirAccount, Invocation } from "@/lib/types";
import { ROLE_INITIATE } from "@/lib/types";
import { isAddress, isContractId } from "@/lib/strkey";
import { formatAmount, parseAmount } from "@/lib/format";
import { cn } from "@/lib/cn";

export function ProposalBuilderView({ address }: { address: string }) {
  return <AccountGuard address={address}>{(account) => <Builder address={address} account={account} />}</AccountGuard>;
}

type Step = "compose" | "review";

function Builder({ address, account }: { address: string; account: ElixirAccount }) {
  const router = useRouter();
  const params = useSearchParams();
  const me = useMySigner(address);
  const subs = useSubaccounts(address);
  const book = useAddressBook(address);
  const label = useLabel(address);
  const { rpc } = useNetwork();
  const create = useCreateProposal(address);
  const sim = useSimulation(address);

  const [step, setStep] = useState<Step>("compose");
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [from, setFrom] = useState<string>(address);
  const [items, setItems] = useState<Invocation[]>([]);

  const fromSub = subs.find((s) => s.address === from) ?? subs[0];
  const canInitiate = me !== null && (me.roles & ROLE_INITIATE) !== 0;

  if (!canInitiate) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="New proposal" />
        <EmptyState title="Your key can't initiate" body="Only signers with the Initiate role can open proposals on this account. Ask an admin to adjust roles." />
      </div>
    );
  }

  async function review() {
    setStep("review");
    await sim.simulate(items);
  }

  async function submit() {
    const p = await create.run({ title: title.trim(), memo: memo.trim(), subaccount: from === address ? null : from, invocations: items });
    if (p) router.push(`/a/${address}/proposals/${p.id}`);
  }

  const ready = title.trim().length > 0 && items.length > 0;

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-5">
      <PageHeader
        title="New proposal"
        eyebrow={account.name}
        description={step === "compose" ? "Compose one or more operations. They execute atomically — if any fails, none apply." : "Review the local simulation before proposing. Your approval is recorded automatically."}
      />

      <ol className="flex items-center gap-2 text-[12px] font-medium">
        <li className={cn("flex items-center gap-2", step !== "compose" && "text-muted")}>
          <span className={cn("grid size-5 place-items-center rounded-full text-[11px]", step === "compose" ? "bg-fg text-bg" : "bg-sunken")}>1</span> Compose
        </li>
        <li className="h-px w-8 bg-line" />
        <li className={cn("flex items-center gap-2", step !== "review" && "text-muted")}>
          <span className={cn("grid size-5 place-items-center rounded-full text-[11px]", step === "review" ? "bg-fg text-bg" : "bg-sunken")}>2</span> Simulate &amp; propose
        </li>
      </ol>

      {step === "compose" && (
        <>
          <Card>
            <CardHeader title="Details" />
            <CardBody className="grid gap-4">
              <Field label="Title">
                {(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q3 audit retainer" autoFocus />}
              </Field>
              <Field label="Memo" hint="Context for other signers. Stored off-chain.">
                {(id) => <Textarea id={id} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Why, and where the approval came from." />}
              </Field>
              {account.kind === "smart" && subs.length > 1 && (
                <Field label="Act as" hint="Which address signs the invocation. Sub-accounts delegate auth to the parent.">
                  {(id) => (
                    <Select id={id} value={from} onChange={(e) => { setFrom(e.target.value); setItems([]); }}>
                      {subs.filter((s) => s.deployed).map((s) => (
                        <option key={s.index} value={s.address}>
                          #{s.index} {s.index === 0 ? account.name : s.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Operations" eyebrow={items.length ? `${items.length} queued` : undefined} />
            <CardBody className="flex flex-col gap-3">
              {items.map((inv, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <IntentCard invocation={inv} index={i} total={items.length} label={label} />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove operation">
                    ×
                  </Button>
                </div>
              ))}
              <OperationComposer
                from={fromSub?.address ?? address}
                balances={fromSub?.balances ?? []}
                book={book}
                initialTo={params.get("to") ?? ""}
                onAdd={(inv) => setItems([...items, inv])}
              />
              <p className="text-xs text-muted">
                Signer or threshold changes? Use <Link href={`/a/${address}/signers`} className="underline underline-offset-2">Signers</Link> — it bundles them into one atomic reconfigure so the account can&apos;t end up unsatisfiable.
              </p>
            </CardBody>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={review} disabled={!ready}>Simulate</Button>
          </div>
        </>
      )}

      {step === "review" && (
        <>
          <Card>
            <CardHeader title={title} eyebrow={`as ${fromSub && fromSub.index > 0 ? `${fromSub.label} (sub #${fromSub.index})` : account.name}`} />
            <CardBody className="flex flex-col gap-2">
              {memo && <p className="text-sm text-muted mb-1">{memo}</p>}
              {items.map((inv, i) => (
                <IntentCard key={i} invocation={inv} index={i} total={items.length} label={label} />
              ))}
            </CardBody>
          </Card>

          <Card tone={sim.result ? (sim.result.ok ? "default" : "danger") : "sunken"}>
            <CardHeader
              title={sim.pending ? "Simulating…" : sim.result ? (sim.result.ok ? "Simulation passed" : "Simulation failed") : "Simulation"}
              eyebrow={`local · ${new URL(rpc).host}`}
              action={!sim.pending && <Button size="sm" variant="secondary" onClick={() => sim.simulate(items)}>Re-run</Button>}
            />
            <CardBody className="flex flex-col gap-4">
              {sim.result?.error && <Notice tone="danger">{sim.result.error}</Notice>}
              {sim.result && (
                <>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {sim.result.effects.map((e, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-2">
                        <span className={cn("w-12 font-mono text-[11px] uppercase", e.kind === "debit" ? "text-danger" : e.kind === "credit" ? "text-ok" : "text-muted")}>{e.kind}</span>
                        {e.asset && e.amount !== undefined ? <Amount amount={e.amount} asset={e.asset} size="sm" sign={e.kind === "debit" ? "-" : "+"} /> : <span>{e.description}</span>}
                        <AddressChip address={e.address} label={label(e.address) || undefined} size="sm" />
                      </li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted sm:grid-cols-3">
                    <div><span className="block text-[10.5px] uppercase tracking-[0.08em]">Min resource fee</span><span className="font-mono text-fg">{formatAmount(sim.result.minResourceFee, 7, 5)} XLM</span></div>
                    <div><span className="block text-[10.5px] uppercase tracking-[0.08em]">Auth valid for</span><span className="font-mono text-fg">{sim.result.ledgersUntilAuthExpiry.toLocaleString()} ledgers</span></div>
                    <div><span className="block text-[10.5px] uppercase tracking-[0.08em]">Config epoch</span><span className="font-mono text-fg">{account.config.configEpoch}</span></div>
                  </div>
                  <HashSeal hash={sim.result.signaturePayload} animate />
                </>
              )}
            </CardBody>
          </Card>

          <div className="flex justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep("compose")}>Back</Button>
            <Button onClick={submit} pending={create.pending} disabled={!sim.result?.ok}>
              Propose &amp; approve
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

type OpKind = "transfer" | "call";

function OperationComposer({ from, balances, book, initialTo, onAdd }: { from: string; balances: { asset: Asset; amount: bigint }[]; book: { address: string; label: string }[]; initialTo: string; onAdd: (inv: Invocation) => void }) {
  const [kind, setKind] = useState<OpKind>("transfer");
  const [assetCode, setAssetCode] = useState<string>(balances[0]?.asset.code ?? ASSETS[0]!.code);
  const [to, setTo] = useState(initialTo);
  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState("");
  const [fn, setFn] = useState("");
  const [argsJson, setArgsJson] = useState("[]");
  const [desc, setDesc] = useState("");

  const asset = useMemo(() => balances.find((b) => b.asset.code === assetCode)?.asset ?? ASSETS.find((a) => a.code === assetCode) ?? ASSETS[0]!, [assetCode, balances]);
  const bal = balances.find((b) => b.asset.code === assetCode)?.amount ?? 0n;
  const parsed = parseAmount(amount, asset.decimals);
  const toOk = isAddress(to);
  const overBalance = parsed !== null && parsed > bal;

  let argsError: string | null = null;
  let parsedArgs: { name: string; type: string; value: unknown }[] = [];
  try {
    const v = JSON.parse(argsJson) as unknown;
    if (!Array.isArray(v)) argsError = "Args must be a JSON array";
    else parsedArgs = v.map((x, i) => (typeof x === "object" && x && "name" in x ? (x as { name: string; type: string; value: unknown }) : { name: `arg${i}`, type: typeof x, value: x }));
  } catch {
    argsError = "Invalid JSON";
  }

  function addTransfer() {
    if (!parsed || !toOk) return;
    onAdd({
      target: asset.contract,
      fnName: "transfer",
      args: [
        { name: "from", type: "Address", value: from },
        { name: "to", type: "Address", value: to },
        { name: "amount", type: "i128", value: parsed.toString() },
      ],
      summary: { kind: "transfer", asset, to, amount: parsed },
    });
    setTo("");
    setAmount("");
  }

  function addCall() {
    if (!isContractId(target) || !fn.trim() || argsError) return;
    onAdd({ target, fnName: fn.trim(), args: parsedArgs, summary: { kind: "call", description: desc.trim() || `${fn.trim()}() on ${target.slice(0, 4)}…${target.slice(-4)}` } });
    setTarget("");
    setFn("");
    setArgsJson("[]");
    setDesc("");
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-line-strong p-4">
      <div className="mb-3 flex gap-1">
        {(["transfer", "call"] as OpKind[]).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={cn("h-8 rounded-[var(--radius-sm)] px-3 text-[13px] font-medium", kind === k ? "bg-fg text-bg" : "text-muted hover:bg-sunken")}>
            {k === "transfer" ? "Transfer" : "Contract call"}
          </button>
        ))}
      </div>

      {kind === "transfer" ? (
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <Field label="Asset">
            {(id) => (
              <Select id={id} value={assetCode} onChange={(e) => setAssetCode(e.target.value)}>
                {(balances.length ? balances.map((b) => b.asset) : ASSETS).map((a) => (
                  <option key={a.code} value={a.code}>{a.code}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Amount" hint={`Available: ${formatAmount(bal, asset.decimals)} ${asset.code}`} error={overBalance ? "Exceeds balance" : amount && parsed === null ? "Invalid amount" : null}>
            {(id) => <Input id={id} mono inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />}
          </Field>
          <Field label="To" className="sm:col-span-2" error={to && !toOk ? "Not a valid Stellar address" : null} hint={toOk && !book.some((b) => b.address === to) ? "Not in the address book. Double-check before proposing." : undefined}>
            {(id) => (
              <>
                <Input id={id} mono value={to} onChange={(e) => setTo(e.target.value.trim().toUpperCase())} placeholder="G… or C…" list="address-book" />
                <datalist id="address-book">
                  {book.map((b) => (
                    <option key={b.address} value={b.address}>{b.label}</option>
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <Button size="sm" variant="secondary" onClick={addTransfer} disabled={!parsed || !toOk || overBalance}>Add transfer</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <Field label="Contract" error={target && !isContractId(target) ? "Must be a C… contract address" : null}>
            {(id) => <Input id={id} mono value={target} onChange={(e) => setTarget(e.target.value.trim().toUpperCase())} placeholder="C…" />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <Field label="Function">{(id) => <Input id={id} mono value={fn} onChange={(e) => setFn(e.target.value)} placeholder="submit" />}</Field>
            <Field label="Description" hint="What this does, in plain words. Signers see this first.">
              {(id) => <Input id={id} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Supply 500k USDC to Blend" />}
            </Field>
          </div>
          <Field label="Arguments" hint='JSON array of {"name","type","value"}. Bindings from the SDK will replace this with a typed form.' error={argsError}>
            {(id) => <Textarea id={id} value={argsJson} onChange={(e) => setArgsJson(e.target.value)} className="font-mono text-[12.5px]" />}
          </Field>
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={addCall} disabled={!isContractId(target) || !fn.trim() || !!argsError}>Add call</Button>
          </div>
        </div>
      )}
    </div>
  );
}
