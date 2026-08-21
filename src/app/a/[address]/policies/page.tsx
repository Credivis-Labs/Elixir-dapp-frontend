import type { Metadata } from "next";
import { PoliciesView } from "@/components/views/PoliciesView";

export const metadata: Metadata = { title: "Policies" };

export default async function PoliciesPage({ params }: PageProps<"/a/[address]/policies">) {
  const { address } = await params;
  return <PoliciesView address={address} />;
}
