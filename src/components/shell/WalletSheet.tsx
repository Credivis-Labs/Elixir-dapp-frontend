"use client";

import { Dialog } from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Button";
import { useWallet, WALLET_OPTIONS } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";

export function WalletSheet() {
  const { sheetOpen, closeSheet, connect, connecting } = useWallet();
  const { network } = useNetwork();

  return (
    <Dialog
      open={sheetOpen}
      onClose={closeSheet}
      title="Connect a signer"
      description={`Signing on ${network}. Your key never leaves the device; Elixir only sees signatures.`}
      width="sm"
    >
      <ul className="flex flex-col gap-2">
        {WALLET_OPTIONS.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              disabled={connecting}
              onClick={() => connect(o.id)}
              className="flex w-full items-center justify-between rounded-[var(--radius-md)] bg-sunken px-4 py-3 text-left hover:bg-inset disabled:opacity-60"
            >
              <span>
                <span className="block text-sm font-medium">{o.label}</span>
                <span className="block text-xs text-muted">{o.hint}</span>
              </span>
              {connecting ? <Spinner /> : <span className="text-faint">→</span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">
        Demo build: every option connects the seeded signer so the sample treasury lines up.
      </p>
    </Dialog>
  );
}
