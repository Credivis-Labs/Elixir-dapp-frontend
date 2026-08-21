import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { AccountsView } from "@/components/views/AccountsView";

export const metadata: Metadata = { title: "Accounts" };

export default function AccountsPage() {
  return (
    <AppShell>
      <AccountsView />
    </AppShell>
  );
}
