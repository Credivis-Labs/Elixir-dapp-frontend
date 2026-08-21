"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AccountGuard } from "@/components/shell/AccountGuard";
import { useProposalBuckets, useProposals } from "@/hooks/use-data";
import { Card, PageHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Input, Segmented } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Misc";
import { ProposalRow } from "@/components/domain/ProposalRow";
import type { ElixirAccount } from "@/lib/types";

type Filter = "needs-you" | "open" | "closed" | "all";

export function ProposalsView({ address }: { address: string }) {
  return <AccountGuard address={address}>{(account) => <Proposals address={address} account={account} />}</AccountGuard>;
}

function Proposals({ address, account }: { address: string; account: ElixirAccount }) {
  const params = useSearchParams();
  const initial = (params.get("f") as Filter | null) ?? "open";
  const [filter, setFilter] = useState<Filter>(["needs-you", "open", "closed", "all"].includes(initial) ? initial : "open");
  const [q, setQ] = useState("");
  const all = useProposals(address);
  const buckets = useProposalBuckets(address);

  const list = useMemo(() => {
    const base =
      filter === "needs-you" ? buckets.needsYou : filter === "open" ? [...buckets.active, ...buckets.approved].sort((a, b) => b.id - a.id) : filter === "closed" ? buckets.closed : all;
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter((p) => p.title.toLowerCase().includes(needle) || p.memo.toLowerCase().includes(needle) || String(p.id) === needle.replace("#", ""));
  }, [filter, q, buckets, all]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Proposals" eyebrow={account.name} action={<LinkButton href={`/a/${address}/proposals/new`}>New proposal</LinkButton>} />

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "needs-you", label: `Needs you${buckets.needsYou.length ? ` · ${buckets.needsYou.length}` : ""}` },
            { value: "open", label: `Open · ${buckets.active.length + buckets.approved.length}` },
            { value: "closed", label: "Closed" },
            { value: "all", label: "All" },
          ]}
        />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, memo, or #id" className="max-w-xs ml-auto" />
      </div>

      <Card>
        {list.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={filter === "needs-you" ? "Nothing needs your vote" : "No proposals here"}
              body={filter === "needs-you" ? "When a proposal is waiting on your signature it shows up here first." : q ? "Try a different search." : "Create one to move funds, call a contract, or change the account."}
            />
          </div>
        ) : (
          <div className="flex flex-col px-5 py-2">
            {list.map((p) => (
              <ProposalRow key={p.id} proposal={p} account={account} needsYou={buckets.needsYou.includes(p)} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
