import type { Metadata } from "next";
import { SignersView } from "@/components/views/SignersView";

export const metadata: Metadata = { title: "Signers" };

export default async function SignersPage({ params }: PageProps<"/a/[address]/signers">) {
  const { address } = await params;
  return <SignersView address={address} />;
}
