import type { Metadata } from "next";
import { ActivityView } from "@/components/views/ActivityView";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage({ params }: PageProps<"/a/[address]/activity">) {
  const { address } = await params;
  return <ActivityView address={address} />;
}
