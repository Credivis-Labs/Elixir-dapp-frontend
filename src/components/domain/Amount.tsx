import { cn } from "@/lib/cn";
import { formatAmount } from "@/lib/format";
import type { Asset } from "@/lib/types";

export function Amount({ amount, asset, sign, className, size = "md" }: { amount: bigint; asset: Asset; sign?: "+" | "-"; className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-[13px]", md: "text-[15px]", lg: "text-[22px]" };
  return (
    <span className={cn("font-mono tabular whitespace-nowrap", sizes[size], className)}>
      {sign && <span className={sign === "-" ? "text-danger" : "text-ok"}>{sign}</span>}
      {formatAmount(amount, asset.decimals)}
      <span className="ml-1 text-muted text-[0.8em]">{asset.code}</span>
    </span>
  );
}
