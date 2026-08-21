import { AppShell } from "@/components/shell/AppShell";

export default async function AccountLayout({ children, params }: LayoutProps<"/a/[address]">) {
  const { address } = await params;
  return <AppShell address={address}>{children}</AppShell>;
}
