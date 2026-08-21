import type { Metadata } from "next";
import { DashboardView } from "@/components/views/DashboardView";

export const metadata: Metadata = { title: "Overview" };

export default async function AccountPage({ params }: PageProps<"/a/[address]">) {
  const { address } = await params;
  return <DashboardView address={address} />;
}
