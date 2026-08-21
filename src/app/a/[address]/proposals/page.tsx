import type { Metadata } from "next";
import { Suspense } from "react";
import { ProposalsView } from "@/components/views/ProposalsView";

export const metadata: Metadata = { title: "Proposals" };

export default async function ProposalsPage({ params }: PageProps<"/a/[address]/proposals">) {
  const { address } = await params;
  return (
    <Suspense>
      <ProposalsView address={address} />
    </Suspense>
  );
}
