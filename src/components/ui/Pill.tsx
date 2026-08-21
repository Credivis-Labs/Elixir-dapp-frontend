import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PillTone = "neutral" | "accent" | "attn" | "danger" | "ok" | "faint";

const tones: Record<PillTone, string> = {
  neutral: "bg-inset text-fg border-transparent",
  accent: "bg-accent-soft text-accent border-accent/30",
  attn: "bg-attn-soft text-attn border-attn/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  ok: "bg-ok-soft text-ok border-ok/30",
  faint: "bg-inset text-faint border-transparent",
};

export function Pill({ children, tone = "neutral", className, dot }: { children: ReactNode; tone?: PillTone; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 h-[22px] text-[11.5px] font-medium leading-none whitespace-nowrap", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
