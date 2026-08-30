"use client";

import Link from "next/link";

/** Envelope with unread badge — top-right, links to private inbox. */
export default function InboxBell({ unread }: { unread: number }) {
  return (
    <Link
      href="/inbox"
      aria-label={unread > 0 ? `${unread} unread messages` : "inbox"}
      className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-paper-deep"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={unread > 0 ? "text-sindoor" : "text-ink-soft"}
      >
        <path
          d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Z"
          strokeLinejoin="round"
        />
        <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-sindoor px-1 text-[0.625rem] font-medium leading-none text-paper">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
