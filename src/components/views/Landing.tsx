"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shell/Logo";
import { HashSeal } from "@/components/domain/HashSeal";

// Entry. If a session exists, go straight to accounts. Otherwise, one screen:
// what you are about to trust, and the connect button.
export function Landing() {
  const { session, openSheet } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace("/accounts");
  }, [session, router]);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-6 py-16">
      <div className="grid w-full max-w-4xl gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="rise">
          <div className="flex items-center gap-2 text-fg">
            <Logo size={28} />
            <span className="font-display text-xl font-semibold">Elixir</span>
          </div>
          <h1 className="font-display mt-6 text-[40px] font-semibold leading-[1.02] sm:text-[52px]">
            The signature is the policy.
          </h1>
          <p className="mt-4 max-w-md text-[15px] text-muted">
            A treasury account on Stellar whose address defines what a valid signature means.
            Collect approvals off-chain, submit once. Opt into an on-chain queue when signers
            can&apos;t coordinate.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={openSheet}>
              Connect a signer
            </Button>
            <span className="text-xs text-muted">Passkey, Freighter, Ledger, xBull</span>
          </div>
        </div>

        <div className="rise flex flex-col gap-3" style={{ animationDelay: "120ms" }}>
          <HashSeal hash="3f9a1c27b04e8d5a6c71f2e9b8d40a135e7c2f61d9a84b0c3e5f7a1928d6c4b0" label="What a signer sees before signing" animate />
          <p className="text-xs text-muted px-1">
            Every signing screen shows the payload hash from a local simulation against an RPC
            you choose. Compare it to your hardware wallet. The backend is never trusted for
            what gets signed.
          </p>
        </div>
      </div>
    </main>
  );
}
