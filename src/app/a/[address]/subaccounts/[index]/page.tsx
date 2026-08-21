import type { Metadata } from "next";
import { SubaccountDetailView } from "@/components/views/SubaccountsView";

export async function generateMetadata({ params }: PageProps<"/a/[address]/subaccounts/[index]">): Promise<Metadata> {
  const { index } = await params;
  return { title: `Sub-account #${index}` };
}

export default async function SubaccountPage({ params }: PageProps<"/a/[address]/subaccounts/[index]">) {
  const { address, index } = await params;
  return <SubaccountDetailView address={address} index={Number(index)} />;
}
