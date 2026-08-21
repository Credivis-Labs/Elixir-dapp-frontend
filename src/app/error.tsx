"use client";

import { Button, LinkButton } from "@/components/ui/Button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md">
        <p className="font-mono text-xs text-faint">error{error.digest ? ` · ${error.digest}` : ""}</p>
        <h1 className="font-display text-2xl font-semibold mt-1">Something broke</h1>
        <p className="text-sm text-muted mt-2 break-words">{error.message}</p>
        <div className="mt-5 flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <LinkButton href="/accounts" variant="secondary">Your accounts</LinkButton>
        </div>
      </div>
    </main>
  );
}
