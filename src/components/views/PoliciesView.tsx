"use client";

import { useMemo, useState } from "react";
import { AccountGuard } from "@/components/shell/AccountGuard";
import { useLabel, useMySigner, useRules } from "@/hooks/use-data";
import { useSaveRules } from "@/hooks/use-actions";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Toggle } from "@/components/ui/Field";
import { EmptyState, Notice } from "@/components/ui/Misc";
import { Pill } from "@/components/ui/Pill";
import { AddressChip } from "@/components/domain/AddressChip";
import { describeScope, dryRun, effectiveThreshold, lintRules, type LintFinding } from "@/lib/policy-lint";
import { formatAmount, formatDuration } from "@/lib/format";
import { isContractId } from "@/lib/strkey";
import type { ContextRule, ElixirAccount, PolicyRule, PolicyScope } from "@/lib/types";
import { ROLE_INITIATE } from "@/lib/types";
import { cn } from "@/lib/cn";

export function PoliciesView({ address }: { address: string }) {
  return <AccountGuard address={address}>{(account) => <Policies address={address} account={account} />}</AccountGuard>;
}

function Policies({ address, account }: { address: string; account: ElixirAccount }) {
  const saved = useRules(address);
  const me = useMySigner(address);
  const label = useLabel(address);
  const save = useSaveRules(address);
  const [draft, setDraft] = useState<ContextRule[] | null>(null);
  const [editing, setEditing] = useState<ContextRule | null>(null);

  const rules = draft ?? saved;
  const findings = useMemo(() => lintRules(rules, account.signers.length), [rules, account.signers.length]);
  const errors = findings.filter((f) => f.severity === "error");
  const dirty = draft !== null;
  const canEdit = !!me && (me.roles & ROLE_INITIATE) !== 0 && account.kind === "smart";

  function setRule(next: ContextRule) {
    const list = (draft ?? saved).map((r) => (r.id === next.id ? next : r));
    setDraft(list.some((r) => r.id === next.id) ? list : [...list, next]);
  }

  if (account.kind === "classic") {
    return (
      <div>
        <PageHeader title="Policies" eyebrow={account.name} />
        <EmptyState title="Classic accounts have one rule" body={`Stellar's native multisig: ${account.threshold}-of-${account.signers.length} by signer weight. Context rules, spending limits and allowlists need a smart account.`} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Policies"
        eyebrow={account.name}
        description="Context rules decide which signers and policies apply to which calls. The signer picks the rule at signing time, so every matching rule must be acceptable."
        action={
          canEdit && (
            <>
              {dirty && <Button variant="ghost" onClick={() => setDraft(null)}>Discard</Button>}
              <Button variant="secondary" onClick={() => setEditing(blankRule(rules, account))}>New rule</Button>
              {dirty && (
                <Button pending={save.pending} disabled={errors.length > 0} onClick={async () => { const ok = await save.run(draft!); if (ok !== null) setDraft(null); }}>
                  Save rules
                </Button>
              )}
            </>
          )
        }
      />

      <LintPanel findings={findings} rules={rules} />

      <Card>
        <ul className="divide-y divide-line">
          {rules.map((r) => {
            const t = effectiveThreshold(r);
            const flagged = findings.filter((f) => f.ruleIds.includes(r.id));
            return (
              <li key={r.id} className={cn("px-5 py-4", !r.enabled && "opacity-60")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-faint">rule {r.id}</span>
                      <h2 className="font-display text-[16px] font-semibold">{r.name}</h2>
                      {!r.enabled && <Pill tone="faint">disabled</Pill>}
                      {flagged.some((f) => f.severity === "error") && <Pill tone="danger" dot>conflict</Pill>}
                      {flagged.length > 0 && !flagged.some((f) => f.severity === "error") && <Pill tone="attn" dot>warning</Pill>}
                    </div>
                    <p className="text-sm text-muted mt-0.5">{describeScope(r.scope)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{t !== null ? `${t}-of-${r.signers.length}` : "no threshold"}</span>
                    {canEdit && <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>Edit</Button>}
                  </div>
                </div>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {r.policies.map((p, i) => (
                    <li key={i}><PolicyChip policy={p} /></li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.signers.map((s) => (
                    <AddressChip key={s} address={s} label={label(s) || undefined} size="sm" />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <DryRunPanel rules={rules} account={account} label={label} />

      {editing && (
        <RuleEditor
          rule={editing}
          account={account}
          label={label}
          onClose={() => setEditing(null)}
          onSave={(r) => { setRule(r); setEditing(null); }}
          onDelete={(id) => { setDraft((draft ?? saved).filter((x) => x.id !== id)); setEditing(null); }}
        />
      )}
    </div>
  );
}

function blankRule(existing: ContextRule[], account: ElixirAccount): ContextRule {
  return {
    id: existing.reduce((m, r) => Math.max(m, r.id), -1) + 1,
    name: "",
    scope: { kind: "contract", contract: "" },
    signers: account.signers.map((s) => s.address),
    policies: [{ kind: "threshold", threshold: account.threshold }],
    enabled: true,
  };
}

function PolicyChip({ policy }: { policy: PolicyRule }) {
  switch (policy.kind) {
    case "threshold":
      return <Pill tone="neutral">threshold {policy.threshold}</Pill>;
    case "weighted":
      return <Pill tone="neutral">weighted ≥ {policy.threshold}</Pill>;
    case "spendingLimit":
      return <Pill tone="accent">≤ {formatAmount(policy.amount)} {policy.asset} / {formatDuration(policy.periodSeconds)}</Pill>;
    case "allowlist":
      return <Pill tone="accent">allowlist · {policy.destinations.length}</Pill>;
    case "timelock":
      return <Pill tone="neutral">timelock {formatDuration(policy.seconds)}</Pill>;
  }
}

function LintPanel({ findings, rules }: { findings: LintFinding[]; rules: ContextRule[] }) {
  if (findings.length === 0) {
    return (
      <Notice tone="ok">
        <strong>Rule set is consistent.</strong> No enabled rule is looser than a narrower rule it covers; every threshold is satisfiable.
      </Notice>
    );
  }
  return (
    <Card tone="danger">
      <CardHeader title={`${findings.length} finding${findings.length === 1 ? "" : "s"}`} eyebrow="rule linter" />
      <CardBody>
        <ul className="flex flex-col gap-2 text-sm">
          {findings.map((f, i) => (
            <li key={i} className="flex gap-3">
              <Pill tone={f.severity === "error" ? "danger" : "attn"}>{f.severity}</Pill>
              <span>
                {f.message}{" "}
                <span className="text-muted">({f.ruleIds.map((id) => rules.find((r) => r.id === id)?.name ?? id).join(" · ")})</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Saving is blocked while errors remain. A broad fallback rule must be your strictest rule, never your loosest.</p>
      </CardBody>
    </Card>
  );
}

function DryRunPanel({ rules, account, label }: { rules: ContextRule[]; account: ElixirAccount; label: (a: string) => string }) {
  const [contract, setContract] = useState(account.address);
  const [fn, setFn] = useState("reconfigure");
  const [signers, setSigners] = useState<string[]>(account.signers.slice(0, account.threshold).map((s) => s.address));
  const result = useMemo(() => dryRun(rules, { contract, fn, signers }), [rules, contract, fn, signers]);

  return (
    <Card>
      <CardHeader title="Dry run" eyebrow="would this configuration allow…" />
      <CardBody className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-3">
          <Field label="Contract" error={contract && !isContractId(contract) ? "Must be a C… address" : null}>
            {(id) => <Input id={id} mono value={contract} onChange={(e) => setContract(e.target.value.trim().toUpperCase())} />}
          </Field>
          <Field label="Function">{(id) => <Input id={id} mono value={fn} onChange={(e) => setFn(e.target.value)} />}</Field>
          <div>
            <p className="text-[13px] font-medium mb-1.5">Signers present</p>
            <div className="flex flex-wrap gap-1.5">
              {account.signers.map((s) => {
                const on = signers.includes(s.address);
                return (
                  <button key={s.address} type="button" aria-pressed={on} onClick={() => setSigners(on ? signers.filter((x) => x !== s.address) : [...signers, s.address])} className={cn("rounded-full border px-2.5 h-7 text-[12.5px]", on ? "bg-fg text-bg border-fg" : "border-line text-muted")}>
                    {s.label || label(s.address) || s.address.slice(0, 6)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className={cn("rounded-[var(--radius-md)] border p-4", result.allowed ? "border-ok/40 bg-ok-soft" : "border-danger/40 bg-danger-soft")}>
          <p className="font-display text-lg font-semibold">{result.allowed ? "Allowed" : "Denied"}</p>
          <p className="text-sm mt-1">{result.reason}</p>
          {result.matched.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-xs">
              {result.matched.map((r) => {
                const t = effectiveThreshold(r) ?? 1;
                const present = r.signers.filter((s) => signers.includes(s)).length;
                const ok = result.satisfiedBy.includes(r);
                return (
                  <li key={r.id} className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", ok ? "bg-ok" : "bg-faint")} />
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted font-mono">{present}/{t}</span>
                    <span className="text-muted">{describeScope(r.scope)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted">Reads the rule set as drafted. Spending limits and allowlists are enforced on-chain per call and aren&apos;t evaluated here.</p>
        </div>
      </CardBody>
    </Card>
  );
}

function RuleEditor({ rule, account, label, onClose, onSave, onDelete }: { rule: ContextRule; account: ElixirAccount; label: (a: string) => string; onClose: () => void; onSave: (r: ContextRule) => void; onDelete: (id: number) => void }) {
  const [r, setR] = useState<ContextRule>(rule);
  const scopeKind = r.scope.kind;
  const scoped = r.scope.kind === "any" ? null : r.scope;
  const threshold = effectiveThreshold(r) ?? 1;

  function setScope(kind: PolicyScope["kind"]) {
    if (kind === "any") setR({ ...r, scope: { kind: "any" } });
    else if (kind === "contract") setR({ ...r, scope: { kind: "contract", contract: r.scope.kind !== "any" ? r.scope.contract : "" } });
    else setR({ ...r, scope: { kind: "function", contract: r.scope.kind !== "any" ? r.scope.contract : "", fn: r.scope.kind === "function" ? r.scope.fn : "" } });
  }
  function setThreshold(t: number) {
    const has = r.policies.some((p) => p.kind === "threshold" || p.kind === "weighted");
    setR({ ...r, policies: has ? r.policies.map((p) => (p.kind === "threshold" || p.kind === "weighted" ? { ...p, threshold: t } : p)) : [{ kind: "threshold", threshold: t }, ...r.policies] });
  }
  function toggleSigner(a: string) {
    setR({ ...r, signers: r.signers.includes(a) ? r.signers.filter((x) => x !== a) : [...r.signers, a] });
  }
  const scopeOk = r.scope.kind === "any" || (isContractId(r.scope.contract) && (r.scope.kind !== "function" || r.scope.fn.trim().length > 0));
  const valid = r.name.trim().length > 0 && scopeOk && threshold >= 1 && threshold <= r.signers.length;

  return (
    <Dialog open onClose={onClose} title={rule.name ? `Edit ${rule.name}` : "New rule"} width="lg"
      footer={
        <>
          {rule.name && <Button variant="ghost" className="mr-auto text-danger" onClick={() => onDelete(r.id)}>Delete rule</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid} onClick={() => onSave({ ...r, name: r.name.trim() })}>Apply</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Name">{(id) => <Input id={id} value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="Ops allowance" autoFocus />}</Field>
          <Toggle checked={r.enabled} onChange={(v) => setR({ ...r, enabled: v })} label="Enabled" />
        </div>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_160px]">
          <Field label="Scope">
            {(id) => (
              <Select id={id} value={scopeKind} onChange={(e) => setScope(e.target.value as PolicyScope["kind"])}>
                <option value="any">Any call</option>
                <option value="contract">Any fn on contract</option>
                <option value="function">One function</option>
              </Select>
            )}
          </Field>
          {scoped && (
            <Field label="Contract" error={scoped.contract && !isContractId(scoped.contract) ? "Must be a C… address" : null}>
              {(id) => <Input id={id} mono value={scoped.contract} onChange={(e) => setR({ ...r, scope: { ...scoped, contract: e.target.value.trim().toUpperCase() } })} placeholder={account.address} />}
            </Field>
          )}
          {r.scope.kind === "function" && (
            <Field label="Function">{(id) => <Input id={id} mono value={r.scope.kind === "function" ? r.scope.fn : ""} onChange={(e) => setR({ ...r, scope: { kind: "function", contract: r.scope.kind !== "any" ? r.scope.contract : "", fn: e.target.value } })} placeholder="transfer" />}</Field>
          )}
        </div>
        <div>
          <p className="text-[13px] font-medium mb-1.5">Signers on this rule</p>
          <div className="flex flex-wrap gap-1.5">
            {account.signers.map((s) => {
              const on = r.signers.includes(s.address);
              return (
                <button key={s.address} type="button" aria-pressed={on} onClick={() => toggleSigner(s.address)} className={cn("rounded-full border px-2.5 h-7 text-[12.5px]", on ? "bg-fg text-bg border-fg" : "border-line text-muted")}>
                  {s.label || label(s.address) || s.address.slice(0, 6)}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Threshold" hint={`${threshold}-of-${r.signers.length}`} error={threshold > r.signers.length ? "Exceeds selected signers" : null}>
          {(id) => <Input id={id} type="number" min={1} max={Math.max(1, r.signers.length)} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-28" />}
        </Field>
        <PolicyList r={r} setR={setR} />
      </div>
    </Dialog>
  );
}

function PolicyList({ r, setR }: { r: ContextRule; setR: (r: ContextRule) => void }) {
  const extras = r.policies.filter((p) => p.kind !== "threshold" && p.kind !== "weighted");
  function add(kind: "spendingLimit" | "allowlist" | "timelock") {
    if (r.policies.length >= 5) return;
    const p: PolicyRule = kind === "spendingLimit" ? { kind, asset: "USDC", amount: 10_000n * 10_000_000n, periodSeconds: 86400 } : kind === "allowlist" ? { kind, destinations: [] } : { kind, seconds: 3600 };
    setR({ ...r, policies: [...r.policies, p] });
  }
  function update(i: number, p: PolicyRule) {
    const idx = r.policies.indexOf(extras[i]!);
    setR({ ...r, policies: r.policies.map((x, j) => (j === idx ? p : x)) });
  }
  function remove(i: number) {
    const idx = r.policies.indexOf(extras[i]!);
    setR({ ...r, policies: r.policies.filter((_, j) => j !== idx) });
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium">Additional policies <span className="text-muted font-normal">({r.policies.length}/5)</span></p>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => add("spendingLimit")} disabled={r.policies.length >= 5}>+ Spending limit</Button>
          <Button size="sm" variant="ghost" onClick={() => add("allowlist")} disabled={r.policies.length >= 5}>+ Allowlist</Button>
          <Button size="sm" variant="ghost" onClick={() => add("timelock")} disabled={r.policies.length >= 5}>+ Timelock</Button>
        </div>
      </div>
      {extras.length === 0 && <p className="text-xs text-muted">Threshold only. All attached policies must pass for auth to succeed.</p>}
      {extras.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] items-start gap-2 rounded-[var(--radius-md)] border border-line p-3">
          {p.kind === "spendingLimit" && (
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Asset">{(id) => <Input id={id} value={p.asset} onChange={(e) => update(i, { ...p, asset: e.target.value.toUpperCase() })} />}</Field>
              <Field label="Max per period">{(id) => <Input id={id} mono value={formatAmount(p.amount, 7, 7)} onChange={(e) => { const n = Number(e.target.value.replace(/,/g, "")); if (!Number.isNaN(n)) update(i, { ...p, amount: BigInt(Math.round(n * 1e7)) }); }} />}</Field>
              <Field label="Period">{(id) => <Select id={id} value={p.periodSeconds} onChange={(e) => update(i, { ...p, periodSeconds: Number(e.target.value) })}><option value={3600}>1 hour</option><option value={86400}>1 day</option><option value={604800}>1 week</option><option value={2592000}>30 days</option></Select>}</Field>
            </div>
          )}
          {p.kind === "allowlist" && (
            <Field label="Destinations" hint="One address per line.">
              {(id) => <textarea id={id} className="w-full rounded-[var(--radius-md)] border border-line bg-elevated px-3 py-2 font-mono text-[12px] min-h-16" value={p.destinations.join("\n")} onChange={(e) => update(i, { ...p, destinations: e.target.value.split("\n").map((s) => s.trim().toUpperCase()).filter(Boolean) })} />}
            </Field>
          )}
          {p.kind === "timelock" && (
            <Field label="Delay">{(id) => <Select id={id} value={p.seconds} onChange={(e) => update(i, { ...p, seconds: Number(e.target.value) })}><option value={900}>15 min</option><option value={3600}>1 hour</option><option value={21600}>6 hours</option><option value={86400}>1 day</option><option value={604800}>7 days</option><option value={2592000}>30 days</option></Select>}</Field>
          )}
          <Button size="sm" variant="ghost" onClick={() => remove(i)} aria-label="Remove policy">×</Button>
        </div>
      ))}
    </div>
  );
}
