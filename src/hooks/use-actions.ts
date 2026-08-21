"use client";

import { useCallback, useState } from "react";
import { useClient } from "./use-client";
import { useWallet } from "./use-wallet";
import { useToast } from "./use-toast";
import { useNetwork } from "./use-network";
import type { CreateAccountInput, CreateProposalInput, NewSignerInput } from "@/lib/client";
import type { AddressBookEntry, ContextRule, Invocation, SimulationResult } from "@/lib/types";

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// Wraps a client mutation with pending state + toasts. Every write in the app goes through this.
export function useMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  opts: { success?: (r: TResult) => string; failure?: string } = {},
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setPending(true);
      setError(null);
      try {
        const r = await fn(...args);
        if (opts.success) push({ title: opts.success(r), tone: "ok" });
        return r;
      } catch (e) {
        const m = message(e);
        setError(m);
        push({ title: opts.failure ?? "Action failed", detail: m, tone: "danger" });
        return null;
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, push],
  );

  return { run, pending, error };
}

function useSignerAddress(): () => string {
  const { session } = useWallet();
  return useCallback(() => {
    if (!session) throw new Error("Connect a wallet first");
    return session.address;
  }, [session]);
}

export function useVote(address: string) {
  const client = useClient();
  const me = useSignerAddress();
  return useMutation(
    (id: number, decision: "approve" | "reject") => client.vote(address, id, me(), decision),
    { success: (p) => (p.status === "Approved" ? `Approved — #${p.id} reached threshold` : `Vote recorded on #${p.id}`) },
  );
}

export function useExecute(address: string) {
  const client = useClient();
  const me = useSignerAddress();
  return useMutation((id: number) => client.execute(address, id, me()), {
    success: (p) => `Executed #${p.id}`,
    failure: "Execute gate closed",
  });
}

export function useCancel(address: string) {
  const client = useClient();
  const me = useSignerAddress();
  return useMutation((id: number) => client.cancel(address, id, me()), {
    success: (p) => `Cancelled #${p.id}`,
  });
}

export function useCreateProposal(address: string) {
  const client = useClient();
  const me = useSignerAddress();
  return useMutation(
    (input: Omit<CreateProposalInput, "creator">) => client.createProposal(address, { ...input, creator: me() }),
    { success: (p) => `Proposed #${p.id}` },
  );
}

export function useCreateAccount() {
  const client = useClient();
  const me = useSignerAddress();
  return useMutation(
    (input: Omit<CreateAccountInput, "creator">) => client.createAccount({ ...input, creator: me() }),
    { success: (a) => `${a.name} created` },
  );
}

export function useReconfigure(address: string) {
  const client = useClient();
  const me = useSignerAddress();
  return useMutation(
    (signers: NewSignerInput[], threshold: number) =>
      client.proposeReconfigure(address, { signers, threshold, proposer: me() }),
    { success: (p) => `Proposed #${p.id} — reconfigure` },
  );
}

export function useFreeze(address: string) {
  const client = useClient();
  const me = useSignerAddress();
  return useMutation((seconds: number) => client.freeze(address, me(), seconds), {
    success: () => "Account frozen",
  });
}

export function useProposeUnfreeze(address: string) {
  const client = useClient();
  const me = useSignerAddress();
  return useMutation(() => client.proposeUnfreeze(address, me()), {
    success: (p) => `Proposed #${p.id} — unfreeze`,
  });
}

export function useDeploySubaccount(address: string) {
  const client = useClient();
  const me = useSignerAddress();
  return useMutation((label: string) => client.deploySubaccount(address, label, me()), {
    success: (s) => `Sub-account #${s.index} reserved; deploy proposal opened`,
  });
}

export function useRenameSubaccount(address: string) {
  const client = useClient();
  return useMutation((index: number, label: string) => client.renameSubaccount(address, index, label), {
    success: () => "Renamed",
  });
}

export function useSaveRules(address: string) {
  const client = useClient();
  const me = useSignerAddress();
  return useMutation((rules: ContextRule[]) => client.saveRules(address, rules, me()), {
    success: () => "Rules saved — config epoch bumped",
  });
}

export function useUpsertAddressBook(address: string) {
  const client = useClient();
  return useMutation(
    async (entry: AddressBookEntry) => {
      await client.upsertAddressBookEntry(address, entry);
      return entry;
    },
    { success: (e) => `Saved ${e.label}` },
  );
}

export function useRemoveAddressBook(address: string) {
  const client = useClient();
  return useMutation((entryAddress: string) => client.removeAddressBookEntry(address, entryAddress), {
    success: () => "Removed",
  });
}

export function useUpdateTimeLock(address: string) {
  const client = useClient();
  const me = useSignerAddress();
  return useMutation((seconds: number) => client.updateTimeLock(address, seconds, me()), {
    success: (p) => `Proposed #${p.id} — timelock change`,
  });
}

export function useSimulation(address: string) {
  const client = useClient();
  const { rpc } = useNetwork();
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [pending, setPending] = useState(false);

  const simulate = useCallback(
    async (invocations: Invocation[], proposalId?: number) => {
      setPending(true);
      try {
        const r = await client.simulate(address, invocations, rpc, proposalId);
        setResult(r);
        return r;
      } finally {
        setPending(false);
      }
    },
    [client, address, rpc],
  );

  return { simulate, result, pending, reset: () => setResult(null) };
}
