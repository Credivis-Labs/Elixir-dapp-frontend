import type {
  CreateAccountInput,
  CreateProposalInput,
  ElixirClient,
  ReconfigureInput,
} from "../client";
import type {
  ActivityEvent,
  AddressBookEntry,
  Balance,
  ContextRule,
  ElixirAccount,
  Invocation,
  LedgerInfo,
  Proposal,
  SimulationEffect,
  SimulationResult,
  Subaccount,
} from "../types";
import { ROLE_EXECUTE, ROLE_INITIATE, ROLE_VOTE } from "../types";
import { evaluateGate, approvalsFor } from "../gate";
import { buildSeed, fakeAddress, fakeHash, type MockState } from "./seed";

const STORAGE_KEY = "elixir.mock.v2";
const MAX_FREEZE_SECONDS = 72 * 3600;
const PROPOSAL_LIFETIME = 7 * 86400;
const AUTH_LIFETIME_LEDGERS = 8640;

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function replacer(_k: string, v: unknown): unknown {
  return typeof v === "bigint" ? { __big: v.toString() } : v;
}

function reviver(_k: string, v: unknown): unknown {
  if (v && typeof v === "object" && "__big" in v) {
    return BigInt((v as { __big: string }).__big);
  }
  return v;
}

function load(): MockState {
  if (typeof window === "undefined") return buildSeed(nowSec());
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw, reviver) as MockState;
      if (parsed.version === 1) return parsed;
    }
  } catch {
    // fall through to seed
  }
  return buildSeed(nowSec());
}

