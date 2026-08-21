"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[var(--radius-md)] border border-transparent bg-inset px-3 text-sm text-fg placeholder:text-faint focus:border-line-strong focus:outline-none disabled:opacity-60";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  children: (id: string) => ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-fg">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, mono, ...rest }: InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return <input className={cn(control, "h-10", mono && "font-mono text-[13px]", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "py-2 min-h-20 resize-y", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, "h-10 appearance-none pr-8 bg-no-repeat bg-[right_0.6rem_center]", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%238a97a6' stroke-width='1.5' d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E\")" }} {...rest}>
      {children}
    </select>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className={cn("flex items-start justify-between gap-4 py-2", disabled && "opacity-60")}>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {description && <span className="text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-[var(--radius-md)] bg-sunken p-0.5", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-8 rounded-[6px] px-3 text-[13px] font-medium transition-colors",
            value === o.value ? "bg-inset text-fg" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
