"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { Network } from "@/lib/types";
import { useStoredValue } from "./use-storage";

const KEY = "elixir.network.v1";

export const DEFAULT_RPC: Record<Network, string> = {
  testnet: "https://soroban-testnet.stellar.org",
  public: "https://mainnet.sorobanrpc.com",
};

export const PASSPHRASE: Record<Network, string> = {
  testnet: "Test SDF Network ; September 2015",
  public: "Public Global Stellar Network ; September 2015",
};

interface Stored {
  network: Network;
  rpc: string | null;
}

interface NetworkState {
  network: Network;
  rpc: string;
  rpcIsCustom: boolean;
  setNetwork: (n: Network) => void;
  setRpc: (url: string) => void;
  resetRpc: () => void;
}

const NetworkContext = createContext<NetworkState | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useStoredValue<Stored>(KEY);
  const network = stored?.network ?? "testnet";
  const rpcOverride = stored?.rpc ?? null;

  const setNetwork = useCallback((n: Network) => setStored({ network: n, rpc: null }), [setStored]);

  const value = useMemo<NetworkState>(
    () => ({
      network,
      rpc: rpcOverride ?? DEFAULT_RPC[network],
      rpcIsCustom: rpcOverride !== null,
      setNetwork,
      setRpc: (url) => setStored({ network, rpc: url.trim() || null }),
      resetRpc: () => setStored({ network, rpc: null }),
    }),
    [network, rpcOverride, setNetwork, setStored],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkState {
  const n = useContext(NetworkContext);
  if (!n) throw new Error("useNetwork must be used inside NetworkProvider");
  return n;
}
