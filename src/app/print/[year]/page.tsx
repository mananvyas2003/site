import { notFound } from "next/navigation";
import Photo from "@/components/Photo";
import PrintButton from "@/components/PrintButton";
import SiteTitle from "@/components/SiteTitle";
import { requirePage } from "@/lib/guard";
import { prettyRange } from "@/lib/dates";
import { getCounters, getMemoryMedia, getMemoryNotes, getThreadForYear, getUsers } from "@/lib/queries";
import { daysSince, formatCount } from "@/lib/dates";
import { COPY } from "@/lib/copy";

export const dynamic = "force-dynamic";

/**
 * The year in A5. No headless chrome, no print service — you open this and
 * hit Cmd-P → Save as PDF, then take the file to a press in Indore.
 *
 * Everything on this page is unlocked: by December, 48 hours have long passed
 * on every note in the book.
 */
export default async function PrintYear({ params }: { params: Promise<{ year: string }> }) {
  await requirePage();
  const { year: raw } = await params;
  const year = Number(raw);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) notFound();

  const [entries, users, counters] = await Promise.all([getThreadForYear(year), getUsers(), getCounters()]);

  const pages = await Promise.all(
    entries.map(async (e) => ({
      entry: e,
      media: (await getMemoryMedia(e.id)).filter((m) => m.kind === "photo"),
      notes: await getMemoryNotes(e.id),
    })),
  );

  const photoCount = pages.reduce((n, p) => n + p.media.length, 0);

  return (
    <main className="mx-auto max-w-[148mm] px-6 py-10 print:max-w-none print:px-0 print:py-0">
      <PrintButton year={year} />

      {/* ── title page ─────────────────────────────────────── */}
      <section className="page-break flex min-h-[70vh] flex-col justify-between print:min-h-[calc(210mm-28mm)]">
        <div>
          <p className="eyebrow">{year}</p>
          <h1 className="display mt-4 text-[3.2rem] leading-[0.9]">
            <SiteTitle />
          </h1>
          <p className="mt-4 text-sm text-ink-soft">{COPY.heroSub}</p>
        </div>

        <div>
          <div className="mono space-y-1 text-[0.6875rem]">
            {counters.map((c) => (
              <div key={c.key}>
                {c.label} · day {formatCount(daysSince(c.startDate, new Date(`${year}-12-31T00:00:00Z`)))}
              </div>
            ))}
          </div>
          <p className="mono mt-6 text-[0.625rem] text-ink-soft">
            {entries.length} days · {photoCount} photos · {COPY.footer}
          </p>
        </div>
      </section>

      {/* ── one spread per day ─────────────────────────────── */}
      {pages.map(({ entry, media, notes }, i) => (
        <section key={entry.id} className="page-break pt-10 print:pt-0">
          <div className="mono flex items-baseline justify-between text-[0.625rem] text-ink-soft">
            <span>{prettyRange(entry.happenedOn, entry.happenedUntil)}</span>
            <span>page {String(i + 1).padStart(3, "0")}</span>
          </div>

          <h2 className="display mt-2 text-[2rem] leading-tight">{entry.title}</h2>
          {entry.subtitle && <p className="mt-1.5 text-sm text-ink-soft">{entry.subtitle}</p>}
          {(entry.placeName || entry.city) && (
            <p className="mono mt-1 text-[0.625rem] text-ink-soft">
              {[entry.placeName, entry.city].filter(Boolean).join(" · ")}
            </p>
          )}

          {media.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 avoid-break">
              {media.slice(0, 6).map((m) => (
                <Photo
                  key={m.id}
                  objectKey={m.webKey}
                  blurhash={m.blurhash}
                  alt={m.caption ?? entry.title}
                  ratio={1}
                  className="aspect-square w-full rounded-sm"
                />
              ))}
            </div>
          )}

          {notes.length > 0 && (
            <div className="mt-5 grid gap-4 grid-cols-2 avoid-break">
              {notes.map((n) => {
                const u = users.find((x) => x.id === n.authorId);
                return (
                  <div key={n.id} className="border-l-2 pl-3" style={{ borderColor: u?.accent ?? "#D9CFBE" }}>
                    <span className="mono text-[0.625rem]" style={{ color: u?.accent }}>
                      {u?.handle ?? ""}
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-[0.8rem] leading-relaxed">{n.body}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}

      {entries.length === 0 && (
        <p className="mt-10 text-ink-soft">nothing happened in {year}. or nothing got written down.</p>
      )}

      {/* ── colophon ───────────────────────────────────────── */}
      <section className="pt-10">
        <p className="display text-2xl">{COPY.footerSignoff}</p>
        <p className="mono mt-2 text-[0.625rem] text-ink-soft">{COPY.footer}</p>
      </section>
    </main>
  );
}
