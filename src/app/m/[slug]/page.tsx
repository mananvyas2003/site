import Link from "next/link";
import { notFound } from "next/navigation";
import BothSides, { type WireSide } from "@/components/BothSides";
import Gallery from "@/components/Gallery";
import VoiceNotes from "@/components/VoiceNotes";
import MemoryActions from "@/components/MemoryActions";
import { requirePage } from "@/lib/guard";
import { prettyRange } from "@/lib/dates";
import { getMemoryBySlug, getMemoryMedia, getMemoryNotes, getStarsFor, getUsers } from "@/lib/queries";
import { redactForWire, resolveSides } from "@/lib/notes-visibility";
import { PEOPLE } from "@/lib/people";

export const dynamic = "force-dynamic";

export default async function MemoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await requirePage();

  const memory = await getMemoryBySlug(slug);
  if (!memory) notFound();

  const [mediaRows, noteRows, starRows, users] = await Promise.all([
    getMemoryMedia(memory.id),
    getMemoryNotes(memory.id),
    getStarsFor(memory.id),
    getUsers(),
  ]);

  const meRow = users.find((u) => u.id === me.id) ?? null;
  const them = users.find((u) => u.id !== me.id) ?? null;

  const sides = resolveSides(noteRows, me.id, them?.id ?? null);
  const mine = redactForWire(sides.mine) as WireSide;
  const theirs = redactForWire(sides.theirs) as WireSide;

  const photos = mediaRows.filter((m) => m.kind === "photo");
  const voices = mediaRows.filter((m) => m.kind === "voice");

  const happenedOn = String(memory.happenedOn).slice(0, 10);
  const happenedUntil = memory.happenedUntil ? String(memory.happenedUntil).slice(0, 10) : null;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
      <Link href="/#thread" className="eyebrow no-print hover:text-ink">
        ← the thread
      </Link>

      <header className="mt-7">
        <div className="mono flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-ink-soft">
          <span className="rounded-sm bg-paper-deep px-1.5 py-0.5">{prettyRange(happenedOn, happenedUntil)}</span>
          {memory.placeName && <span>{memory.placeName}</span>}
          {memory.city && memory.city !== memory.placeName && <span>{memory.city}</span>}
          {memory.kind !== "day" && <span>{memory.kind}</span>}
          {memory.isMilestone && <span className="text-sindoor">milestone</span>}
        </div>

        <h1 className="display mt-3 text-[clamp(2.25rem,8vw,4.5rem)]">{memory.title}</h1>
        {memory.subtitle && <p className="mt-3 max-w-prose text-lg text-ink-soft">{memory.subtitle}</p>}
      </header>

      {photos.length > 0 && (
        <div className="mt-10">
          <Gallery
            photos={photos.map((p) => ({
              id: p.id,
              thumbKey: p.thumbKey,
              webKey: p.webKey,
              blurhash: p.blurhash,
              caption: p.caption,
              width: p.width,
              height: p.height,
            }))}
            stars={starRows}
            viewerId={me.id}
            users={users.map((u) => ({ id: u.id, handle: u.handle, accent: u.accent }))}
            title={memory.title}
          />
        </div>
      )}

      {voices.length > 0 && (
        <div className="mt-10">
          <VoiceNotes
            items={voices.map((v) => ({
              id: v.id,
              webKey: v.webKey,
              durationSec: v.durationSec,
              caption: v.caption,
              uploadedBy: v.uploadedBy,
            }))}
            users={users.map((u) => ({ id: u.id, handle: u.handle, accent: u.accent }))}
          />
        </div>
      )}

      <section className="mt-14">
        <h2 className="eyebrow mb-5">both sides</h2>
        <BothSides
          memoryId={memory.id}
          me={{
            handle: meRow?.handle ?? me.handle,
            displayName: meRow?.displayName ?? me.displayName,
            accent: meRow?.accent ?? PEOPLE[me.handle].accent,
          }}
          them={them ? { handle: them.handle, displayName: them.displayName, accent: them.accent } : null}
          mine={mine}
          theirs={theirs}
        />
      </section>

      <MemoryActions
        memoryId={memory.id}
        slug={memory.slug}
        title={memory.title}
        subtitle={memory.subtitle}
        happenedOn={happenedOn}
        happenedUntil={happenedUntil}
        placeName={memory.placeName}
        city={memory.city}
        kind={memory.kind}
        isMilestone={Boolean(memory.isMilestone)}
        lat={memory.lat}
        lng={memory.lng}
        photos={photos.map((p) => ({ id: p.id, thumbKey: p.thumbKey }))}
        coverMediaId={memory.coverMediaId}
      />
    </main>
  );
}
