import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Squads-style section: a flat elevated slab with a plain-text title. No borders;
// nested Card tone="sunken" for inner tiles.
export function Card({ children, className, tone = "default", id, attention }: { children: ReactNode; className?: string; tone?: "default" | "sunken" | "inset" | "attn" | "danger"; id?: string; attention?: boolean }) {
  const tones = {
    default: "bg-elevated",
    sunken: "bg-sunken",
    inset: "bg-inset",
    attn: "bg-attn-soft",
    danger: "bg-danger-soft",
  };
  return <section id={id} className={cn("rounded-[var(--radius-lg)] glass", tones[tone], attention && "meniscus", className)}>{children}</section>;
}

export function CardHeader({ title, eyebrow, action, className }: { title: ReactNode; eyebrow?: string; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex items-center justify-between gap-4 px-5 pt-5 pb-3", className)}>
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-[17px] font-semibold leading-tight">{title}</h2>
        {eyebrow && <span className="font-mono text-[11px] text-faint">{eyebrow}</span>}
      </div>
      {action}
    </header>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-line", className)} />;
}

export function Stat({ label, value, sub, mono }: { label: string; value: ReactNode; sub?: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={cn("text-[28px] font-semibold leading-none tabular", mono ? "font-mono" : "font-display")}>{value}</span>
      <span className="eyebrow">{label}</span>
      {sub && <span className="text-[12px] text-faint">{sub}</span>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="flex gap-1 border-b border-line" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "-mb-px border-b-2 px-3 pb-2.5 pt-1 text-[14px] transition-colors",
            value === o.value ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, eyebrow, description, action }: { title: ReactNode; eyebrow?: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 pt-4">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="font-display text-[30px] font-semibold leading-none">{title}</h1>
        {description && <div className="mt-1 max-w-2xl text-sm text-muted">{description}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
