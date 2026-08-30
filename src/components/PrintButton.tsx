"use client";

import Link from "next/link";

export default function PrintButton({ year }: { year: number }) {
  return (
    <div className="no-print mb-8 flex flex-wrap items-center gap-4 border-b border-haze pb-5">
      <Link href="/" className="eyebrow hover:text-ink">
        ← back
      </Link>
      <button onClick={() => window.print()} className="btn btn-primary">
        print {year} → pdf
      </button>
      <div className="flex gap-3">
        <Link href={`/print/${year - 1}`} className="eyebrow underline underline-offset-4">
          {year - 1}
        </Link>
        <Link href={`/print/${year + 1}`} className="eyebrow underline underline-offset-4">
          {year + 1}
        </Link>
      </div>
      <span className="text-sm text-ink-soft">a5. save as pdf, then take it to a press.</span>
    </div>
  );
}
