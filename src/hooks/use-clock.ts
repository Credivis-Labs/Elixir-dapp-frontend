"use client";

import { useEffect, useMemo, useState } from "react";
import { useClient } from "./use-client";
import { LEDGER_SECONDS } from "@/lib/format";
import type { LedgerInfo } from "@/lib/types";

// One ticking clock for countdowns (timelock, auth-entry expiry, freeze).
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useLedger(): LedgerInfo {
  const client = useClient();
  const now = useNow(LEDGER_SECONDS * 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => client.getLedger(), [client, now]);
}

export function useAuthExpiry(expiresAtLedger: number): { ledgersLeft: number; secondsLeft: number; expired: boolean } {
  const ledger = useLedger();
  const ledgersLeft = Math.max(0, expiresAtLedger - ledger.sequence);
  return { ledgersLeft, secondsLeft: ledgersLeft * LEDGER_SECONDS, expired: ledgersLeft === 0 };
}
