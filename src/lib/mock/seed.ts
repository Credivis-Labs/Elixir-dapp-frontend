import type {
  ActivityEvent,
  AddressBookEntry,
  Asset,
  Balance,
  ContextRule,
  ElixirAccount,
  Proposal,
  Subaccount,
} from "../types";
import { ROLE_ALL, ROLE_EXECUTE, ROLE_INITIATE, ROLE_VOTE } from "../types";

export interface MockState {
  version: number;
  genesis: number;
  accounts: ElixirAccount[];
  balances: Record<string, Balance[]>;
  subaccounts: Record<string, Subaccount[]>;
  proposals: Record<string, Proposal[]>;
  rules: Record<string, ContextRule[]>;
  activity: Record<string, ActivityEvent[]>;
  addressBook: Record<string, AddressBookEntry[]>;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// Deterministic, shape-valid StrKey lookalikes for demo data.
export function fakeAddress(prefix: "G" | "C", seed: string): string {
  // Fold the whole seed first so seeds that differ only at the tail still diverge.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = prefix;
  for (let i = 0; i < 55; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i * 31;
    h = Math.imul(h, 16777619) >>> 0;
    out += ALPHABET[h % 32];
  }
  return out;
}

export function fakeHash(seed: string, bytes = 32): string {
  let h = 0x811c9dc5;
  let out = "";
  for (let i = 0; i < bytes; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i * 131;
    h = Math.imul(h, 0x01000193) >>> 0;
    out += (h & 0xff).toString(16).padStart(2, "0");
  }
  return out;
}

export const USDC: Asset = {
  code: "USDC",
  issuer: fakeAddress("G", "usdc-issuer-centre"),
  contract: fakeAddress("C", "usdc-sac"),
  decimals: 7,
};
export const XLM: Asset = { code: "XLM", issuer: null, contract: fakeAddress("C", "native-sac"), decimals: 7 };
export const EURC: Asset = {
  code: "EURC",
  issuer: fakeAddress("G", "eurc-issuer-circle"),
  contract: fakeAddress("C", "eurc-sac"),
  decimals: 7,
};
export const ASSETS: Asset[] = [USDC, XLM, EURC];

export const YOU = fakeAddress("G", "you-the-connected-signer");

const ada = fakeAddress("G", "ada-treasury-lead");
const bao = fakeAddress("G", "bao-ops-passkey");
const cyrus = fakeAddress("C", "cyrus-ledger-contract-acct");
const dev = fakeAddress("G", "dev-engineer");
const nadia = fakeAddress("G", "nadia-cfo");

export const TREASURY = fakeAddress("C", "protocol-treasury-elixir");
export const PAYROLL = fakeAddress("G", "ops-payroll-classic");

const BLEND_POOL = fakeAddress("C", "blend-lending-pool");
const AUDITOR = fakeAddress("G", "otter-audit-vendor");
const GRANTEE = fakeAddress("G", "grantee-soroban-tooling");
const EXCHANGE = fakeAddress("G", "exchange-deposit-coinbase");

function usd(n: number): bigint {
  return BigInt(Math.round(n * 10_000_000));
}

export function buildSeed(now: number): MockState {
  const day = 86400;
  const genesis = now - 90 * day;

  const treasury: ElixirAccount = {
    address: TREASURY,
    name: "Protocol treasury",
    kind: "smart",
    network: "testnet",
    threshold: 3,
    signers: [
      { address: YOU, label: "You", kind: "passkey", roles: ROLE_ALL, weight: 1, addedAt: genesis },
      { address: ada, label: "Ada", kind: "ed25519", roles: ROLE_ALL, weight: 1, addedAt: genesis },
      { address: bao, label: "Bao", kind: "passkey", roles: ROLE_INITIATE | ROLE_VOTE, weight: 1, addedAt: genesis },
      { address: cyrus, label: "Cyrus (Ledger)", kind: "ledger", roles: ROLE_VOTE | ROLE_EXECUTE, weight: 1, addedAt: genesis + 10 * day },
      { address: nadia, label: "Nadia", kind: "ed25519", roles: ROLE_VOTE, weight: 1, addedAt: genesis + 30 * day },
    ],
    config: { configEpoch: 3, timeLock: 3600, queue: fakeAddress("C", "treasury-queue"), subaccounts: 3, frozenUntil: 0 },
    lastActivity: now - 2 * 3600,
    createdAt: genesis,
    wasmHash: fakeHash("elixir-account-v1"),
  };

  const payroll: ElixirAccount = {
    address: PAYROLL,
    name: "Ops payroll",
    kind: "classic",
    network: "testnet",
    threshold: 2,
    signers: [
      { address: YOU, label: "You", kind: "ed25519", roles: ROLE_ALL, weight: 1, addedAt: genesis + 20 * day },
      { address: dev, label: "Dev", kind: "ed25519", roles: ROLE_ALL, weight: 1, addedAt: genesis + 20 * day },
      { address: nadia, label: "Nadia", kind: "ed25519", roles: ROLE_ALL, weight: 1, addedAt: genesis + 20 * day },
    ],
    config: { configEpoch: 1, timeLock: 0, queue: null, subaccounts: 1, frozenUntil: 0 },
    lastActivity: now - 5 * day,
    createdAt: genesis + 20 * day,
    wasmHash: "",
  };

  const sub1 = fakeAddress("C", `${TREASURY}-sub-1`);
  const sub2 = fakeAddress("C", `${TREASURY}-sub-2`);

  const balances: Record<string, Balance[]> = {
    [TREASURY]: [
      { asset: USDC, amount: usd(1_284_550.2), usd: 1_284_550 },
      { asset: XLM, amount: usd(2_150_000), usd: 2_150_000 * 0.41 },
      { asset: EURC, amount: usd(40_000), usd: 43_600 },
    ],
    [sub1]: [
      { asset: USDC, amount: usd(250_000), usd: 250_000 },
    ],
    [sub2]: [],
    [PAYROLL]: [
      { asset: USDC, amount: usd(88_400), usd: 88_400 },
      { asset: XLM, amount: usd(12_000), usd: 12_000 * 0.41 },
    ],
  };

  const subaccounts: Record<string, Subaccount[]> = {
    [TREASURY]: [
      { index: 0, address: TREASURY, label: "Main", deployed: true, balances: balances[TREASURY] ?? [] },
      { index: 1, address: sub1, label: "Grants", deployed: true, balances: balances[sub1] ?? [] },
      { index: 2, address: sub2, label: "Market making", deployed: false, balances: [] },
    ],
    [PAYROLL]: [{ index: 0, address: PAYROLL, label: "Main", deployed: true, balances: balances[PAYROLL] ?? [] }],
  };

  const ledgerNow = 58_000_000 + Math.floor((now - genesis) / 5);

  const mk = (
    id: number,
    over: Partial<Proposal> & Pick<Proposal, "title" | "invocations" | "status" | "createdAt">,
  ): Proposal => ({
    id,
    account: TREASURY,
    creator: ada,
    subaccount: null,
    memo: "",
    configEpoch: 3,
    votes: [],
    approvedAt: null,
    executedAt: null,
    expiresAt: over.createdAt + 7 * day,
    authExpiresAtLedger: ledgerNow + 8640,
    signaturePayload: fakeHash(`sigpayload-${id}-${over.title}`),
    txHash: null,
    ...over,
  });

  const treasuryProposals: Proposal[] = [
    mk(14, {
      title: "Q3 audit retainer — OtterSec",
      memo: "Second tranche per SOW. Invoice #OS-2291.",
      status: "Active",
      createdAt: now - 3 * 3600,
      creator: ada,
      invocations: [
        {
          target: USDC.contract,
          fnName: "transfer",
          args: [
            { name: "from", type: "Address", value: TREASURY },
            { name: "to", type: "Address", value: AUDITOR },
            { name: "amount", type: "i128", value: usd(60_000).toString() },
          ],
          summary: { kind: "transfer", asset: USDC, to: AUDITOR, amount: usd(60_000) },
        },
      ],
      votes: [
        { signer: ada, decision: "approve", at: now - 3 * 3600 },
        { signer: bao, decision: "approve", at: now - 2 * 3600 },
      ],
    }),
    mk(13, {
      title: "Supply 500k USDC to Blend pool",
      memo: "Idle treasury yield. Pool is audited; 30d utilization 71%.",
      status: "Approved",
      createdAt: now - 20 * 3600,
      creator: YOU,
      approvedAt: now - 1800,
      invocations: [
        {
          target: BLEND_POOL,
          fnName: "submit",
          args: [
            { name: "from", type: "Address", value: TREASURY },
            { name: "spender", type: "Address", value: TREASURY },
            { name: "to", type: "Address", value: TREASURY },
            { name: "requests", type: "Vec<Request>", value: [{ request_type: "SupplyCollateral", address: USDC.contract, amount: usd(500_000).toString() }] },
          ],
          summary: { kind: "call", description: "Supply 500,000 USDC as collateral to Blend lending pool" },
        },
      ],
      votes: [
        { signer: YOU, decision: "approve", at: now - 20 * 3600 },
        { signer: ada, decision: "approve", at: now - 6 * 3600 },
        { signer: cyrus, decision: "approve", at: now - 1800 },
      ],
    }),
    mk(12, {
      title: "Grants batch — August",
      memo: "Three approved grantees, see forum thread #412.",
      status: "Active",
      createdAt: now - 2 * day,
      creator: bao,
      subaccount: sub1,
      invocations: [
        {
          target: USDC.contract,
          fnName: "transfer",
          args: [
            { name: "from", type: "Address", value: sub1 },
            { name: "to", type: "Address", value: GRANTEE },
            { name: "amount", type: "i128", value: usd(25_000).toString() },
          ],
          summary: { kind: "transfer", asset: USDC, to: GRANTEE, amount: usd(25_000) },
        },
        {
          target: USDC.contract,
          fnName: "transfer",
          args: [
            { name: "from", type: "Address", value: sub1 },
            { name: "to", type: "Address", value: fakeAddress("G", "grantee-wallet-kit") },
            { name: "amount", type: "i128", value: usd(18_000).toString() },
          ],
          summary: { kind: "transfer", asset: USDC, to: fakeAddress("G", "grantee-wallet-kit"), amount: usd(18_000) },
        },
        {
          target: USDC.contract,
          fnName: "transfer",
          args: [
            { name: "from", type: "Address", value: sub1 },
            { name: "to", type: "Address", value: fakeAddress("G", "grantee-indexer") },
            { name: "amount", type: "i128", value: usd(12_000).toString() },
          ],
          summary: { kind: "transfer", asset: USDC, to: fakeAddress("G", "grantee-indexer"), amount: usd(12_000) },
        },
      ],
      votes: [{ signer: bao, decision: "approve", at: now - 2 * day }],
    }),
    mk(11, {
      title: "Move 200k USDC to exchange for OTC",
      memo: "",
      status: "Active",
      createdAt: now - 5 * day,
      creator: ada,
      configEpoch: 2,
      invocations: [
        {
          target: USDC.contract,
          fnName: "transfer",
          args: [
            { name: "from", type: "Address", value: TREASURY },
            { name: "to", type: "Address", value: EXCHANGE },
            { name: "amount", type: "i128", value: usd(200_000).toString() },
          ],
          summary: { kind: "transfer", asset: USDC, to: EXCHANGE, amount: usd(200_000) },
        },
      ],
      votes: [
        { signer: ada, decision: "approve", at: now - 5 * day },
        { signer: nadia, decision: "reject", at: now - 4 * day },
      ],
    }),
    mk(10, {
      title: "Add Nadia as voter, threshold 3-of-5",
      memo: "CFO onboarding. Vote-only role.",
      status: "Executed",
      createdAt: now - 31 * day,
      creator: YOU,
      configEpoch: 2,
      approvedAt: now - 30 * day - 7200,
      executedAt: now - 30 * day,
      txHash: fakeHash("tx-reconfig-10"),
      invocations: [
        {
          target: TREASURY,
          fnName: "reconfigure",
          args: [
            { name: "rule_id", type: "u32", value: 0 },
            { name: "signer_count", type: "u32", value: 5 },
            { name: "threshold", type: "u32", value: 3 },
          ],
          summary: { kind: "reconfigure", signerCount: 5, threshold: 3, ruleId: 0 },
        },
      ],
      votes: [
        { signer: YOU, decision: "approve", at: now - 31 * day },
        { signer: ada, decision: "approve", at: now - 31 * day + 3600 },
        { signer: cyrus, decision: "approve", at: now - 30 * day - 7200 },
      ],
    }),
    mk(9, {
      title: "Deploy Grants sub-account",
      memo: "",
      status: "Executed",
      createdAt: now - 40 * day,
      creator: ada,
      configEpoch: 2,
      approvedAt: now - 40 * day + 3600,
      executedAt: now - 40 * day + 7200,
      txHash: fakeHash("tx-deploy-sub-1"),
      invocations: [
        {
          target: fakeAddress("C", "elixir-factory"),
          fnName: "deploy_subaccount",
          args: [
            { name: "parent", type: "Address", value: TREASURY },
            { name: "index", type: "u32", value: 1 },
          ],
          summary: { kind: "call", description: "Deploy sub-account #1 from factory" },
        },
      ],
      votes: [
        { signer: ada, decision: "approve", at: now - 40 * day },
        { signer: YOU, decision: "approve", at: now - 40 * day + 1200 },
        { signer: bao, decision: "approve", at: now - 40 * day + 3600 },
      ],
    }),
    mk(8, {
      title: "Emergency: rotate Bao's key",
      memo: "Phone lost. Cancelled after Bao recovered via cloud passkey.",
      status: "Cancelled",
      createdAt: now - 52 * day,
      creator: YOU,
      configEpoch: 2,
      approvedAt: now - 52 * day + 1800,
      invocations: [
        {
          target: TREASURY,
          fnName: "reconfigure",
          args: [
            { name: "rule_id", type: "u32", value: 0 },
            { name: "signer_count", type: "u32", value: 4 },
            { name: "threshold", type: "u32", value: 3 },
          ],
          summary: { kind: "reconfigure", signerCount: 4, threshold: 3, ruleId: 0 },
        },
      ],
      votes: [
        { signer: YOU, decision: "approve", at: now - 52 * day },
        { signer: ada, decision: "approve", at: now - 52 * day + 600 },
        { signer: cyrus, decision: "approve", at: now - 52 * day + 1800 },
      ],
    }),
  ];

  const payrollProposals: Proposal[] = [
    {
      ...mk(3, {
        title: "August salaries",
        status: "Active",
        createdAt: now - 6 * 3600,
        creator: dev,
        invocations: [
          {
            target: USDC.contract,
            fnName: "transfer",
            args: [
              { name: "from", type: "Address", value: PAYROLL },
              { name: "to", type: "Address", value: fakeAddress("G", "employee-1") },
              { name: "amount", type: "i128", value: usd(9_500).toString() },
            ],
            summary: { kind: "transfer", asset: USDC, to: fakeAddress("G", "employee-1"), amount: usd(9_500) },
          },
          {
            target: USDC.contract,
            fnName: "transfer",
            args: [
              { name: "from", type: "Address", value: PAYROLL },
              { name: "to", type: "Address", value: fakeAddress("G", "employee-2") },
              { name: "amount", type: "i128", value: usd(11_200).toString() },
            ],
            summary: { kind: "transfer", asset: USDC, to: fakeAddress("G", "employee-2"), amount: usd(11_200) },
          },
        ],
        votes: [{ signer: dev, decision: "approve", at: now - 6 * 3600 }],
      }),
      account: PAYROLL,
      configEpoch: 1,
    },
  ];

  const rules: Record<string, ContextRule[]> = {
    [TREASURY]: [
      {
        id: 0,
        name: "Default",
        scope: { kind: "any" },
        signers: [YOU, ada, bao, cyrus, nadia],
        policies: [{ kind: "threshold", threshold: 3 }],
        enabled: true,
      },
      {
        id: 1,
        name: "Config changes",
        scope: { kind: "contract", contract: TREASURY },
        signers: [YOU, ada, bao, cyrus, nadia],
        policies: [{ kind: "threshold", threshold: 4 }, { kind: "timelock", seconds: 86400 }],
        enabled: true,
      },
      {
        id: 2,
        name: "Ops allowance",
        scope: { kind: "function", contract: USDC.contract, fn: "transfer" },
        signers: [YOU, ada, bao, cyrus, nadia],
        policies: [
          { kind: "threshold", threshold: 3 },
          { kind: "spendingLimit", asset: "USDC", amount: usd(5_000), periodSeconds: 86400 },
          { kind: "allowlist", destinations: [AUDITOR, GRANTEE] },
        ],
        enabled: true,
      },
      {
        id: 3,
        name: "Legacy fast-lane (disabled)",
        scope: { kind: "any" },
        signers: [YOU, ada],
        policies: [{ kind: "threshold", threshold: 1 }],
        enabled: false,
      },
    ],
    [PAYROLL]: [
      {
        id: 0,
        name: "Default",
        scope: { kind: "any" },
        signers: [YOU, dev, nadia],
        policies: [{ kind: "threshold", threshold: 2 }],
        enabled: true,
      },
    ],
  };

  const ev = (
    i: number,
    kind: ActivityEvent["kind"],
    at: number,
    detail: string,
    over: Partial<ActivityEvent> = {},
  ): ActivityEvent => ({
    id: `ev-${i}`,
    account: TREASURY,
    kind,
    at,
    ledger: 58_000_000 + Math.floor((at - genesis) / 5),
    actor: null,
    proposalId: null,
    detail,
    txHash: null,
    ...over,
  });

  const activity: Record<string, ActivityEvent[]> = {
    [TREASURY]: [
      ev(1, "proposal.approved", now - 1800, "Cyrus approved #13 — threshold met, timelock started", { actor: cyrus, proposalId: 13 }),
      ev(2, "proposal.approved", now - 2 * 3600, "Bao approved #14", { actor: bao, proposalId: 14 }),
      ev(3, "proposal.created", now - 3 * 3600, "Ada proposed #14 Q3 audit retainer", { actor: ada, proposalId: 14 }),
      ev(4, "transfer.in", now - 8 * 3600, "Received 40,000 EURC from Circle mint", { txHash: fakeHash("tx-in-eurc") }),
      ev(5, "proposal.created", now - 2 * day, "Bao proposed #12 Grants batch", { actor: bao, proposalId: 12 }),
      ev(6, "proposal.rejected", now - 4 * day, "Nadia rejected #11", { actor: nadia, proposalId: 11 }),
      ev(7, "account.reconfigured", now - 30 * day, "Epoch 2 → 3. Nadia added as voter. 3 pending proposals went stale.", { proposalId: 10, txHash: fakeHash("tx-reconfig-10") }),
      ev(8, "proposal.executed", now - 30 * day, "#10 executed", { actor: cyrus, proposalId: 10, txHash: fakeHash("tx-reconfig-10") }),
      ev(9, "subaccount.deployed", now - 40 * day + 7200, "Sub-account #1 Grants deployed", { txHash: fakeHash("tx-deploy-sub-1") }),
      ev(10, "account.unfrozen", now - 52 * day + 7200, "Account unfrozen by 3-of-4", { actor: ada }),
      ev(11, "proposal.cancelled", now - 52 * day + 5400, "#8 cancelled after Bao recovered", { actor: YOU, proposalId: 8 }),
      ev(12, "account.frozen", now - 52 * day, "Bao triggered a 72h freeze — lost phone", { actor: bao }),
    ],
    [PAYROLL]: [
      { ...ev(100, "proposal.created", now - 6 * 3600, "Dev proposed #3 August salaries", { actor: dev, proposalId: 3 }), account: PAYROLL },
      { ...ev(101, "transfer.in", now - 5 * day, "Received 100,000 USDC from Protocol treasury", { txHash: fakeHash("tx-in-payroll") }), account: PAYROLL },
    ],
  };

  const addressBook: Record<string, AddressBookEntry[]> = {
    [TREASURY]: [
      { address: AUDITOR, label: "OtterSec", tags: ["vendor", "audit"], addedBy: ada, addedAt: genesis + 5 * day },
      { address: GRANTEE, label: "Soroban tooling grant", tags: ["grantee"], addedBy: bao, addedAt: genesis + 45 * day },
      { address: BLEND_POOL, label: "Blend USDC pool", tags: ["defi"], addedBy: YOU, addedAt: genesis + 60 * day },
      { address: EXCHANGE, label: "Coinbase deposit", tags: ["exchange"], addedBy: ada, addedAt: genesis + 70 * day },
      { address: PAYROLL, label: "Ops payroll (classic)", tags: ["internal"], addedBy: YOU, addedAt: genesis + 20 * day },
    ],
    [PAYROLL]: [
      { address: TREASURY, label: "Protocol treasury", tags: ["internal"], addedBy: YOU, addedAt: genesis + 20 * day },
    ],
  };

  return {
    version: 1,
    genesis,
    accounts: [treasury, payroll],
    balances,
    subaccounts,
    proposals: { [TREASURY]: treasuryProposals, [PAYROLL]: payrollProposals },
    rules,
    activity,
    addressBook,
  };
}
