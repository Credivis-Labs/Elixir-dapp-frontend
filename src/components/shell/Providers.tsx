"use client";

import type { ReactNode } from "react";
import { ClientProvider } from "@/hooks/use-client";
import { WalletProvider } from "@/hooks/use-wallet";
import { NetworkProvider } from "@/hooks/use-network";
import { ToastProvider } from "@/hooks/use-toast";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/Misc";
import { WalletSheet } from "./WalletSheet";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <NetworkProvider>
          <ClientProvider>
            <WalletProvider>
              {children}
              <WalletSheet />
              <Toaster />
            </WalletProvider>
          </ClientProvider>
        </NetworkProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
