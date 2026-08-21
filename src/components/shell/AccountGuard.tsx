"use client";

import type { ReactNode } from "react";
import { useAccount } from "@/hooks/use-data";
import { useWallet } from "@/hooks/use-wallet";
import { EmptyState } from "@/components/ui/Misc";
import { Button, LinkButton } from "@/components/ui/Button";
import type { ElixirAccount } from "@/lib/types";

export function AccountGuard({ address, children }: { address: string; children: (account: ElixirAccount) => ReactNode }) {
  const account = useAccount(address);
  const { session, openSheet } = useWallet();

  if (!account) {
    return (
      <EmptyState
        title="No account at this address"
        body="It may not be indexed yet, or the address is wrong. Check the network selector too — accounts are per-network."
        action={<LinkButton href="/accounts" variant="secondary">All accounts</LinkButton>}
      />
    );
  }

  if (!session) {
    return (
      <EmptyState
        title={`Connect to view ${account.name}`}
        body="Balances and proposals are public on-chain, but this view also shows what needs your signature."
        action={<Button onClick={openSheet}>Connect a signer</Button>}
      />
    );
  }

  return <>{children(account)}</>;
}
