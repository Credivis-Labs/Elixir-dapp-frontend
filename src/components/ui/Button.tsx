"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "attn";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-fg text-bg hover:opacity-90 active:opacity-80",
  secondary: "bg-elevated text-fg hover:bg-inset glass",
  ghost: "text-muted hover:bg-inset hover:text-fg",
  danger: "bg-danger-soft text-danger hover:brightness-125",
  attn: "bg-accent text-accent-fg hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pending?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", pending, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || pending} {...rest}>
      {pending && <Spinner />}
      {children}
    </button>
  );
}

interface LinkButtonProps {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function LinkButton({ href, variant = "primary", size = "md", className, children }: LinkButtonProps) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin", className)}
    />
  );
}
