"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// localStorage as an external store. Server snapshot is null, so SSR and the
// hydration pass agree; the client value arrives in the post-hydration render.
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useStoredValue<T>(key: string): [T | null, (v: T | null) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key),
    () => null,
  );

  const value = useMemo<T | null>(() => {
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [raw]);

  const set = useCallback(
    (v: T | null) => {
      if (v === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(v));
      listeners.forEach((l) => l());
    },
    [key],
  );

  return [value, set];
}
