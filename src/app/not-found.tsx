import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-sm">
        <p className="font-mono text-xs text-faint">404</p>
        <h1 className="font-display text-2xl font-semibold mt-1">Nothing at this address</h1>
        <p className="text-sm text-muted mt-2">The page doesn&apos;t exist. Accounts live under /a/&lt;address&gt;.</p>
        <div className="mt-5">
          <LinkButton href="/accounts" variant="secondary">Your accounts</LinkButton>
        </div>
      </div>
    </main>
  );
}
