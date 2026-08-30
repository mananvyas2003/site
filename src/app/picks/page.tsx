import Link from "next/link";
import Photo from "@/components/Photo";
import { requirePage } from "@/lib/guard";
import { getPicksFor } from "@/lib/queries";
import { PEOPLE, type Handle } from "@/lib/people";
import { prettyDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Starring is per-person, so these two views come for free (PRD §4.3). */
export default async function PicksPage({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  await requirePage();
  const { who } = await searchParams;
  const handle: Handle = who === "momo" ? "momo" : "manno";
  const picks = await getPicksFor(handle);
  const person = PEOPLE[handle];

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
      <p className="eyebrow">picks</p>
      <h1 className="display mt-3 text-[clamp(2rem,7vw,3.5rem)]" style={{ color: person.accent }}>
        {handle}&apos;s picks
      </h1>

      <div className="mt-5 flex gap-4">
        {(Object.keys(PEOPLE) as Handle[]).map((h) => (
          <Link
            key={h}
            href={`/picks?who=${h}`}
            className="eyebrow underline underline-offset-4"
            style={h === handle ? { color: PEOPLE[h].accent } : undefined}
          >
            {h}
          </Link>
        ))}
      </div>

      {picks.length === 0 ? (
        <p className="mt-10 text-ink-soft">nothing starred yet. tap the star on a photo.</p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {picks.map((p) => (
            <li key={p.id} className="reveal">
              <Link href={`/m/${p.slug}`} className="group block">
                <Photo
                  objectKey={p.thumbKey}
                  blurhash={p.blurhash}
                  alt={p.caption ?? p.title}
                  ratio={1}
                  className="tilt aspect-square w-full rounded-sm"
                />
                <p className="mt-2 truncate text-sm transition-colors group-hover:text-sindoor">{p.title}</p>
                <p className="mono text-[0.625rem] text-ink-soft">{prettyDate(p.happenedOn)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
