import type { Asset } from "./types";

export const STROOP = 10_000_000n;
export const LEDGER_SECONDS = 5;

export function formatAmount(amount: bigint, decimals = 7, maxFrac = 2): string {
  const neg = amount < 0n;
  const abs = neg ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  const wholeStr = whole.toLocaleString("en-US");
  if (maxFrac === 0) return `${neg ? "-" : ""}${wholeStr}`;
  const fracStr = frac
    .toString()
    .padStart(decimals, "0")
    .slice(0, maxFrac)
    .replace(/0+$/, "");
  return `${neg ? "-" : ""}${wholeStr}${fracStr ? "." + fracStr : ""}`;
}

export function formatAsset(amount: bigint, asset: Asset): string {
  return `${formatAmount(amount, asset.decimals)} ${asset.code}`;
}

export function parseAmount(input: string, decimals = 7): bigint | null {
  const trimmed = input.trim().replace(/,/g, "");
  if (!/^\d*(\.\d*)?$/.test(trimmed) || trimmed === "" || trimmed === ".") return null;
  const [w = "0", f = ""] = trimmed.split(".");
  if (f.length > decimals) return null;
  return BigInt(w || "0") * 10n ** BigInt(decimals) + BigInt(f.padEnd(decimals, "0") || "0");
}

export function formatUsd(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function shortAddress(addr: string, head = 4, tail = 4): string {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function chunkHash(hex: string, size = 4): string[] {
  const out: string[] = [];
  for (let i = 0; i < hex.length; i += size) out.push(hex.slice(i, i + size));
  return out;
}

export function relativeTime(ts: number, now = Date.now() / 1000): string {
  const diff = Math.round(ts - now);
  const abs = Math.abs(diff);
  if (abs < 60) return diff <= 0 ? "just now" : `in ${abs}s`;
  let value: number;
  let unit: string;
  if (abs < 3600) {
    value = Math.floor(abs / 60);
    unit = "m";
  } else if (abs < 86400) {
    value = Math.floor(abs / 3600);
    unit = "h";
  } else if (abs < 604800) {
    value = Math.floor(abs / 86400);
    unit = "d";
  } else {
    value = Math.floor(abs / 604800);
    unit = "w";
  }
  return diff < 0 ? `${value}${unit} ago` : `in ${value}${unit}`;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "none";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s && !d && !h) parts.push(`${s}s`);
  return parts.join(" ") || "0s";
}

export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function roleNames(roles: number): string[] {
  const out: string[] = [];
  if (roles & 1) out.push("Initiate");
  if (roles & 2) out.push("Vote");
  if (roles & 4) out.push("Execute");
  return out;
}
