import type { Metadata } from "next";
import { SignView } from "@/components/views/SignView";

export async function generateMetadata({ params }: PageProps<"/a/[address]/proposals/[id]/sign">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Sign #${id}` };
}

export default async function SignPage({ params }: PageProps<"/a/[address]/proposals/[id]/sign">) {
  const { address, id } = await params;
  return <SignView address={address} id={Number(id)} />;
}
