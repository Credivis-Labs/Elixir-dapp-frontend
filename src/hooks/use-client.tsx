"use client";

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ElixirClient } from "@/lib/client";
import { MockClient } from "@/lib/mock/client";

const ClientContext = createContext<ElixirClient | null>(null);

let singleton: ElixirClient | null = null;

function getClient(): ElixirClient {
  if (!singleton) singleton = new MockClient();
  return singleton;
}

export function ClientProvider({ children }: { children: ReactNode }) {
  const [client] = useState(getClient);
  return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>;
}

export function useClient(): ElixirClient {
  const c = useContext(ClientContext);
  if (!c) throw new Error("useClient must be used inside ClientProvider");
  return c;
}

// Re-renders the caller whenever the client commits. Selectors read synchronously.
export function useClientVersion(): number {
  const client = useClient();
  return useSyncExternalStore(
    (cb) => client.subscribe(cb),
    () => client.getVersion(),
    () => 0,
  );
}
