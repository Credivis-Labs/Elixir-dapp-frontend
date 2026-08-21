import { cn } from "@/lib/cn";
import { chunkHash } from "@/lib/format";

// The signature payload, chunked for eye-comparison against a hardware wallet
// screen. Rendered from the LOCAL simulation result, never from the backend.
export function HashSeal({ hash, label = "Signature payload", className, compact, animate }: { hash: string; label?: string; className?: string; compact?: boolean; animate?: boolean }) {
  const chunks = chunkHash(hash, 4);
  return (
    <figure className={cn("rounded-[var(--radius-md)] bg-seal text-seal-fg", compact ? "px-3 py-2" : "px-4 py-3", className)}>
      <figcaption className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] opacity-70">{label}</span>
        <span className="text-[10.5px] font-mono opacity-50">sha256 · {hash.length / 2}B</span>
      </figcaption>
      <div className={cn("grid font-mono leading-snug", compact ? "grid-cols-8 gap-x-2 text-[11.5px]" : "grid-cols-4 sm:grid-cols-8 gap-x-3 gap-y-1 text-[13px]", animate && "seal-in")}>
        {chunks.map((c, i) => (
          <span key={i} className={cn(i % 2 === 0 ? "opacity-100" : "opacity-70")}>
            {c}
          </span>
        ))}
      </div>
    </figure>
  );
}
