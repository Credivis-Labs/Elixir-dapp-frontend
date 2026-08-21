"use client";

import { useMemo, useState } from "react";
import { AccountGuard } from "@/components/shell/AccountGuard";
import { useActivity, useLabel, useProposals } from "@/hooks/use-data";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Field";
import { Timeline } from "@/components/domain/Timeline";
import type { ActivityEvent, ElixirAccount } from "@/lib/types";
import { formatAmount } from "@/lib/format";

type Filter = "all" | "proposals" | "config" | "funds";

const GROUPS: Record<Filter, ActivityEvent["kind"][] | null> = {
  all: null,
  proposals: ["proposal.created", "proposal.approved", "proposal.rejected", "proposal.executed", "proposal.cancelled", "proposal.expired"],
  config: ["account.reconfigured", "account.frozen", "account.unfrozen", "subaccount.deployed"],
  funds: ["transfer.in", "proposal.executed"],
};

export function ActivityView({ address }: { address: string }) {
  return <AccountGuard address={address}>{(account) => <Activity address={address} account={account} />}</AccountGuard>;
}

function Activity({ address, account }: { address: string; account: ElixirAccount }) {
  const events = useActivity(address);
  const proposals = useProposals(address);
  const label = useLabel(address);
  const [filter, setFilter] = useState<Filter>("all");

  const list = useMemo(() => {
    const g = GROUPS[filter];
    return g ? events.filter((e) => g.includes(e.kind)) : events;
  }, [events, filter]);

  function exportCsv() {
    const rows = [["at", "ledger", "kind", "actor", "proposal", "detail", "tx"]];
    for (const e of events) rows.push([new Date(e.at * 1000).toISOString(), String(e.ledger), e.kind, e.actor ?? "", e.proposalId !== null ? String(e.proposalId) : "", e.detail, e.txHash ?? ""]);
    for (const p of proposals.filter((x) => x.status === "Executed")) {
      for (const inv of p.invocations) {
        if (inv.summary.kind === "transfer") {
          rows.push([new Date((p.executedAt ?? p.createdAt) * 1000).toISOString(), "", "transfer.out", p.creator, String(p.id), `${formatAmount(inv.summary.amount, inv.summary.asset.decimals, 7)} ${inv.summary.asset.code} to ${inv.summary.to}`, p.txHash ?? ""]);
        }
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${account.name.replace(/\s+/g, "-").toLowerCase()}-activity.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Activity"
        eyebrow={account.name}
        description="Indexed from contract events. Soroban RPC only retains events for days; this log comes from Elixir's own ingest and is the durable audit trail."
        action={<Button variant="secondary" onClick={exportCsv}>Export CSV</Button>}
      />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "proposals", label: "Proposals" },
          { value: "config", label: "Config & safety" },
          { value: "funds", label: "Funds" },
        ]}
      />
      <Card>
        <Timeline events={list} accountAddress={address} label={label} className="py-2" />
      </Card>
    </div>
  );
}
