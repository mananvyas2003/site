"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountChip from "./AccountChip";
import InboxBell from "./InboxBell";
import type { Handle } from "@/lib/people";

const NAV = [
  { href: "/", label: "us" },
  { href: "/you", label: "your turn", signedInOnly: true },
  { href: "/#thread", label: "the thread" },
  { href: "/firsts", label: "firsts" },
  { href: "/letters", label: "sealed" },
];

export default function Chrome({
  children,
  signedIn,
  handle,
  accent,
  unlocked = false,
  unreadInbox = 0,
}: {
  children: React.ReactNode;
  signedIn: boolean;
  handle: Handle | null;
  accent: string | null;
  /** running on localhost with no password set yet */
  unlocked?: boolean;
  unreadInbox?: number;
}) {
  const pathname = usePathname();
  const bare = pathname === "/signin" || pathname.startsWith("/print/");

  if (bare) return <>{children}</>;

  return (
    <>
      <header className="no-print sticky top-0 z-40 border-b border-haze/70 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Link href="/" className="display text-[1.35rem] leading-none">
            m<span className="italic">&</span>m
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.filter((item) => !("signedInOnly" in item && item.signedInOnly) || signedIn).map((item, i) => (
              <span key={item.href} className="flex items-center">
                {i > 0 && <span className="px-1 text-haze">·</span>}
                <Link
                  href={item.href}
                  className="eyebrow px-1.5 py-1 transition-colors hover:text-ink"
                  style={pathname === item.href ? { color: "var(--color-ink)" } : undefined}
                >
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/search" aria-label="search" className="eyebrow hover:text-ink">
              search
            </Link>
            {(signedIn || unlocked) && <InboxBell unread={unreadInbox} />}
            {signedIn && handle && <AccountChip handle={handle} accent={accent ?? "#221A16"} />}
            {!signedIn && (
              <Link href="/signin" className="btn btn-primary px-3 py-1.5 text-[0.6875rem]">
                sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {unlocked && (
        <div className="no-print border-b border-sindoor/30 bg-sindoor/5 px-5 py-2 text-center">
          <p className="mono text-[0.6875rem] text-sindoor">
            no password set — anyone who opens this is you.{" "}
            <span className="text-ink-soft">run `npm run set-password`</span>
          </p>
        </div>
      )}

      {children}

      {/* the floating + — reachable from everywhere. this is the 60-second path. */}
      {(signedIn || unlocked) && (
        <Link
          href="/new"
          aria-label="add a memory"
          className="no-print fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-[0_10px_30px_-8px_rgba(34,26,22,0.55)] transition-transform duration-200 hover:scale-105 active:scale-95"
          style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </Link>
      )}
    </>
  );
}
