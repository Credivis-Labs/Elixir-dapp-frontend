import { cn } from "@/lib/cn";
import type { ElixirAccount, Proposal } from "@/lib/types";
import { ROLE_VOTE } from "@/lib/types";

// One cell per voter. Filled = approved, struck = rejected, hollow = pending.
// The threshold tick marks where "Approved" flips.
export function VoteBar({ proposal, account, className, showLabels }: { proposal: Proposal; account: ElixirAccount; className?: string; showLabels?: boolean }) {
  const voters = account.signers.filter((s) => (s.roles & ROLE_VOTE) !== 0);
  const approvals = proposal.votes.filter((v) => v.decision === "approve").length;
  const cells = voters.map((s) => {
    const v = proposal.votes.find((x) => x.signer === s.address);
    return { signer: s, decision: v?.decision ?? null };
  });
  cells.sort((a, b) => rank(a.decision) - rank(b.decision));

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="relative flex items-center gap-1">
        {cells.map((c) => (
          <span
            key={c.signer.address}
            title={`${c.signer.label}: ${c.decision ?? "pending"}`}
            className={cn(
              "h-2.5 flex-1 rounded-[2px] border",
              c.decision === "approve" && "bg-accent border-accent",
              c.decision === "reject" && "bg-danger/30 border-danger",
              c.decision === null && "bg-transparent border-line-strong",
            )}
          />
        ))}
        {voters.length > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -bottom-1 w-px bg-fg"
            style={{ left: `calc(${(account.threshold / voters.length) * 100}% - ${account.threshold * 0.25}rem + 0.125rem)` }}
          />
        )}
      </div>
      {showLabels && (
        <p className="text-xs text-muted tabular">
          <span className="text-fg font-medium">{approvals}</span> of {account.threshold} needed · {voters.length} voters
        </p>
      )}
    </div>
  );
}

function rank(d: "approve" | "reject" | null): number {
  return d === "approve" ? 0 : d === null ? 1 : 2;
}
