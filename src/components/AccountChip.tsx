"use client";

import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/session-actions";
import type { Handle } from "@/lib/people";

/**
 * Who you're signed in as, and the way out. The way out matters: you share a
 * laptop, so "switch to her" has to be reachable without clearing cookies by
 * hand.
 */
export default function AccountChip({ handle, accent }: { handle: Handle; accent: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const other = handle === "manno" ? "momo" : "manno";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="mono rounded-full px-2.5 py-1 text-[0.6875rem] lowercase transition-opacity hover:opacity-70"
        style={{ background: `${accent}1a`, color: accent }}
      >
        {handle}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 rounded-sm border border-haze bg-paper p-3 shadow-[0_16px_40px_-20px_rgba(34,26,22,0.5)]"
        >
          <p className="eyebrow">signed in as {handle}</p>
          <form action={logout} className="mt-3">
            <button type="submit" className="btn btn-ghost w-full text-sm">
              sign out
            </button>
          </form>
          <p className="mt-2.5 text-[0.6875rem] leading-snug text-ink-soft">
            sign out to let {other} in on this device.
          </p>
        </div>
      )}
    </div>
  );
}
