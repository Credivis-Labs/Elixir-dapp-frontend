"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { useAccount, useAccounts, useProposalBuckets, useSubaccounts } from "@/hooks/use-data";
import { useNow } from "@/hooks/use-clock";
import { shortAddress, formatCountdown, formatUsd } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { Icon, type IconName } from "./Icons";
import { ThemeToggle } from "./ThemeToggle";

const NAV: { href: string; label: string; key: string; icon: IconName }[] = [
  { href: "", label: "Overview", key: "overview", icon: "dashboard" },
  { href: "/proposals", label: "Proposals", key: "proposals", icon: "proposals" },
  { href: "/subaccounts", label: "Vessels", key: "subaccounts", icon: "subaccounts" },
  { href: "/signers", label: "Signers", key: "signers", icon: "signers" },
  { href: "/policies", label: "Policies", key: "policies", icon: "policies" },
  { href: "/activity", label: "Ledger", key: "activity", icon: "activity" },
  { href: "/settings", label: "Settings", key: "settings", icon: "settings" },
];

export function AppShell({ address, children }: { address?: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, openSheet, disconnect } = useWallet();
  const { network, rpcIsCustom } = useNetwork();
  const accounts = useAccounts();
  const account = useAccount(address ?? "");
  const subs = useSubaccounts(address ?? "");
  const buckets = useProposalBuckets(address ?? "");
  const now = useNow();
  const [navOpen, setNavOpen] = useState(false);
  const [switcher, setSwitcher] = useState(false);

  const frozen = account && account.config.frozenUntil > now;
  const base = address ? `/a/${address}` : "";
  const total = subs.flatMap((s) => s.balances).reduce((s, b) => s + (b.usd ?? 0), 0);
  const needs = buckets.needsYou.length;

  const rail = (
    <aside className="relative flex h-full w-[260px] shrink-0 flex-col gap-5 px-4 py-5">
      <div aria-hidden className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-line-strong to-transparent" />

      <Link href="/accounts" className="flex items-center gap-2.5 px-2">
        <Logo size={26} />
        <span className="font-display text-[19px] font-semibold">Elixir</span>
      </Link>

      {account ? (
        <div className={cn("glass rounded-[var(--radius-lg)] bg-elevated p-3", needs > 0 && "meniscus")}>
          <button type="button" onClick={() => setSwitcher((v) => !v)} aria-expanded={switcher} className="flex w-full items-start gap-3 rounded-[var(--radius-md)] px-1 py-1 text-left">
            <span className="min-w-0 flex-1">
              <span className="eyebrow block truncate">{account.name}</span>
              <span className="font-display mt-1 block text-[24px] font-semibold leading-none tabular">{formatUsd(total)}</span>
            </span>
            <Icon.chevrons className="mt-1 text-faint" />
          </button>
          {switcher && (
            <ul className="mt-2 flex flex-col gap-0.5 border-t border-line pt-2">
              {accounts.map((a) => (
                <li key={a.address}>
                  <button type="button" onClick={() => { setSwitcher(false); setNavOpen(false); router.push(`/a/${a.address}`); }} className={cn("flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] hover:bg-sunken", a.address === address && "text-accent")}>
                    {a.name}
                    <span className="font-mono text-[11px] text-faint">{a.threshold}/{a.signers.length}</span>
                  </button>
                </li>
              ))}
              <li>
                <Link href="/accounts/new" onClick={() => setSwitcher(false)} className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] text-muted hover:bg-sunken hover:text-fg">
                  <Icon.plus width={14} height={14} /> New account
                </Link>
              </li>
            </ul>
          )}
          <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3">
            <Link href={`${base}/signers`} className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-sunken px-2 py-1 font-mono text-[12px] hover:bg-inset">
              <ThresholdRing threshold={account.threshold} signers={account.signers.length} /> {account.threshold}/{account.signers.length}
            </Link>
            <span className="rounded-[var(--radius-sm)] bg-sunken px-2 py-1 font-mono text-[12px] text-muted">e{account.config.configEpoch}</span>
            {frozen && (
              <span title="Frozen" className="ml-auto grid size-7 place-items-center rounded-[var(--radius-sm)] bg-danger-soft text-danger">
                <Icon.snowflake width={14} height={14} />
              </span>
            )}
          </div>
        </div>
      ) : (
        <Link href="/accounts" className="glass rounded-[var(--radius-lg)] bg-elevated p-3 text-[13px] text-muted hover:text-fg">
          {accounts.length ? `${accounts.length} account${accounts.length === 1 ? "" : "s"}` : "No account selected"}
        </Link>
      )}

      {address && (
        <nav className="flex flex-col gap-px">
          {NAV.map((n) => {
            const href = `${base}${n.href}`;
            const active = n.href === "" ? pathname === base : pathname.startsWith(href);
            const badge = n.key === "proposals" && needs > 0 ? needs : null;
            const I = Icon[n.icon];
            return (
              <Link
                key={n.key}
                href={href}
                onClick={() => setNavOpen(false)}
                className={cn(
                  "relative flex h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 text-[14px] transition-colors",
                  active ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                <span aria-hidden className={cn("absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-full bg-accent transition-opacity", active ? "opacity-100" : "opacity-0")} />
                <I className={cn(active ? "text-accent" : "text-faint")} />
                <span className="flex-1">{n.label}</span>
                {badge !== null && <span className="font-mono text-[12px] text-accent">{badge}</span>}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="mt-auto flex flex-col gap-px">
        {address && (
          <Link href={`${base}/address-book`} onClick={() => setNavOpen(false)} className={cn("flex h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 text-[14px]", pathname.startsWith(`${base}/address-book`) ? "bg-elevated text-fg" : "text-muted hover:text-fg")}>
            <Icon.contacts className="text-faint" /> Contacts
          </Link>
        )}
        <a href="https://github.com/Credivis-Labs" target="_blank" rel="noreferrer" className="flex h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 text-[14px] text-muted hover:text-fg">
          <Icon.help className="text-faint" /> Help &amp; docs
        </a>
        <div className="mt-3 flex items-center justify-between gap-2 px-1">
          <Link href="/settings" className="flex items-center gap-1.5 px-2 text-[11px] text-faint hover:text-fg">
            <span className={cn("size-1.5 rounded-full", network === "public" ? "bg-accent" : "bg-line-strong")} />
            {network === "public" ? "mainnet" : "testnet"}{rpcIsCustom && " · custom rpc"}
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );

  return (
    <div className="relative z-[1] flex min-h-screen">
      <div className="sticky top-0 hidden h-screen lg:block">{rail}</div>
      {navOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="h-full bg-bg">{rail}</div>
          <button aria-label="Close navigation" className="flex-1 bg-black/60" onClick={() => setNavOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 px-4 sm:px-10">
          <div className="flex items-center gap-2 lg:hidden">
            <button type="button" aria-label="Open navigation" onClick={() => setNavOpen(true)} className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-elevated">
              <Icon.menu />
            </button>
            <Link href="/accounts"><Logo size={22} /></Link>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <button type="button" onClick={disconnect} title="Disconnect" className="glass flex h-9 items-center gap-2 rounded-full bg-elevated pl-1.5 pr-3 text-[13px] hover:bg-sunken">
                <span className="grid size-6 place-items-center rounded-full bg-inset text-muted"><Icon.wallet width={13} height={13} /></span>
                <span className="font-medium">{session.label}</span>
                <span className="font-mono text-muted">{shortAddress(session.address)}</span>
              </button>
            ) : (
              <Button variant="primary" size="sm" onClick={openSheet} className="gap-2 rounded-full">
                <Icon.wallet width={15} height={15} /> Connect
              </Button>
            )}
          </div>
        </header>

        {frozen && account && (
          <div className="mx-4 mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-md)] bg-danger-soft px-4 py-2.5 text-sm sm:mx-10">
            <span className="flex items-center gap-1.5 font-medium text-danger"><Icon.snowflake width={14} height={14} /> Frozen</span>
            <span className="text-muted">Non-config execution halted. Lifts in {formatCountdown(account.config.frozenUntil - now)} or when an unfreeze proposal executes.</span>
            <Link href={`${base}/settings#freeze`} className="ml-auto text-fg underline underline-offset-2">Manage</Link>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-20 pt-1 sm:px-10">{children}</main>
      </div>
    </div>
  );
}

function ThresholdRing({ threshold, signers }: { threshold: number; signers: number }) {
  const r = 5;
  const c = 2 * Math.PI * r;
  const frac = threshold / Math.max(signers, 1);
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <circle cx="7" cy="7" r={r} fill="none" stroke="var(--line-strong)" strokeWidth="2" />
      <circle cx="7" cy="7" r={r} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 7 7)" strokeLinecap="round" />
    </svg>
  );
}
