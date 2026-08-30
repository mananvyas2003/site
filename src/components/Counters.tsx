"use client";

import { useEffect, useState } from "react";
import { daysSince, formatCount } from "@/lib/dates";
import type { CounterRow } from "@/lib/queries";

/**
 * Live day counters. Server renders the value; the client re-checks every
 * minute so an open tab ticks over at midnight IST without a refresh.
 */
export default function Counters({ counters, className = "" }: { counters: CounterRow[]; className?: string }) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (counters.length === 0) {
    return (
      <p className={`eyebrow ${className}`}>
        counter dates not set yet — add them in .env.local
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-baseline gap-x-6 gap-y-2 ${className}`}>
      {counters.map((c, i) => (
        <span key={c.key} className="flex items-baseline gap-2">
          {i > 0 && <span className="mr-4 hidden text-haze sm:inline">·</span>}
          <span className="eyebrow">{c.label}</span>
          <span className="mono text-sm">day {formatCount(daysSince(c.startDate))}</span>
        </span>
      ))}
    </div>
  );
}
