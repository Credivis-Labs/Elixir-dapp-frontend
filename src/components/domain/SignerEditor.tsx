"use client";

import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { SignerKind } from "@/lib/types";
import { ROLE_ALL, ROLE_EXECUTE, ROLE_INITIATE, ROLE_VOTE } from "@/lib/types";
import { isAddress } from "@/lib/strkey";
import { cn } from "@/lib/cn";

export interface DraftSigner {
  address: string;
  label: string;
  kind: SignerKind;
  roles: number;
  weight: number;
}

const KINDS: { value: SignerKind; label: string }[] = [
  { value: "ed25519", label: "Ed25519 key" },
  { value: "passkey", label: "Passkey" },
  { value: "ledger", label: "Ledger" },
  { value: "contract", label: "Contract account" },
];

export function SignerEditor({ signers, onChange, allowRoles, allowWeights, lockedAddress }: { signers: DraftSigner[]; onChange: (s: DraftSigner[]) => void; allowRoles: boolean; allowWeights: boolean; lockedAddress?: string }) {
  function update(i: number, patch: Partial<DraftSigner>) {
    onChange(signers.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }
  function remove(i: number) {
    onChange(signers.filter((_, j) => j !== i));
  }
  function add() {
    onChange([...signers, { address: "", label: "", kind: "ed25519", roles: ROLE_ALL, weight: 1 }]);
  }
  function toggleRole(i: number, role: number) {
    const s = signers[i]!;
    update(i, { roles: s.roles ^ role });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="hidden sm:grid grid-cols-[1fr_2fr_130px_auto_auto] gap-2 px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        <span>Label</span>
        <span>Address</span>
        <span>Kind</span>
        <span>{allowRoles ? "Roles" : allowWeights ? "Weight" : ""}</span>
        <span />
      </div>
      {signers.map((s, i) => {
        const bad = s.address.length > 0 && !isAddress(s.address);
        const locked = s.address === lockedAddress;
        return (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_130px_auto_auto] gap-2 items-start rounded-[var(--radius-md)] border border-line p-2 sm:border-0 sm:p-0">
            <Input value={s.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Name" aria-label="Label" />
            <div>
              <Input mono value={s.address} onChange={(e) => update(i, { address: e.target.value.trim().toUpperCase() })} placeholder="G… or C…" aria-label="Address" disabled={locked} className={cn(bad && "border-danger")} />
              {bad && <p className="mt-1 text-[11px] text-danger">Not a valid Stellar address.</p>}
            </div>
            <Select value={s.kind} onChange={(e) => update(i, { kind: e.target.value as SignerKind })} aria-label="Kind">
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
            {allowRoles ? (
              <div className="flex h-10 items-center gap-1" role="group" aria-label="Roles">
                {[
                  { r: ROLE_INITIATE, l: "I", t: "Initiate" },
                  { r: ROLE_VOTE, l: "V", t: "Vote" },
                  { r: ROLE_EXECUTE, l: "E", t: "Execute" },
                ].map(({ r, l, t }) => (
                  <button
                    key={r}
                    type="button"
                    title={t}
                    aria-pressed={(s.roles & r) !== 0}
                    onClick={() => toggleRole(i, r)}
                    className={cn("grid size-8 place-items-center rounded-[var(--radius-sm)] border text-[12px] font-medium", (s.roles & r) !== 0 ? "bg-fg text-bg border-fg" : "border-line text-faint")}
                  >
                    {l}
                  </button>
                ))}
              </div>
            ) : allowWeights ? (
              <Input type="number" min={1} max={255} value={s.weight} onChange={(e) => update(i, { weight: Number(e.target.value) })} className="w-20" aria-label="Weight" />
            ) : (
              <span />
            )}
            <Button variant="ghost" size="sm" onClick={() => remove(i)} disabled={locked} aria-label="Remove signer" className="h-10">
              Remove
            </Button>
          </div>
        );
      })}
      <div>
        <Button variant="secondary" size="sm" onClick={add}>
          Add signer
        </Button>
      </div>
    </div>
  );
}