function delay(ms = 350): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class MockClient implements ElixirClient {
  private state: MockState;
  private listeners = new Set<() => void>();
  private version = 0;

  constructor() {
    this.state = load();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getVersion(): number {
    return this.version;
  }

  private commit(mutate: (s: MockState) => void): void {
    mutate(this.state);
    this.version++;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state, replacer));
    }
    this.listeners.forEach((l) => l());
  }

  resetDemo(): void {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    this.state = buildSeed(nowSec());
    this.version++;
    this.listeners.forEach((l) => l());
  }

  getLedger(): LedgerInfo {
    const now = nowSec();
    return { sequence: 58_000_000 + Math.floor((now - this.state.genesis) / 5), closedAt: now };
  }

  listAccounts(signer: string | null): ElixirAccount[] {
    if (!signer) return [];
    return this.state.accounts.filter((a) => a.signers.some((s) => s.address === signer));
  }

  getAccount(address: string): ElixirAccount | null {
    return this.state.accounts.find((a) => a.address === address) ?? null;
  }

  getBalances(address: string): Balance[] {
    return this.state.balances[address] ?? [];
  }

  listSubaccounts(address: string): Subaccount[] {
    return (this.state.subaccounts[address] ?? []).map((s) => ({
      ...s,
      balances: this.state.balances[s.address] ?? [],
    }));
  }

  listProposals(address: string): Proposal[] {
    return [...(this.state.proposals[address] ?? [])].sort((a, b) => b.id - a.id);
  }

  getProposal(address: string, id: number): Proposal | null {
    return (this.state.proposals[address] ?? []).find((p) => p.id === id) ?? null;
  }

  listRules(address: string): ContextRule[] {
    return this.state.rules[address] ?? [];
  }

  listActivity(address: string): ActivityEvent[] {
    return [...(this.state.activity[address] ?? [])].sort((a, b) => b.at - a.at);
  }

  listAddressBook(address: string): AddressBookEntry[] {
    return [...(this.state.addressBook[address] ?? [])].sort((a, b) => a.label.localeCompare(b.label));
  }

  async simulate(address: string, invocations: Invocation[], rpc: string, proposalId?: number): Promise<SimulationResult> {
    await delay(600);
    // Real adapter derives the payload from the assembled auth entry XDR. The mock
    // reuses the stored payload so the sign screen's equality check is meaningful.
    const existing = proposalId !== undefined ? this.getProposal(address, proposalId) : null;
    const effects: SimulationEffect[] = [];
    let error: string | null = null;
    for (const inv of invocations) {
      const s = inv.summary;
      if (s.kind === "transfer") {
        const from = String(inv.args.find((a) => a.name === "from")?.value ?? address);
        const bal = (this.state.balances[from] ?? []).find((b) => b.asset.code === s.asset.code);
        if (!bal || bal.amount < s.amount) {
          error = `Insufficient ${s.asset.code} on ${from.slice(0, 4)}…${from.slice(-4)}`;
        }
        effects.push({ kind: "debit", description: `Debit ${s.asset.code}`, address: from, asset: s.asset, amount: s.amount });
        effects.push({ kind: "credit", description: `Credit ${s.asset.code}`, address: s.to, asset: s.asset, amount: s.amount });
      } else if (s.kind === "reconfigure") {
        effects.push({ kind: "state", description: `Signers → ${s.signerCount}, threshold → ${s.threshold}, config epoch +1`, address });
      } else if (s.kind === "freeze") {
        effects.push({ kind: "state", description: `Freeze non-config execution for ${s.durationSeconds}s`, address });
      } else if (s.kind === "unfreeze") {
        effects.push({ kind: "state", description: "Clear freeze", address });
      } else {
        effects.push({ kind: "state", description: s.description, address: inv.target });
      }
    }
    const payloadSeed = JSON.stringify(invocations, replacer) + address;
    return {
      ok: error === null,
      rpc,
      signaturePayload: existing ? existing.signaturePayload : fakeHash(payloadSeed),
      minResourceFee: 184_320n + BigInt(invocations.length) * 61_000n,
      ledgersUntilAuthExpiry: AUTH_LIFETIME_LEDGERS,
      effects,
      error,
    };
  }

  private pushActivity(address: string, e: Omit<ActivityEvent, "id" | "account" | "ledger">): void {
    const list = (this.state.activity[address] ??= []);
    list.push({
      ...e,
      id: `ev-${address.slice(-6)}-${list.length + 1}-${e.at}`,
      account: address,
      ledger: this.getLedger().sequence,
    });
  }

  async createAccount(input: CreateAccountInput): Promise<ElixirAccount> {
    await delay(900);
    const now = nowSec();
    const address = fakeAddress(input.kind === "smart" ? "C" : "G", `${input.name}-${now}-${input.creator}`);
    const account: ElixirAccount = {
      address,
      name: input.name,
      kind: input.kind,
      network: input.network,
      threshold: input.threshold,
      signers: input.signers.map((s) => ({ ...s, addedAt: now })),
      config: {
        configEpoch: 1,
        timeLock: input.timeLock,
        queue: input.queue && input.kind === "smart" ? fakeAddress("C", `${address}-queue`) : null,
        subaccounts: 1,
        frozenUntil: 0,
      },
      lastActivity: now,
      createdAt: now,
      wasmHash: input.kind === "smart" ? fakeHash("elixir-account-v1") : "",
    };
    this.commit((s) => {
      s.accounts.push(account);
      s.balances[address] = [];
      s.subaccounts[address] = [{ index: 0, address, label: "Main", deployed: true, balances: [] }];
      s.proposals[address] = [];
      s.rules[address] = [
        {
          id: 0,
          name: "Default",
          scope: { kind: "any" },
          signers: input.signers.map((x) => x.address),
          policies: [{ kind: "threshold", threshold: input.threshold }],
          enabled: true,
        },
      ];
      s.activity[address] = [];
      s.addressBook[address] = [];
    });
    this.pushActivity(address, { kind: "subaccount.deployed", at: now, actor: input.creator, proposalId: null, detail: `${input.name} created`, txHash: fakeHash(`create-${address}`) });
    return account;
  }

  private nextId(address: string): number {
    const list = this.state.proposals[address] ?? [];
    return list.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  }

  private requireSigner(address: string, signer: string, role: number): ElixirAccount {
    const account = this.getAccount(address);
    if (!account) throw new Error("Account not found");
    const s = account.signers.find((x) => x.address === signer);
    if (!s) throw new Error("Connected wallet is not a signer on this account");
    if ((s.roles & role) === 0) throw new Error("Connected signer lacks the required role");
    return account;
  }

  async createProposal(address: string, input: CreateProposalInput): Promise<Proposal> {
    await delay();
    const account = this.requireSigner(address, input.creator, ROLE_INITIATE);
    const now = nowSec();
    const id = this.nextId(address);
    const proposal: Proposal = {
      id,
      account: address,
      creator: input.creator,
      subaccount: input.subaccount,
      title: input.title,
      memo: input.memo,
      invocations: input.invocations,
      configEpoch: account.config.configEpoch,
      status: "Active",
      votes: [{ signer: input.creator, decision: "approve", at: now }],
      createdAt: now,
      approvedAt: null,
      executedAt: null,
      expiresAt: now + PROPOSAL_LIFETIME,
      authExpiresAtLedger: this.getLedger().sequence + AUTH_LIFETIME_LEDGERS,
      signaturePayload: fakeHash(JSON.stringify(input.invocations, replacer) + address + id),
      txHash: null,
    };
    this.settle(proposal, account, now);
    this.commit((s) => {
      (s.proposals[address] ??= []).push(proposal);
      this.pushActivity(address, { kind: "proposal.created", at: now, actor: input.creator, proposalId: id, detail: `Proposed #${id} ${input.title}`, txHash: null });
    });
    return proposal;
  }

  private settle(p: Proposal, account: ElixirAccount, now: number): void {
    const approvals = approvalsFor(p).length;
    const rejections = p.votes.filter((v) => v.decision === "reject").length;
    if (p.status !== "Active") return;
    if (approvals >= account.threshold) {
      p.status = "Approved";
      p.approvedAt = now;
    } else if (rejections > account.signers.length - account.threshold) {
      p.status = "Rejected";
    }
  }

  async vote(address: string, id: number, signer: string, decision: "approve" | "reject"): Promise<Proposal> {
    await delay();
    const account = this.requireSigner(address, signer, ROLE_VOTE);
    const now = nowSec();
    let result: Proposal | null = null;
    this.commit((s) => {
      const p = (s.proposals[address] ?? []).find((x) => x.id === id);
      if (!p) throw new Error("Proposal not found");
      if (p.status !== "Active") throw new Error(`Cannot vote on a ${p.status} proposal`);
      if (p.votes.some((v) => v.signer === signer)) throw new Error("Already voted");
      p.votes.push({ signer, decision, at: now });
      const before = p.status;
      this.settle(p, account, now);
      const label = account.signers.find((x) => x.address === signer)?.label ?? signer.slice(0, 6);
      this.pushActivity(address, {
        kind: decision === "approve" ? "proposal.approved" : "proposal.rejected",
        at: now,
        actor: signer,
        proposalId: id,
        detail: `${label} ${decision === "approve" ? "approved" : "rejected"} #${id}${before !== p.status ? ` — now ${p.status}` : ""}`,
        txHash: null,
      });
      const acct = s.accounts.find((a) => a.address === address);
      if (acct) acct.lastActivity = now;
      result = p;
    });
    return result!;
  }

  async execute(address: string, id: number, signer: string): Promise<Proposal> {
    await delay(900);
    const account = this.requireSigner(address, signer, ROLE_EXECUTE);
    const now = nowSec();
    let result: Proposal | null = null;
    this.commit((s) => {
      const p = (s.proposals[address] ?? []).find((x) => x.id === id);
      if (!p) throw new Error("Proposal not found");
      const gate = evaluateGate(p, account, signer, now);
      if (!gate.open) {
        const failed = gate.checks.find((c) => !c.pass);
        throw new Error(failed ? `${failed.label}: ${failed.detail}` : "Execute gate closed");
      }
      // Mark executed before applying effects — mirrors the reentrancy ordering in B3.
      p.status = "Executed";
      p.executedAt = now;
      p.txHash = fakeHash(`tx-${address}-${id}-${now}`);
      this.applyEffects(s, address, p, now);
      const acct = s.accounts.find((a) => a.address === address);
      if (acct) acct.lastActivity = now;
      this.pushActivity(address, { kind: "proposal.executed", at: now, actor: signer, proposalId: id, detail: `#${id} executed`, txHash: p.txHash });
      result = p;
    });
    return result!;
  }

  private applyEffects(s: MockState, address: string, p: Proposal, now: number): void {
    const acct = s.accounts.find((a) => a.address === address);
    if (!acct) return;
    for (const inv of p.invocations) {
      const sum = inv.summary;
      if (sum.kind === "transfer") {
        const from = String(inv.args.find((a) => a.name === "from")?.value ?? address);
        const fromBal = (s.balances[from] ??= []);
        const b = fromBal.find((x) => x.asset.code === sum.asset.code);
        if (b) {
          b.amount -= sum.amount;
          if (b.usd !== null) b.usd = Number(b.amount) / 1e7 * (sum.asset.code === "XLM" ? 0.41 : sum.asset.code === "EURC" ? 1.09 : 1);
        }
        const toBal = (s.balances[sum.to] ??= []);
        const tb = toBal.find((x) => x.asset.code === sum.asset.code);
        if (tb) tb.amount += sum.amount;
        else if (s.accounts.some((a) => a.address === sum.to) || Object.values(s.subaccounts).flat().some((x) => x.address === sum.to)) {
          toBal.push({ asset: sum.asset, amount: sum.amount, usd: null });
        }
      } else if (sum.kind === "reconfigure") {
        const pending = (inv.args.find((a) => a.name === "__signers")?.value ?? null) as ReconfigureInput["signers"] | null;
        if (pending) {
          acct.signers = pending.map((x) => ({ ...x, addedAt: acct.signers.find((o) => o.address === x.address)?.addedAt ?? now }));
        }
        acct.threshold = sum.threshold;
        acct.config.configEpoch += 1;
        const rule = (s.rules[address] ?? []).find((r) => r.id === sum.ruleId);
        if (rule) {
          rule.signers = acct.signers.map((x) => x.address);
          const t = rule.policies.find((x) => x.kind === "threshold" || x.kind === "weighted");
          if (t && "threshold" in t) t.threshold = sum.threshold;
        }
        const stale = (s.proposals[address] ?? []).filter((x) => x.id !== p.id && (x.status === "Active" || x.status === "Approved")).length;
        this.pushActivity(address, {
          kind: "account.reconfigured",
          at: now,
          actor: null,
          proposalId: p.id,
          detail: `Epoch ${acct.config.configEpoch - 1} → ${acct.config.configEpoch}. ${acct.signers.length} signers, ${sum.threshold}-of-${acct.signers.length}.${stale ? ` ${stale} pending proposal${stale === 1 ? "" : "s"} went stale.` : ""}`,
          txHash: p.txHash,
        });
      } else if (sum.kind === "unfreeze") {
        acct.config.frozenUntil = 0;
        this.pushActivity(address, { kind: "account.unfrozen", at: now, actor: null, proposalId: p.id, detail: "Account unfrozen by threshold", txHash: p.txHash });
      } else if (sum.kind === "call" && inv.fnName === "set_time_lock") {
        const secs = Number(inv.args.find((a) => a.name === "seconds")?.value ?? acct.config.timeLock);
        acct.config.timeLock = secs;
        acct.config.configEpoch += 1;
      } else if (sum.kind === "call" && inv.fnName === "deploy_subaccount") {
        const idx = Number(inv.args.find((a) => a.name === "index")?.value ?? 0);
        const sub = (s.subaccounts[address] ?? []).find((x) => x.index === idx);
        if (sub) sub.deployed = true;
        this.pushActivity(address, { kind: "subaccount.deployed", at: now, actor: null, proposalId: p.id, detail: `Sub-account #${idx} ${sub?.label ?? ""} deployed`, txHash: p.txHash });
      }
    }
  }

  async cancel(address: string, id: number, signer: string): Promise<Proposal> {
    await delay();
    const account = this.requireSigner(address, signer, ROLE_VOTE);
    const now = nowSec();
    let result: Proposal | null = null;
    this.commit((s) => {
      const p = (s.proposals[address] ?? []).find((x) => x.id === id);
      if (!p) throw new Error("Proposal not found");
      if (p.status !== "Active" && p.status !== "Approved") throw new Error(`Cannot cancel a ${p.status} proposal`);
      p.status = "Cancelled";
      const label = account.signers.find((x) => x.address === signer)?.label ?? signer.slice(0, 6);
      this.pushActivity(address, { kind: "proposal.cancelled", at: now, actor: signer, proposalId: id, detail: `${label} cancelled #${id}`, txHash: null });
      result = p;
    });
    return result!;
  }

  async proposeReconfigure(address: string, input: ReconfigureInput): Promise<Proposal> {
    const inv: Invocation = {
      target: address,
      fnName: "reconfigure",
      args: [
        { name: "rule_id", type: "u32", value: 0 },
        { name: "signer_count", type: "u32", value: input.signers.length },
        { name: "threshold", type: "u32", value: input.threshold },
        { name: "__signers", type: "Vec<Signer>", value: input.signers },
      ],
      summary: { kind: "reconfigure", signerCount: input.signers.length, threshold: input.threshold, ruleId: 0 },
    };
    return this.createProposal(address, {
      title: `Reconfigure: ${input.threshold}-of-${input.signers.length}`,
      memo: "Atomic signer + threshold update. Bumps config epoch; all pending proposals go stale.",
      subaccount: null,
      invocations: [inv],
      creator: input.proposer,
    });
  }

  async freeze(address: string, signer: string, durationSeconds: number): Promise<void> {
    await delay();
    this.requireSigner(address, signer, ROLE_VOTE);
    const now = nowSec();
    const dur = Math.min(Math.max(60, durationSeconds), MAX_FREEZE_SECONDS);
    this.commit((s) => {
      const acct = s.accounts.find((a) => a.address === address);
      if (!acct) throw new Error("Account not found");
      acct.config.frozenUntil = now + dur;
      const label = acct.signers.find((x) => x.address === signer)?.label ?? signer.slice(0, 6);
      this.pushActivity(address, { kind: "account.frozen", at: now, actor: signer, proposalId: null, detail: `${label} froze the account for ${Math.round(dur / 3600)}h`, txHash: fakeHash(`freeze-${now}`) });
    });
  }

  async proposeUnfreeze(address: string, proposer: string): Promise<Proposal> {
    return this.createProposal(address, {
      title: "Unfreeze account",
      memo: "Clears the emergency freeze. Requires normal threshold.",
      subaccount: null,
      invocations: [
        { target: address, fnName: "unfreeze", args: [], summary: { kind: "unfreeze" } },
      ],
      creator: proposer,
    });
  }

  async deploySubaccount(address: string, label: string, signer: string): Promise<Subaccount> {
    await delay();
    this.requireSigner(address, signer, ROLE_INITIATE);
    let created: Subaccount | null = null;
    this.commit((s) => {
      const acct = s.accounts.find((a) => a.address === address);
      if (!acct) throw new Error("Account not found");
      const index = acct.config.subaccounts;
      const subAddress = fakeAddress("C", `${address}-sub-${index}`);
      created = { index, address: subAddress, label, deployed: false, balances: [] };
      (s.subaccounts[address] ??= []).push(created);
      s.balances[subAddress] = [];
      acct.config.subaccounts = index + 1;
    });
    const sub = created!;
    await this.createProposal(address, {
      title: `Deploy sub-account #${sub.index} ${label}`,
      memo: "Address is deterministic from (parent, index); it can receive funds before deployment once the SAC spike confirms.",
      subaccount: null,
      invocations: [
        {
          target: fakeAddress("C", "elixir-factory"),
          fnName: "deploy_subaccount",
          args: [
            { name: "parent", type: "Address", value: address },
            { name: "index", type: "u32", value: sub.index },
          ],
          summary: { kind: "call", description: `Deploy sub-account #${sub.index} from factory` },
        },
      ],
      creator: signer,
    });
    return sub;
  }

  async renameSubaccount(address: string, index: number, label: string): Promise<void> {
    this.commit((s) => {
      const sub = (s.subaccounts[address] ?? []).find((x) => x.index === index);
      if (sub) sub.label = label;
    });
  }

  async saveRules(address: string, rules: ContextRule[], signer: string): Promise<void> {
    await delay();
    this.requireSigner(address, signer, ROLE_INITIATE);
    const now = nowSec();
    this.commit((s) => {
      s.rules[address] = rules;
      const acct = s.accounts.find((a) => a.address === address);
      if (acct) acct.config.configEpoch += 1;
      this.pushActivity(address, { kind: "account.reconfigured", at: now, actor: signer, proposalId: null, detail: `Policy rules saved. Epoch → ${acct?.config.configEpoch ?? "?"}.`, txHash: fakeHash(`rules-${now}`) });
    });
  }

  async upsertAddressBookEntry(address: string, entry: AddressBookEntry): Promise<void> {
    this.commit((s) => {
      const list = (s.addressBook[address] ??= []);
      const i = list.findIndex((e) => e.address === entry.address);
      if (i >= 0) list[i] = entry;
      else list.push(entry);
    });
  }

  async removeAddressBookEntry(address: string, entryAddress: string): Promise<void> {
    this.commit((s) => {
      s.addressBook[address] = (s.addressBook[address] ?? []).filter((e) => e.address !== entryAddress);
    });
  }

  async updateTimeLock(address: string, seconds: number, signer: string): Promise<Proposal> {
    return this.createProposal(address, {
      title: `Set timelock to ${seconds}s`,
      memo: "Config change; routes through the config-scoped rule.",
      subaccount: null,
      invocations: [
        {
          target: address,
          fnName: "set_time_lock",
          args: [{ name: "seconds", type: "u32", value: seconds }],
          summary: { kind: "call", description: `Set execution timelock to ${seconds} seconds` },
        },
      ],
      creator: signer,
    });
  }
}
