# Elixir dapp

Treasury dashboard, proposal builder, and signing UI for [Elixir](https://github.com/Credivis-Labs) —
a Squads-equivalent treasury multisig for Stellar.

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4. No other runtime dependencies:
the signing UI is security-critical and the dependency surface is kept deliberately small.

## Develop

```
pnpm install
pnpm dev
```

Open http://localhost:3000. Connect any wallet option — in this build every option resolves to
the seeded demo signer so the sample treasury lines up.

## Checks

```
pnpm build      # generates .next/types that typecheck depends on
pnpm typecheck
pnpm lint
```

## Layout

```
src/
  app/                         routes (server components; await params, render a view)
    accounts/                  account list, create wizard
    a/[address]/               per-account shell: overview, proposals, builder, detail,
                               sign, sub-accounts, signers, policies, activity,
                               address book, settings
    settings/                  network, RPC, signer
  components/
    ui/                        Button, Field, Card, Pill, Dialog, Toaster, EmptyState …
    domain/                    AddressChip, Amount, HashSeal, ExecuteGate, VoteBar,
                               IntentCard, ProposalRow, Timeline, SignerEditor
    shell/                     Providers, AppShell, WalletSheet, AccountGuard
    views/                     one client component per route
  hooks/
    use-client                 ElixirClient context + version subscription
    use-data                   read hooks (accounts, proposals, rules, activity …)
    use-actions                write hooks wrapped in useMutation (pending + toasts)
    use-wallet / use-network   session and RPC choice, persisted in localStorage
    use-clock                  shared ticking clock, ledger estimate, auth-entry expiry
  lib/
    types.ts                   mirrors Elixir-Contracts types (Config, Proposal, Status, roles)
    client.ts                  ElixirClient interface — the only seam to chain + backend
    mock/                      in-browser adapter + seed data (localStorage-backed)
    gate.ts                    the execute-gate checks from elixir_queue::execute
    policy-lint.ts             context-rule conflict linter (ARCHITECTURE §6.4) + dry-run
    format.ts / strkey.ts      stroops, addresses, durations, StrKey shape validation
```

## Data layer

Everything the UI needs goes through `ElixirClient` (`src/lib/client.ts`). `MockClient` implements
it in-browser with realistic seed data and persists to `localStorage`. When `@credivis/elixir-sdk`
ships auth-entry assembly and simulation, and `Elixir-Backend` exposes the coordination API, a
real adapter replaces the mock behind the same interface. Views and hooks do not change.

Contract semantics the mock enforces so the UI is honest:

- `config_epoch` stamped on every proposal; reconfigure bumps it and strands pending proposals.
- Execute gate: Approved → epoch matches → timelock elapsed → not expired → caller has Execute →
  not frozen (config ops exempt).
- Reconfigure is atomic (signers + threshold together) and validated client-side before proposing.
- Freeze is 1-of-N, capped at 72h; unfreeze is a threshold proposal.
- Sub-account addresses are reserved deterministically before deployment.

## Signing screen

`/a/[address]/proposals/[id]/sign` is the threat-model surface (docs/GAPS.md B1/B2). The intent
and payload hash are rendered from a local simulation against the user-chosen RPC, the hash is
shown chunked for hardware-wallet comparison, a simulated-vs-attached hash mismatch blocks signing,
and auth-entry expiry is a live countdown.

## License

AGPL-3.0-or-later
