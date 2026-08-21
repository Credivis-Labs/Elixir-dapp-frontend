import { Pill, type PillTone } from "@/components/ui/Pill";
import type { ProposalStatus } from "@/lib/types";
import { roleNames } from "@/lib/format";

const toneFor: Record<ProposalStatus, PillTone> = {
  Draft: "faint",
  Active: "attn",
  Approved: "accent",
  Rejected: "danger",
  Executed: "ok",
  Cancelled: "neutral",
};

export function StatusPill({ status, stale }: { status: ProposalStatus; stale?: boolean }) {
  if (stale && (status === "Active" || status === "Approved")) {
    return (
      <Pill tone="danger" dot>
        Stale
      </Pill>
    );
  }
  return (
    <Pill tone={toneFor[status]} dot={status === "Active" || status === "Approved"}>
      {status}
    </Pill>
  );
}

export function RoleBadges({ roles }: { roles: number }) {
  const names = roleNames(roles);
  return (
    <span className="inline-flex gap-1">
      {(["Initiate", "Vote", "Execute"] as const).map((r) => {
        const on = names.includes(r);
        return (
          <span
            key={r}
            title={r}
            className={
              "grid size-5 place-items-center rounded-[4px] text-[10.5px] font-medium " +
              (on ? "bg-fg text-bg" : "bg-inset text-faint line-through")
            }
          >
            {r[0]}
          </span>
        );
      })}
    </span>
  );
}

export function KindPill({ kind }: { kind: "smart" | "classic" }) {
  return kind === "smart" ? <Pill tone="accent">Smart account</Pill> : <Pill tone="neutral">Classic</Pill>;
}
