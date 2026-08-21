import type { Metadata } from "next";
import { AddressBookView } from "@/components/views/AddressBookView";

export const metadata: Metadata = { title: "Address book" };

export default async function AddressBookPage({ params }: PageProps<"/a/[address]/address-book">) {
  const { address } = await params;
  return <AddressBookView address={address} />;
}
