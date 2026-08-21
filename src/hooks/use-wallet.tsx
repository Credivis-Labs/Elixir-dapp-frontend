"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { SignerKind, WalletSession } from "@/lib/types";
import { YOU } from "@/lib/mock/seed";
import { useStoredValue } from "./use-storage";

const KEY = "elixir.wallet.v1";

export type WalletProvider = "freighter" | "passkey" | "ledger" | "xbull";

export const WALLET_OPTIONS: { id: WalletProvider; label: string; kind: SignerKind; hint: string }[] = [
  { id: "passkey", label: "Passkey", kind: "passkey", hint: "Face ID, Touch ID, or a security key" },
  { id: "freighter", label: "Freighter", kind: "ed25519", hint: "Browser extension" },
  { id: "ledger", label: "Ledger", kind: "ledger", hint: "Hardware wallet via WebUSB" },
  { id: "xbull", label: "xBull", kind: "ed25519", hint: "Browser extension or mobile" },
];

interface WalletState {
  session: WalletSession | null;
  connecting: boolean;
  connect: (provider: WalletProvider) => Promise<void>;
  disconnect: () => void;
  sign: (payloadHex: string) => Promise<string>;
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useStoredValue<WalletSession>(KEY);
  const [connecting, setConnecting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const connect = useCallback(
    async (provider: WalletProvider) => {
      setConnecting(true);
      await new Promise((r) => setTimeout(r, 700));
      const opt = WALLET_OPTIONS.find((o) => o.id === provider)!;
      // Mock: every provider resolves to the seeded demo signer so the demo data lines up.
      setSession({ address: YOU, kind: opt.kind, label: opt.label });
      setConnecting(false);
      setSheetOpen(false);
    },
    [setSession],
  );

  const disconnect = useCallback(() => setSession(null), [setSession]);

  const sign = useCallback(
    async (payloadHex: string) => {
      if (!session) throw new Error("No wallet connected");
      await new Promise((r) => setTimeout(r, 1100));
      return `sig_${payloadHex.slice(0, 16)}_${session.address.slice(-8)}`;
    },
    [session],
  );

  const value = useMemo<WalletState>(
    () => ({
      session,
      connecting,
      connect,
      disconnect,
      sign,
      sheetOpen,
      openSheet: () => setSheetOpen(true),
      closeSheet: () => setSheetOpen(false),
    }),
    [session, connecting, connect, disconnect, sign, sheetOpen],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const w = useContext(WalletContext);
  if (!w) throw new Error("useWallet must be used inside WalletProvider");
  return w;
}
