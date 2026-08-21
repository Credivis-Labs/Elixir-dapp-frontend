import { ROLE_EXECUTE } from "./types";
import type { ElixirAccount, Proposal } from "./types";
import { formatDuration } from "./format";

// The checks elixir_queue::execute runs, in order. docs/ARCHITECTURE.md §7.
export type GateCheckId = "status" | "epoch" | "timelock" | "expiry" | "role" | "frozen";

export interface GateCheck {
  id: GateCheckId;
  label: string;
  pass: boolean;
  detail: string;
}

export interface GateResult {
  checks: GateCheck[];
  open: boolean;
}

const CONFIG_OPS = new Set(["reconfigure", "freeze", "unfreeze"]);

export function isConfigProposal(p: Proposal): boolean {
  return p.invocations.length > 0 && p.invocations.every((i) => CONFIG_OPS.has(i.summary.kind));
}

export function evaluateGate(
  p: Proposal,
  account: ElixirAccount,
  caller: string | null,
  now: number,
): GateResult {
  const statusOk = p.status === "Approved";
  const epochOk = p.configEpoch === account.config.configEpoch;
  const unlockAt = (p.approvedAt ?? 0) + account.config.timeLock;
  const timelockOk = statusOk && now >= unlockAt;
  const expiryOk = now < p.expiresAt;
  const signer = caller ? account.signers.find((s) => s.address === caller) : undefined;
  const roleOk = !!signer && (signer.roles & ROLE_EXECUTE) !== 0;
  const frozen = account.config.frozenUntil > now;
  const frozenOk = !frozen || isConfigProposal(p);

  const checks: GateCheck[] = [
    {
      id: "status",
      label: "Approved",
      pass: statusOk,
      detail: statusOk ? "Threshold met" : `Status is ${p.status}`,
    },
    {
      id: "epoch",
      label: "Config epoch matches",
      pass: epochOk,
      detail: epochOk
        ? `Epoch ${p.configEpoch}`
        : `Stamped epoch ${p.configEpoch}, account is at ${account.config.configEpoch}. Signers or policies changed after this was created.`,
    },
    {
      id: "timelock",
      label: "Timelock elapsed",
      pass: timelockOk,
      detail: !statusOk
        ? "Starts when approved"
        : timelockOk
          ? "Window closed"
          : `Unlocks in ${formatDuration(Math.max(0, unlockAt - now))}`,
    },
    {
      id: "expiry",
      label: "Not expired",
      pass: expiryOk,
      detail: expiryOk ? `Expires in ${formatDuration(Math.max(0, p.expiresAt - now))}` : "Past absolute expiry",
    },
    {
      id: "role",
      label: "Caller can execute",
      pass: roleOk,
      detail: !caller
        ? "No wallet connected"
        : roleOk
          ? "Execute role"
          : "Connected signer lacks the Execute role",
    },
    {
      id: "frozen",
      label: "Account not frozen",
      pass: frozenOk,
      detail: frozenOk
        ? frozen
          ? "Frozen, but config operations are allowed"
          : "Active"
        : "Frozen; only config operations may execute",
    },
  ];

  return { checks, open: checks.every((c) => c.pass) };
}

export function approvalsFor(p: Proposal): string[] {
  return p.votes.filter((v) => v.decision === "approve").map((v) => v.signer);
}

export function rejectionsFor(p: Proposal): string[] {
  return p.votes.filter((v) => v.decision === "reject").map((v) => v.signer);
}
