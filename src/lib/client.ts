import type {
  AccountKind,
  ActivityEvent,
  AddressBookEntry,
  Balance,
  ContextRule,
  ElixirAccount,
  Invocation,
  LedgerInfo,
  Network,
  Proposal,
  SignerKind,
  SimulationResult,
  Subaccount,
} from "./types";

// Everything the dapp needs from chain + backend, behind one interface.
// MockClient implements it today; the real adapter will compose
// @credivis/elixir-sdk (auth, simulate) with the Elixir-Backend API.

export interface NewSignerInput {
  address: string;
  label: string;
  kind: SignerKind;
  roles: number;
  weight: number;
}

export interface CreateAccountInput {
  name: string;
  kind: AccountKind;
  network: Network;
  signers: NewSignerInput[];
  threshold: number;
  timeLock: number;
  queue: boolean;
  creator: string;
}

export interface CreateProposalInput {
  title: string;
  memo: string;
  subaccount: string | null;
  invocations: Invocation[];
  creator: string;
}

export interface ReconfigureInput {
  signers: NewSignerInput[];
  threshold: number;
  proposer: string;
}

export interface ElixirClient {
  subscribe(listener: () => void): () => void;
  getVersion(): number;

  getLedger(): LedgerInfo;
  listAccounts(signer: string | null): ElixirAccount[];
  getAccount(address: string): ElixirAccount | null;
  getBalances(address: string): Balance[];
  listSubaccounts(address: string): Subaccount[];
  listProposals(address: string): Proposal[];
  getProposal(address: string, id: number): Proposal | null;
  listRules(address: string): ContextRule[];
  listActivity(address: string): ActivityEvent[];
  listAddressBook(address: string): AddressBookEntry[];

  simulate(address: string, invocations: Invocation[], rpc: string, proposalId?: number): Promise<SimulationResult>;

  createAccount(input: CreateAccountInput): Promise<ElixirAccount>;
  createProposal(address: string, input: CreateProposalInput): Promise<Proposal>;
  vote(address: string, id: number, signer: string, decision: "approve" | "reject"): Promise<Proposal>;
  execute(address: string, id: number, signer: string): Promise<Proposal>;
  cancel(address: string, id: number, signer: string): Promise<Proposal>;
  proposeReconfigure(address: string, input: ReconfigureInput): Promise<Proposal>;
  freeze(address: string, signer: string, durationSeconds: number): Promise<void>;
  proposeUnfreeze(address: string, proposer: string): Promise<Proposal>;
  deploySubaccount(address: string, label: string, signer: string): Promise<Subaccount>;
  renameSubaccount(address: string, index: number, label: string): Promise<void>;
  saveRules(address: string, rules: ContextRule[], signer: string): Promise<void>;
  upsertAddressBookEntry(address: string, entry: AddressBookEntry): Promise<void>;
  removeAddressBookEntry(address: string, entryAddress: string): Promise<void>;
  updateTimeLock(address: string, seconds: number, signer: string): Promise<Proposal>;
  resetDemo(): void;
}
