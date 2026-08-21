// Mirrors Elixir-Contracts/packages/elixir_types and elixir_account Config.
// When @credivis/elixir-sdk publishes generated bindings, these become re-exports.

export type Network = "testnet" | "public";

export type AccountKind = "smart" | "classic";

export type ProposalStatus =
  | "Draft"
  | "Active"
  | "Approved"
  | "Rejected"
  | "Executed"
  | "Cancelled";

export const ROLE_INITIATE = 1;
export const ROLE_VOTE = 2;
export const ROLE_EXECUTE = 4;
export const ROLE_ALL = ROLE_INITIATE | ROLE_VOTE | ROLE_EXECUTE;

export type SignerKind = "ed25519" | "passkey" | "ledger" | "contract";

export interface Signer {
  address: string;
  label: string;
  kind: SignerKind;
  roles: number;
  weight: number;
  addedAt: number;
}

export interface AccountConfig {
  configEpoch: number;
  timeLock: number;
  queue: string | null;
  subaccounts: number;
  frozenUntil: number;
}

export interface ElixirAccount {
  address: string;
  name: string;
  kind: AccountKind;
  network: Network;
  threshold: number;
  signers: Signer[];
  config: AccountConfig;
  lastActivity: number;
  createdAt: number;
  wasmHash: string;
}

export interface Asset {
  code: string;
  issuer: string | null;
  contract: string;
  decimals: number;
}

export interface Balance {
  asset: Asset;
  amount: bigint;
  usd: number | null;
}

export interface Subaccount {
  index: number;
  address: string;
  label: string;
  deployed: boolean;
  balances: Balance[];
}

export interface IntentArg {
  name: string;
  type: string;
  value: unknown;
}

export interface Invocation {
  target: string;
  fnName: string;
  args: IntentArg[];
  summary: InvocationSummary;
}

export type InvocationSummary =
  | { kind: "transfer"; asset: Asset; to: string; amount: bigint }
  | { kind: "reconfigure"; signerCount: number; threshold: number; ruleId: number }
  | { kind: "freeze"; durationSeconds: number }
  | { kind: "unfreeze" }
  | { kind: "call"; description: string };

export interface Vote {
  signer: string;
  decision: "approve" | "reject";
  at: number;
}

export interface Proposal {
  id: number;
  account: string;
  creator: string;
  subaccount: string | null;
  title: string;
  memo: string;
  invocations: Invocation[];
  configEpoch: number;
  status: ProposalStatus;
  votes: Vote[];
  createdAt: number;
  approvedAt: number | null;
  executedAt: number | null;
  expiresAt: number;
  authExpiresAtLedger: number;
  signaturePayload: string;
  txHash: string | null;
}

export type PolicyScope =
  | { kind: "any" }
  | { kind: "contract"; contract: string }
  | { kind: "function"; contract: string; fn: string };

export type PolicyRule =
  | { kind: "threshold"; threshold: number }
  | { kind: "weighted"; threshold: number }
  | { kind: "spendingLimit"; asset: string; amount: bigint; periodSeconds: number }
  | { kind: "allowlist"; destinations: string[] }
  | { kind: "timelock"; seconds: number };

export interface ContextRule {
  id: number;
  name: string;
  scope: PolicyScope;
  signers: string[];
  policies: PolicyRule[];
  enabled: boolean;
}

export interface AddressBookEntry {
  address: string;
  label: string;
  tags: string[];
  addedBy: string;
  addedAt: number;
}

export type ActivityKind =
  | "proposal.created"
  | "proposal.approved"
  | "proposal.rejected"
  | "proposal.executed"
  | "proposal.cancelled"
  | "proposal.expired"
  | "account.reconfigured"
  | "account.frozen"
  | "account.unfrozen"
  | "subaccount.deployed"
  | "transfer.in";

export interface ActivityEvent {
  id: string;
  account: string;
  kind: ActivityKind;
  at: number;
  ledger: number;
  actor: string | null;
  proposalId: number | null;
  detail: string;
  txHash: string | null;
}

export interface SimulationResult {
  ok: boolean;
  rpc: string;
  signaturePayload: string;
  minResourceFee: bigint;
  ledgersUntilAuthExpiry: number;
  effects: SimulationEffect[];
  error: string | null;
}

export interface SimulationEffect {
  kind: "debit" | "credit" | "state";
  description: string;
  address: string;
  asset?: Asset;
  amount?: bigint;
}

export interface WalletSession {
  address: string;
  kind: SignerKind;
  label: string;
}

export interface LedgerInfo {
  sequence: number;
  closedAt: number;
}
