import type { Metadata } from "next";
import { ProposalDetailView } from "@/components/views/ProposalDetailView";

export async function generateMetadata({ params }: PageProps<"/a/[address]/proposals/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Proposal #${id}` };
}

export default async function ProposalPage({ params }: PageProps<"/a/[address]/proposals/[id]">) {
  const { address, id } = await params;
  return <ProposalDetailView address={address} id={Number(id)} />;
}
