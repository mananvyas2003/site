import Link from "next/link";
import Photo from "@/components/Photo";
import { requirePage } from "@/lib/guard";
import { prettyRange } from "@/lib/dates";
import { searchMemories } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Plain ILIKE over titles, notes and places. Hundreds of rows, not millions. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePage();
  const { q = "" } = await searchParams;
  const results = q ? await searchMemories(q) : [];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <p className="eyebrow">search</p>

      <form action="/search" className="mt-5 flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="a word, a place, a name"
          autoFocus
          className="field flex-1"
        />
        <button className="btn btn-primary">look</button>
      </form>

      {q && (
        <p className="mono mt-6 text-[0.6875rem] text-ink-soft">
          {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
        </p>
      )}

      <ul className="mt-6 divide-y divide-haze">
        {results.map((r) => (
          <li key={r.id}>
            <Link href={`/m/${r.slug}`} className="group flex items-center gap-4 py-4">
              {r.coverThumbKey && (
                <Photo
                  objectKey={r.coverThumbKey}
                  blurhash={r.coverBlurhash}
                  alt={r.title}
                  ratio={1}
                  className="h-14 w-14 shrink-0 rounded-sm"
                />
              )}
              <div className="min-w-0">
                <p className="display text-xl transition-colors group-hover:text-sindoor">{r.title}</p>
                <p className="mono text-[0.625rem] text-ink-soft">
                  {prettyRange(r.happenedOn, r.happenedUntil)}
                  {r.placeName ? ` · ${r.placeName}` : ""}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {q && results.length === 0 && <p className="mt-8 text-ink-soft">nothing matched. try fewer words.</p>}
    </main>
  );
}
