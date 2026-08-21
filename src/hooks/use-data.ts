"use client";

import { useMemo } from "react";
import { useClient, useClientVersion } from "./use-client";
import { useWallet } from "./use-wallet";
import type {
  ActivityEvent,
  AddressBookEntry,
  Balance,
  ContextRule,
  ElixirAccount,
  Proposal,
  ProposalStatus,
  Signer,
  Subaccount,
} from "@/lib/types";
import { ROLE_VOTE } from "@/lib/types";

export function useAccounts(): ElixirAccount[] {
  const client = useClient();
  const v = useClientVersion();
  const { session } = useWallet();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => client.listAccounts(session?.address ?? null), [client, v, session?.address]);
}

export function useAccount(address: string): ElixirAccount | null {
  const client = useClient();
  const v = useClientVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => client.getAccount(address), [client, v, address]);
}

export function useBalances(address: string): Balance[] {
  const client = useClient();
  const v = useClientVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => client.getBalances(address), [client, v, address]);
}

export function useSubaccounts(address: string): Subaccount[] {
  const client = useClient();
  const v = useClientVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => client.listSubaccounts(address), [client, v, address]);
}

export function useProposals(address: string): Proposal[] {
  const client = useClient();
  const v = useClientVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => client.listProposals(address), [client, v, address]);
}

export function useProposal(address: string, id: number): Proposal | null {
  const client = useClient();
  const v = useClientVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => client.getProposal(address, id), [client, v, address, id]);
}

export function useRules(address: string): ContextRule[] {
  const client = useClient();
  const v = useClientVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => client.listRules(address), [client, v, address]);
}

export function useActivity(address: string): ActivityEvent[] {
  const client = useClient();
  const v = useClientVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => client.listActivity(address), [client, v, address]);
}

export function useAddressBook(address: string): AddressBookEntry[] {
  const client = useClient();
  const v = useClientVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => client.listAddressBook(address), [client, v, address]);
}

export function useLabel(address: string): (addr: string) => string {
  const book = useAddressBook(address);
  const account = useAccount(address);
  const subs = useSubaccounts(address);
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const e of book) map.set(e.address, e.label);
    for (const s of subs) map.set(s.address, s.index === 0 ? (account?.name ?? "Main") : `${s.label} (sub #${s.index})`);
    for (const s of account?.signers ?? []) map.set(s.address, s.label);
    return (addr: string) => map.get(addr) ?? "";
  }, [book, subs, account]);
}

export function useMySigner(address: string): Signer | null {
  const account = useAccount(address);
  const { session } = useWallet();
  if (!account || !session) return null;
  return account.signers.find((s) => s.address === session.address) ?? null;
}

export interface ProposalBuckets {
  needsYou: Proposal[];
  active: Proposal[];
  approved: Proposal[];
  closed: Proposal[];
  byStatus: Record<ProposalStatus, Proposal[]>;
}

export function useProposalBuckets(address: string): ProposalBuckets {
  const proposals = useProposals(address);
  const me = useMySigner(address);
  const account = useAccount(address);
  const epoch = account?.config.configEpoch ?? -1;
  return useMemo(() => {
    const byStatus: Record<ProposalStatus, Proposal[]> = {
      Draft: [],
      Active: [],
      Approved: [],
      Rejected: [],
      Executed: [],
      Cancelled: [],
    };
    for (const p of proposals) byStatus[p.status].push(p);
    const canVote = me !== null && (me.roles & ROLE_VOTE) !== 0;
    const needsYou = canVote
      ? byStatus.Active.filter((p) => p.configEpoch === epoch && !p.votes.some((v) => v.signer === me!.address))
      : [];
    return {
      needsYou,
      active: byStatus.Active,
      approved: byStatus.Approved,
      closed: [...byStatus.Executed, ...byStatus.Rejected, ...byStatus.Cancelled].sort((a, b) => b.id - a.id),
      byStatus,
    };
  }, [proposals, me, epoch]);
}
