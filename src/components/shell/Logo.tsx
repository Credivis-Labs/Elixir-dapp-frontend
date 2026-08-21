// A vessel with a meniscus: the elixir. Verdigris fill on the ink outline.
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M9 3h6v4.5l4.2 8.4A3 3 0 0 1 16.5 20h-9a3 3 0 0 1-2.7-4.1L9 7.5V3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.2 13.5h9.6l1.9 3.8a1.4 1.4 0 0 1-1.2 2.1h-11a1.4 1.4 0 0 1-1.2-2.1l1.9-3.8Z" fill="var(--accent)" />
      <rect x="8" y="2.2" width="8" height="1.6" rx="0.8" fill="currentColor" />
    </svg>
  );
}
