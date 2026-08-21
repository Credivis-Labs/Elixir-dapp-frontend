import type { Metadata } from "next";
import { AccountSettingsView } from "@/components/views/AccountSettingsView";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage({ params }: PageProps<"/a/[address]/settings">) {
  const { address } = await params;
  return <AccountSettingsView address={address} />;
}
