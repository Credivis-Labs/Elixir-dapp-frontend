import type { ContextRule, PolicyScope } from "./types";
import { shortAddress } from "./format";

// docs/ARCHITECTURE.md §6.4: the client picks which context rule to evaluate, so
// for any context the EASIEST matching rule must still be acceptable. A broad
// rule must never be looser than a narrower rule whose scope it covers.

export interface LintFinding {
  severity: "error" | "warning";
  ruleIds: number[];
  message: string;
}

export function covers(outer: PolicyScope, inner: PolicyScope): boolean {
  if (outer.kind === "any") return true;
  if (outer.kind === "contract") {
    return inner.kind !== "any" && inner.contract === outer.contract;
  }
  return inner.kind === "function" && inner.contract === outer.contract && inner.fn === outer.fn;
}

export function effectiveThreshold(r: ContextRule): number | null {
  const t = r.policies.find((p) => p.kind === "threshold" || p.kind === "weighted");
  return t && "threshold" in t ? t.threshold : null;
}

export function lintRules(rules: ContextRule[], signerCount: number): LintFinding[] {
  const out: LintFinding[] = [];
  const enabled = rules.filter((r) => r.enabled);

  for (const r of enabled) {
    const t = effectiveThreshold(r);
    if (t === null) {
      out.push({
        severity: "error",
        ruleIds: [r.id],
        message: `${r.name} has no threshold policy. Any single listed signer satisfies it.`,
      });
      continue;
    }
    if (t > r.signers.length) {
      out.push({
        severity: "error",
        ruleIds: [r.id],
        message: `${r.name} requires ${t} of ${r.signers.length} listed signers. Unsatisfiable.`,
      });
    }
    if (r.signers.length > signerCount) {
      out.push({
        severity: "warning",
        ruleIds: [r.id],
        message: `${r.name} lists more signers than the account has.`,
      });
    }
  }

  for (const broad of enabled) {
    const bt = effectiveThreshold(broad);
    if (bt === null) continue;
    for (const narrow of enabled) {
      if (narrow.id === broad.id) continue;
      if (broad.scope.kind === "function" && narrow.scope.kind === "function") continue;
      if (!covers(broad.scope, narrow.scope)) continue;
      const nt = effectiveThreshold(narrow);
      if (nt !== null && bt < nt) {
        out.push({
          severity: "error",
          ruleIds: [broad.id, narrow.id],
          message: `${broad.name} (${bt}-of-${broad.signers.length}) covers the scope of ${narrow.name} (${nt}-of-${narrow.signers.length}). A signer can select the looser rule and bypass the stricter one.`,
        });
      }
    }
  }

  return out;
}

export function describeScope(s: PolicyScope): string {
  if (s.kind === "any") return "Any call";
  if (s.kind === "contract") return `Any function on ${shortAddress(s.contract)}`;
  return `${s.fn}() on ${shortAddress(s.contract)}`;
}

export interface DryRunInput {
  contract: string;
  fn: string;
  signers: string[];
}

export interface DryRunResult {
  allowed: boolean;
  satisfiedBy: ContextRule[];
  matched: ContextRule[];
  reason: string;
}

export function dryRun(rules: ContextRule[], input: DryRunInput): DryRunResult {
  const target: PolicyScope = { kind: "function", contract: input.contract, fn: input.fn };
  const matched = rules.filter((r) => r.enabled && covers(r.scope, target));
  if (matched.length === 0) {
    return { allowed: false, satisfiedBy: [], matched, reason: "No context rule matches this call." };
  }
  const satisfiedBy = matched.filter((r) => {
    const t = effectiveThreshold(r) ?? 1;
    const present = r.signers.filter((s) => input.signers.includes(s)).length;
    return present >= t;
  });
  if (satisfiedBy.length === 0) {
    return {
      allowed: false,
      satisfiedBy,
      matched,
      reason: `${matched.length} rule${matched.length === 1 ? "" : "s"} match but none are satisfied by these signers.`,
    };
  }
  return {
    allowed: true,
    satisfiedBy,
    matched,
    reason: `Satisfied by ${satisfiedBy.map((r) => r.name).join(", ")}.`,
  };
}
