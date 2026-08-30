import Link from "next/link";
import Counters from "@/components/Counters";
import Thread from "@/components/Thread";
import Photo from "@/components/Photo";
import OnThisDay from "@/components/OnThisDay";
import HeroImage from "@/components/HeroImage";
import BothSidesShowcase from "@/components/BothSidesShowcase";
import { auth } from "@/lib/auth";
import { requirePage } from "@/lib/guard";
import { unlockedForSetup } from "@/lib/people";
import { formatCount, prettyDate, daysUntil } from "@/lib/dates";
import {
  getCounters,
  getFirsts,
  getLetters,
  getOnThisDay,
  getStats,
  getThread,
} from "@/lib/queries";
import { COPY } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.handle);
  const unlocked = unlockedForSetup();
  const me = await requirePage();

  const [counters, thread, stats, firsts, letters, onThisDay] = await Promise.all([
    getCounters(),
    getThread(),
    getStats(),
    getFirsts(),
    getLetters(),
    getOnThisDay(),
  ]);

  return (
    <main>
      {/* ── 1. hero ─────────────────────────────────────────── */}
      <section className="relative">
        <HeroImage />
        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-16 sm:pb-20 sm:pt-24">
          <p className="eyebrow reveal">{COPY.heroEyebrow}</p>
          <h1 className="display reveal mt-4 text-[clamp(3rem,13vw,9rem)]" style={{ ["--reveal-delay" as string]: "60ms" }}>
            manno <em>weds</em> momo
          </h1>
          <p
            className="reveal mt-5 max-w-md text-lg text-ink-soft"
            style={{ ["--reveal-delay" as string]: "120ms" }}
          >
            {COPY.heroSub}
          </p>
          <div className="reveal mt-9" style={{ ["--reveal-delay" as string]: "180ms" }}>
            <Counters counters={counters} />
          </div>
          <p className="mono reveal mt-3 text-[0.6875rem] text-ink-soft">{COPY.heroCaption}</p>

          {!signedIn ? (
            <div className="reveal mt-8 flex flex-wrap items-center gap-3" style={{ ["--reveal-delay" as string]: "240ms" }}>
              <Link href="/signin" className="btn btn-primary">
                sign in
              </Link>
              {unlocked && (
                <p className="mono text-[0.6875rem] text-ink-soft">
                  no password set yet — you&apos;re browsing unlocked
                </p>
              )}
            </div>
          ) : (
            <div className="reveal mt-8 flex flex-wrap items-center gap-3" style={{ ["--reveal-delay" as string]: "240ms" }}>
              <Link href="/new" className="btn btn-primary">
                add a memory
              </Link>
              <Link href={`/picks?who=${me.handle}`} className="btn btn-ghost">
                {me.handle}&apos;s picks
              </Link>
              <span className="mono text-[0.6875rem]" style={{ color: me.accent }}>
                signed in as {me.handle}
              </span>
            </div>
          )}
        </div>
      </section>

      {onThisDay.length > 0 && <OnThisDay entries={onThisDay} />}

      {/* ── 2. the count ────────────────────────────────────── */}
      <Section eyebrow={COPY.countEyebrow}>
        <h2 className="display max-w-3xl text-[clamp(2.25rem,7vw,4.5rem)]">
          we&apos;ve taken {stats.photos > 0 ? formatCount(stats.photos) : "eleven thousand"} photos.{" "}
          <em>we&apos;ve printed three.</em>
        </h2>
        <dl className="mt-10 grid grid-cols-2 gap-y-8 sm:grid-cols-4">
          <Stat label="memories" value={formatCount(stats.memories)} />
          <Stat label="photos kept" value={formatCount(stats.photos)} />
          <Stat label="versions written" value={formatCount(stats.notes)} />
          <Stat label="places" value={formatCount(stats.cities)} />
        </dl>
        <p className="mt-8 max-w-lg text-ink-soft">{COPY.countBody}</p>
      </Section>

      {/* ── 3. how this works ───────────────────────────────── */}
      <Section eyebrow="how this works" bordered>
        <h2 className="display max-w-2xl text-[clamp(2rem,6vw,3.75rem)]">how this works</h2>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-sm border border-haze bg-haze sm:grid-cols-2 lg:grid-cols-4">
          {COPY.steps.map((step, i) => (
            <li key={step} className="reveal bg-paper p-6" style={{ ["--reveal-delay" as string]: `${i * 70}ms` }}>
              <span className="mono text-[0.6875rem] text-marigold">0{i + 1}</span>
              <p className="mt-3 text-[0.95rem] leading-snug">{step}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── 4. both sides — the signature section ────────────── */}
      <BothSidesShowcase viewerId={me.id} />

      {/* ── 5. the thread ───────────────────────────────────── */}
      <Section eyebrow={COPY.threadEyebrow} id="thread" bordered>
        <h2 className="display max-w-2xl text-[clamp(2rem,6vw,3.75rem)]">
          every day, threaded. <em>nothing lost.</em>
        </h2>

        <div className="mt-12">
          {thread.length === 0 ? (
            <Empty />
          ) : (
            <Thread entries={thread} />
          )}
        </div>
      </Section>

      {/* ── 6. the firsts ───────────────────────────────────── */}
      <Section eyebrow="the firsts" bordered>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="display text-[clamp(2rem,6vw,3.75rem)]">
            the first <em>everything</em>
          </h2>
          <Link href="/firsts" className="eyebrow underline underline-offset-4 hover:text-ink">
            all of them →
          </Link>
        </div>

        {firsts.length === 0 ? (
          <p className="mt-8 text-ink-soft">the list is empty. add one on the firsts page.</p>
        ) : (
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {firsts.slice(0, 8).map((f, i) => (
              <li key={f.id} className="reveal" style={{ ["--reveal-delay" as string]: `${i * 50}ms` }}>
                <Link href={f.memorySlug ? `/m/${f.memorySlug}` : "/firsts"} className="group block">
                  <Photo
                    objectKey={f.thumbKey}
                    alt={f.label}
                    ratio={1}
                    className="tilt aspect-square w-full rounded-sm"
                  />
                  <p className="mt-2 text-sm transition-colors group-hover:text-sindoor">{f.label}</p>
                  {f.happenedOn && <p className="mono text-[0.625rem] text-ink-soft">{prettyDate(f.happenedOn)}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── 7. sealed ───────────────────────────────────────── */}
      <Section eyebrow="sealed" bordered>
        <h2 className="display max-w-2xl text-[clamp(2rem,6vw,3.75rem)]">
          some of this <em>isn&apos;t for now</em>
        </h2>
        <p className="mt-6 max-w-lg text-ink-soft">{COPY.sealedBody}</p>
        <p className="mono mt-8 text-sm">
          {letters.sealed.length === 0 ? (
            <>nothing sealed yet.</>
          ) : (
            <>
              {letters.sealed.length} letter{letters.sealed.length === 1 ? "" : "s"} sealed
              {letters.nextUnlock && (
                <>
                  {" · "}the next one opens {prettyDate(letters.nextUnlock)}
                  <span className="text-ink-soft"> ({formatCount(daysUntil(letters.nextUnlock))} days)</span>
                </>
              )}
            </>
          )}
        </p>
        <Link href="/letters" className="btn btn-ghost mt-7">
          seal one →
        </Link>
      </Section>

      {/* ── 8. a note from us ───────────────────────────────── */}
      <Section eyebrow="a note from us" bordered>
        <div className="grid gap-10 sm:grid-cols-2">
          <NoteFromUs handle="manno" accent="#2E5E4E" body={COPY.noteFromManno} />
          <NoteFromUs handle="momo" accent="#9B3B66" body={COPY.noteFromMomo} />
        </div>
      </Section>

      {/* ── 9. footer ───────────────────────────────────────── */}
      <footer className="hairline mt-8">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <Counters counters={counters} />
          <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">{COPY.footer}</p>
              <p className="display mt-3 text-[1.75rem]">{COPY.footerSignoff}</p>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <span className="deva text-2xl text-sindoor">मन्नो</span>
              <Link href="/map" className="eyebrow underline underline-offset-4">
                the map →
              </Link>
              <Link href="/picks?who=manno" className="eyebrow underline underline-offset-4">
                our picks →
              </Link>
              <Link href={`/print/${new Date().getFullYear()}`} className="eyebrow underline underline-offset-4">
                print {new Date().getFullYear()} →
              </Link>
              <Link href="/export" className="eyebrow underline underline-offset-4">
                export everything →
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Section({
  children,
  eyebrow,
  id,
  bordered = false,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  id?: string;
  bordered?: boolean;
}) {
  return (
    <section id={id} className={`${bordered ? "hairline" : ""} scroll-mt-16`}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        {eyebrow && <p className="eyebrow reveal mb-5">{eyebrow}</p>}
        <div className="reveal">{children}</div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mono mt-1.5 text-3xl">{value}</dd>
    </div>
  );
}

function NoteFromUs({ handle, accent, body }: { handle: string; accent: string; body: string }) {
  return (
    <div className="reveal">
      <span className="mono text-[0.6875rem] lowercase tracking-[0.16em]" style={{ color: accent }}>
        {handle}
      </span>
      <p className="mt-3 max-w-prose leading-relaxed">{body}</p>
    </div>
  );
}

function Empty() {
  return (
    <div className="card rounded-sm px-6 py-16 text-center">
      <p className="display text-2xl">{COPY.empty}</p>
      <Link href="/new" className="btn btn-primary mt-6">
        add the first one
      </Link>
    </div>
  );
}
