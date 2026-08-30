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
    <dl className={`grid grid-cols-3 gap-x-4 gap-y-1 sm:gap-x-8 ${className}`}>
      {counters.map((c) => (
        <div key={c.key} className="min-w-0">
          <dt className="eyebrow leading-snug">{c.label}</dt>
          <dd className="mono mt-0.5 text-sm whitespace-nowrap">
            day {formatCount(daysSince(c.startDate))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
