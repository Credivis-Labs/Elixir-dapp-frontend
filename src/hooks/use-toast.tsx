"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface Toast {
  id: number;
  title: string;
  detail?: string;
  tone: "neutral" | "ok" | "danger";
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastState | null>(null);
let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++counter;
      setToasts((prev) => [...prev, { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.tone === "danger" ? 7000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastState {
  const t = useContext(ToastContext);
  if (!t) throw new Error("useToast must be used inside ToastProvider");
  return t;
}
