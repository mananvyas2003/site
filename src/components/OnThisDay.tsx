import Link from "next/link";
import Photo from "./Photo";
import { prettyDate, istToday } from "@/lib/dates";
import type { ThreadEntry } from "@/lib/queries";

/** P1: one SQL query, disproportionate emotional payoff. */
export default function OnThisDay({ entries }: { entries: ThreadEntry[] }) {
  const thisYear = Number(istToday().slice(0, 4));

  return (
    <aside className="hairline border-b bg-paper-deep/70">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-4 px-5 py-5">
        <span className="eyebrow shrink-0">on this day</span>
        <ul className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-3">
          {entries.map((e) => (
            <li key={e.id}>
              <Link href={`/m/${e.slug}`} className="group flex items-center gap-3">
                {e.coverThumbKey && (
                  <Photo
                    objectKey={e.coverThumbKey}
                    blurhash={e.coverBlurhash}
                    alt={e.title}
                    ratio={1}
                    className="h-10 w-10 shrink-0 rounded-sm"
                  />
                )}
                <span>
                  <span className="block text-sm transition-colors group-hover:text-sindoor">{e.title}</span>
                  <span className="mono block text-[0.625rem] text-ink-soft">
                    {prettyDate(e.happenedOn)} · {thisYear - Number(e.happenedOn.slice(0, 4))} years ago
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
