import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const Icon = {
  dashboard: (p: P) => (
    <svg {...base} {...p}><rect x="4" y="4" width="6" height="16" rx="1.5" /><rect x="14" y="4" width="6" height="9" rx="1.5" /></svg>
  ),
  proposals: (p: P) => (
    <svg {...base} {...p}><path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" /></svg>
  ),
  subaccounts: (p: P) => (
    <svg {...base} {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
  ),
  signers: (p: P) => (
    <svg {...base} {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14.5a4.5 4.5 0 0 1 5 4.5" /></svg>
  ),
  policies: (p: P) => (
    <svg {...base} {...p}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  activity: (p: P) => (
    <svg {...base} {...p}><path d="M4 12h3l2.5-6 4 12 2.5-6h4" /></svg>
  ),
  contacts: (p: P) => (
    <svg {...base} {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="2.5" /><path d="M8 17a4 4 0 0 1 8 0" /></svg>
  ),
  settings: (p: P) => (
    <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
  ),
  help: (p: P) => (
    <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></svg>
  ),
  send: (p: P) => (
    <svg {...base} {...p}><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></svg>
  ),
  receive: (p: P) => (
    <svg {...base} {...p}><path d="M12 5v14" /><path d="m6 13 6 6 6-6" /></svg>
  ),
  plus: (p: P) => (
    <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
  ),
  chevrons: (p: P) => (
    <svg {...base} {...p}><path d="m8 9 4-4 4 4M8 15l4 4 4-4" /></svg>
  ),
  wallet: (p: P) => (
    <svg {...base} {...p}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18" /><circle cx="16.5" cy="14.5" r="1" fill="currentColor" /></svg>
  ),
  menu: (p: P) => (
    <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  refresh: (p: P) => (
    <svg {...base} {...p}><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></svg>
  ),
  snowflake: (p: P) => (
    <svg {...base} {...p}><path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" /></svg>
  ),
};

export type IconName = keyof typeof Icon;
