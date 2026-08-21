import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { GlobalSettingsView } from "@/components/views/GlobalSettingsView";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <AppShell>
      <GlobalSettingsView />
    </AppShell>
  );
}
