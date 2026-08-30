"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Photo from "./Photo";
import { prettyRange, yearOf } from "@/lib/dates";
import type { ThreadEntry } from "@/lib/queries";

/**
 * The thread. One continuous drawn line, newest first, ending on the entry
 * that isn't written yet. The line is an SVG whose stroke-dashoffset is tied
 * to scroll progress — PRD §7 calls this the one place worth spending the
 * animation budget, so it's the only bespoke animation in the app.
 *
 * Geometry: the wrapper is padded 40px (64px at sm). The rail sits at x=14px
 * (28px at sm), so a node — 11px wide — hangs at -31.5px (-41.5px) from the
 * content edge. Those two numbers are the only magic here; keep them in sync.
 */
const NODE = "absolute left-[-31.5px] sm:left-[-41.5px]";

export default function Thread({ entries, futureYear = 2065 }: { entries: ThreadEntry[]; futureYear?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [draw, setDraw] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const measure = () => setHeight(wrap.offsetHeight);
    measure();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDraw(1);
      return;
    }

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = wrap.getBoundingClientRect();
        const vh = window.innerHeight;
        // 0 when the top of the thread meets the viewport bottom;
        // 1 once the bottom of the thread has passed the viewport middle
        const progress = (vh - rect.top) / (rect.height + vh * 0.5);
        setDraw(Math.min(1, Math.max(0, progress)));
      });
    };

    onScroll();
    const ro = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    ro.observe(wrap);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [entries.length]);

  const rows: Array<{ type: "year"; year: number } | { type: "entry"; entry: ThreadEntry }> = [];
  let lastYear: number | null = null;
  for (const entry of entries) {
    const year = yearOf(entry.happenedOn);
    if (year !== lastYear) {
      rows.push({ type: "year", year });
      lastYear = year;
    }
    rows.push({ type: "entry", entry });
  }

  return (
    <div ref={wrapRef} className="relative pl-10 sm:pl-16">
      <svg
        className="pointer-events-none absolute left-[13px] top-0 sm:left-[27px]"
        width="2"
        height={height || 1}
        viewBox={`0 0 2 ${height || 1}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <line x1="1" y1="0" x2="1" y2={height || 1} stroke="var(--color-haze)" strokeWidth="2" />
        <line
          className="thread-line"
          x1="1"
          y1="0"
          x2="1"
          y2={height || 1}
          stroke="var(--color-marigold)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ ["--dash-len" as string]: height || 1, ["--draw" as string]: draw }}
        />
      </svg>

      <ol>
        {rows.map((row) =>
          row.type === "year" ? (
            <li key={`y${row.year}`} className="relative pb-3 pt-8 first:pt-0">
              <span className={`${NODE} top-[1.9rem] h-[11px] w-[11px] first:top-0`} aria-hidden />
              <span className="mono text-[0.6875rem] tracking-[0.18em] text-ink-soft">{row.year}</span>
            </li>
          ) : (
            <li key={row.entry.id} className="reveal relative pb-9 sm:pb-11">
              <span
                aria-hidden
                className={`${NODE} top-[0.55rem] block h-[11px] w-[11px] rounded-full border-2`}
                style={{
                  background: row.entry.isMilestone ? "var(--color-sindoor)" : "var(--color-paper)",
                  borderColor: row.entry.isMilestone ? "var(--color-sindoor)" : "var(--color-marigold)",
                }}
              />

              <Link href={`/m/${row.entry.slug}`} className="group flex gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mono flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.6875rem] text-ink-soft">
                    <span className="rounded-sm bg-paper-deep px-1.5 py-0.5">
                      {prettyRange(row.entry.happenedOn, row.entry.happenedUntil)}
                    </span>
                    {row.entry.placeName && <span className="truncate">{row.entry.placeName}</span>}
                    {row.entry.photoCount > 0 && (
                      <span>
                        {row.entry.photoCount} photo{row.entry.photoCount === 1 ? "" : "s"}
                      </span>
                    )}
                    {row.entry.isMilestone && <span className="text-sindoor">milestone</span>}
                    {row.entry.noteCount === 2 && <span className="text-marigold">both sides</span>}
                  </div>

                  <h3 className="display mt-1.5 text-[1.6rem] transition-colors group-hover:text-sindoor sm:text-[2rem]">
                    {row.entry.title}
                  </h3>
                  {row.entry.subtitle && (
                    <p className="mt-1 max-w-prose text-sm text-ink-soft">{row.entry.subtitle}</p>
                  )}
                </div>

                {row.entry.coverThumbKey && (
                  <Photo
                    objectKey={row.entry.coverThumbKey}
                    blurhash={row.entry.coverBlurhash}
                    alt={row.entry.title}
                    ratio={1}
                    className="tilt h-20 w-20 shrink-0 rounded-sm sm:h-28 sm:w-28"
                  />
                )}
              </Link>
            </li>
          ),
        )}

        {/* the last entry is always the unwritten one */}
        <li className="reveal relative">
          <span
            aria-hidden
            className={`${NODE} top-[0.55rem] block h-[11px] w-[11px] rounded-full border-2 border-dashed border-haze bg-paper`}
          />
          <div className="opacity-45">
            <div className="mono text-[0.6875rem] text-ink-soft">someday</div>
            <h3 className="display mt-1.5 text-[1.6rem] sm:text-[2rem]">
              {futureYear} — this one isn&apos;t written yet
            </h3>
          </div>
        </li>
      </ol>
    </div>
  );
}
