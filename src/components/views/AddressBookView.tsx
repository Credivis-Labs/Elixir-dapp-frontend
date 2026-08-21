"use client";

import { useMemo, useState } from "react";
import { AccountGuard } from "@/components/shell/AccountGuard";
import { useAddressBook } from "@/hooks/use-data";
import { useRemoveAddressBook, useUpsertAddressBook } from "@/hooks/use-actions";
import { useWallet } from "@/hooks/use-wallet";
import { useNow } from "@/hooks/use-clock";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Misc";
import { Pill } from "@/components/ui/Pill";
import { AddressChip } from "@/components/domain/AddressChip";
import { isAddress } from "@/lib/strkey";
import { relativeTime } from "@/lib/format";
import type { AddressBookEntry, ElixirAccount } from "@/lib/types";

export function AddressBookView({ address }: { address: string }) {
  return <AccountGuard address={address}>{(account) => <Book address={address} account={account} />}</AccountGuard>;
}

function Book({ address, account }: { address: string; account: ElixirAccount }) {
  const entries = useAddressBook(address);
  const { session } = useWallet();
  const upsert = useUpsertAddressBook(address);
  const remove = useRemoveAddressBook(address);
  const now = useNow(60_000);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<AddressBookEntry> | null>(null);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return entries;
    return entries.filter((e) => e.label.toLowerCase().includes(n) || e.address.toLowerCase().includes(n) || e.tags.some((t) => t.includes(n)));
  }, [entries, q]);

  const tags = useMemo(() => [...new Set(entries.flatMap((e) => e.tags))].sort(), [entries]);
  const labelFor = (a: string) => account.signers.find((s) => s.address === a)?.label;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Address book"
        eyebrow={account.name}
        description="Shared across everyone on this account. The proposal builder flags any destination that isn't here."
        action={<Button onClick={() => setEditing({ address: "", label: "", tags: [] })}>Add address</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search label, address, tag" className="max-w-xs" />
        {tags.map((t) => (
          <button key={t} type="button" onClick={() => setQ(q === t ? "" : t)} className="text-xs">
            <Pill tone={q === t ? "accent" : "faint"}>{t}</Pill>
          </button>
        ))}
      </div>

      <Card>
        {list.length === 0 ? (
          <div className="p-5">
            <EmptyState title={q ? "No matches" : "Empty address book"} body={q ? undefined : "Add vendors, grantees, exchanges and internal accounts so signers can recognise destinations at a glance."} />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((e) => (
              <li key={e.address} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3 sm:grid-cols-[200px_1fr_auto_auto]">
                <span className="font-medium text-sm truncate">{e.label}</span>
                <div className="min-w-0 flex items-center gap-2">
                  <AddressChip address={e.address} size="sm" full className="max-w-full" />
                </div>
                <div className="flex flex-wrap gap-1 col-span-2 sm:col-span-1">
                  {e.tags.map((t) => (
                    <Pill key={t} tone="faint">{t}</Pill>
                  ))}
                  <span className="text-[11px] text-faint ml-1 self-center">by {labelFor(e.addedBy) ?? e.addedBy.slice(0, 6)} · {relativeTime(e.addedAt, now)}</span>
                </div>
                <div className="flex items-center gap-1 col-start-2 row-start-1 sm:col-start-4">
                  <LinkButton href={`/a/${address}/proposals/new?to=${e.address}`} size="sm" variant="ghost">Send</LinkButton>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(e)}>Edit</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <EntryDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (e) => {
            await upsert.run({ ...e, addedBy: editing.addedBy ?? session?.address ?? "", addedAt: editing.addedAt ?? Math.floor(Date.now() / 1000) });
            setEditing(null);
          }}
          onDelete={editing.addedAt ? async () => { await remove.run(editing.address!); setEditing(null); } : undefined}
          pending={upsert.pending || remove.pending}
        />
      )}
    </div>
  );
}

function EntryDialog({ initial, onClose, onSave, onDelete, pending }: { initial: Partial<AddressBookEntry>; onClose: () => void; onSave: (e: Pick<AddressBookEntry, "address" | "label" | "tags">) => void; onDelete?: () => void; pending: boolean }) {
  const [addr, setAddr] = useState(initial.address ?? "");
  const [label, setLabel] = useState(initial.label ?? "");
  const [tags, setTags] = useState((initial.tags ?? []).join(", "));
  const ok = isAddress(addr) && label.trim().length > 0;
  return (
    <Dialog open onClose={onClose} title={initial.addedAt ? "Edit address" : "Add address"} width="sm"
      footer={
        <>
          {onDelete && <Button variant="ghost" className="mr-auto text-danger" onClick={onDelete} pending={pending}>Remove</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!ok} pending={pending} onClick={() => onSave({ address: addr, label: label.trim(), tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) })}>Save</Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label="Label">{(id) => <Input id={id} value={label} onChange={(e) => setLabel(e.target.value)} autoFocus placeholder="OtterSec" />}</Field>
        <Field label="Address" error={addr && !isAddress(addr) ? "Not a valid Stellar address" : null}>
          {(id) => <Input id={id} mono value={addr} onChange={(e) => setAddr(e.target.value.trim().toUpperCase())} disabled={!!initial.addedAt} placeholder="G… or C…" />}
        </Field>
        <Field label="Tags" hint="Comma-separated.">{(id) => <Input id={id} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vendor, audit" />}</Field>
      </div>
    </Dialog>
  );
}
