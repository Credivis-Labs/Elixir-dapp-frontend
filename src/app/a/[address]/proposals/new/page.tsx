import type { Metadata } from "next";
import { Suspense } from "react";
import { ProposalBuilderView } from "@/components/views/ProposalBuilderView";

export const metadata: Metadata = { title: "New proposal" };

export default async function NewProposalPage({ params }: PageProps<"/a/[address]/proposals/new">) {
  const { address } = await params;
  return (
    <Suspense>
      <ProposalBuilderView address={address} />
    </Suspense>
  );
}
