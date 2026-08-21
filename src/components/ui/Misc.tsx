"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useToast } from "@/hooks/use-toast";

export function EmptyState({ title, body, action, className }: { title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-[var(--radius-lg)] px-5 py-10 text-center", className)}>
      <p className="text-[14px] text-muted">{title}</p>
      {body && <p className="text-[13px] text-faint max-w-prose">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius-sm)] bg-sunken", className)} />;
}

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto rise rounded-[var(--radius-md)] border px-4 py-3 shadow-lg",
            t.tone === "ok" && "border-ok/40 bg-ok-soft text-fg",
            t.tone === "danger" && "border-danger/40 bg-danger-soft text-fg",
            t.tone === "neutral" && "border-line bg-elevated",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t.title}</p>
              {t.detail && <p className="text-xs text-muted mt-0.5 break-words">{t.detail}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-faint hover:text-fg text-lg leading-none">
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function KeyValue({ rows, className }: { rows: { k: string; v: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm", className)}>
      {rows.map((r) => (
        <div key={r.k} className="contents">
          <dt className="text-muted">{r.k}</dt>
          <dd className="min-w-0 break-words">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Notice({ tone = "neutral", children, className }: { tone?: "neutral" | "attn" | "danger" | "ok"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "border-line bg-sunken",
    attn: "border-attn/40 bg-attn-soft",
    danger: "border-danger/40 bg-danger-soft",
    ok: "border-ok/40 bg-ok-soft",
  };
  return <div className={cn("rounded-[var(--radius-md)] border px-4 py-3 text-sm", tones[tone], className)}>{children}</div>;
}
