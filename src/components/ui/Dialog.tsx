"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
}

export function Dialog({ open, onClose, title, description, children, footer, width = "md" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-[var(--radius-lg)] border border-line bg-elevated p-0 text-fg shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-[2px] open:rise",
        widths[width],
      )}
    >
      <div className="flex flex-col">
        <header className="px-6 pt-5 pb-3">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted mt-1">{description}</p>}
        </header>
        <div className="px-6 pb-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer>}
      </div>
    </dialog>
  );
}
