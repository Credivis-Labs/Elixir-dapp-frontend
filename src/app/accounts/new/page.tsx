import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { CreateAccountView } from "@/components/views/CreateAccountView";

export const metadata: Metadata = { title: "New account" };

export default function NewAccountPage() {
  return (
    <AppShell>
      <CreateAccountView />
    </AppShell>
  );
}
