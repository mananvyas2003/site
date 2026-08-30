import Link from "next/link";
import BothSides, { type WireSide } from "./BothSides";
import Photo from "./Photo";
import { prettyRange } from "@/lib/dates";
import { getMemoryMedia, getMemoryNotes, getThread, getUsers } from "@/lib/queries";
import { resolveSides, redactForWire } from "@/lib/notes-visibility";
import { PEOPLE } from "@/lib/people";
import { COPY } from "@/lib/copy";

/**
 * Section 4 of the home page — one memory shown expanded, with both versions
 * side by side. Picks the most recent memory that has two notes, because that
 * is the one that demonstrates the idea; falls back to any memory with one.
 */
export default async function BothSidesShowcase({ viewerId }: { viewerId: string }) {
  const thread = await getThread(80);
  const featured = thread.find((e) => e.noteCount === 2) ?? thread.find((e) => e.noteCount === 1) ?? null;

  const users = await getUsers();
  const me = users.find((u) => u.id === viewerId) ?? null;
  const them = users.find((u) => u.id !== viewerId) ?? null;

  let mine: WireSide = { state: "empty" };
  let theirs: WireSide = { state: "empty" };
  let media: Awaited<ReturnType<typeof getMemoryMedia>> = [];

  if (featured) {
    const [notes, mediaRows] = await Promise.all([
      getMemoryNotes(featured.id),
      getMemoryMedia(featured.id),
    ]);
    media = mediaRows;
    const sides = resolveSides(notes, viewerId, them?.id ?? null);
    mine = redactForWire(sides.mine) as WireSide;
    theirs = redactForWire(sides.theirs) as WireSide;
  }

  const mePerson = {
    handle: me?.handle ?? "manno",
    displayName: me?.displayName ?? PEOPLE.manno.displayName,
    accent: me?.accent ?? PEOPLE.manno.accent,
  };
  const themPerson = them
    ? { handle: them.handle, displayName: them.displayName, accent: them.accent }
    : null;

  return (
    <section className="hairline bg-paper-deep/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <p className="eyebrow reveal mb-5">{COPY.bothSidesEyebrow}</p>
        <h2 className="display reveal max-w-2xl text-[clamp(2rem,6vw,3.75rem)]">
          you remember it wrong. <em>so do i.</em>
        </h2>
        <p className="reveal mt-6 max-w-lg text-ink-soft">{COPY.bothSidesBody}</p>

        {!featured ? (
          <div className="reveal card mt-12 rounded-sm px-6 py-14 text-center">
            <p className="text-ink-soft">
              no memory has a written version yet. add one, write yours, and this section fills itself in.
            </p>
          </div>
        ) : (
          <div className="reveal mt-12">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mono text-[0.6875rem] text-ink-soft">
                  {prettyRange(featured.happenedOn, featured.happenedUntil)}
                  {featured.placeName ? ` · ${featured.placeName}` : ""}
                </div>
                <h3 className="display mt-1 text-[2rem]">{featured.title}</h3>
              </div>
              <Link href={`/m/${featured.slug}`} className="eyebrow underline underline-offset-4 hover:text-ink">
                open the day →
              </Link>
            </div>

            {media.length > 0 && (
              <div className="mb-7 flex gap-3 overflow-x-auto pb-2">
                {media.slice(0, 5).map((m) => (
                  <Photo
                    key={m.id}
                    objectKey={m.thumbKey}
                    blurhash={m.blurhash}
                    alt={m.caption ?? featured.title}
                    ratio={1}
                    className="tilt h-32 w-32 shrink-0 rounded-sm"
                  />
                ))}
              </div>
            )}

            <BothSides
              memoryId={featured.id}
              me={mePerson}
              them={themPerson}
              mine={mine}
              theirs={theirs}
              readOnly
            />
          </div>
        )}
      </div>
    </section>
  );
}
