import type { Metadata } from "next";
import { SubaccountsView } from "@/components/views/SubaccountsView";

export const metadata: Metadata = { title: "Sub-accounts" };

export default async function SubaccountsPage({ params }: PageProps<"/a/[address]/subaccounts">) {
  const { address } = await params;
  return <SubaccountsView address={address} />;
}
