import Link from "next/link";
import Photo from "@/components/Photo";
import PushSubscribe from "@/components/PushSubscribe";
import { requirePage } from "@/lib/guard";
import { daysUntil, prettyDate } from "@/lib/dates";
import { getOtherUser } from "@/lib/queries";
import { OTHER } from "@/lib/people";
import { getYourTurn, yourTurnHeadline, type TurnMemory } from "@/lib/your-turn";
import { getUnreadInboxPreview, inboxKindLabel } from "@/lib/inbox";
import type { ThreadEntry } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function YouPage() {
  const me = await requirePage();
  const other = await getOtherUser(me.id);
  const otherHandle = other?.handle ?? OTHER[me.handle];
  const [turn, inboxPreview] = await Promise.all([
    getYourTurn(me.id, other?.id ?? null),
    getUnreadInboxPreview(me.id, 3),
  ]);
  const headline = yourTurnHeadline(turn, otherHandle);

  const hasWork =
    turn.missingSide.length > 0 ||
    turn.lockedFromThem.length > 0 ||
    turn.todayPrompt ||
    turn.onThisDay.length > 0 ||
    turn.unreadInbox > 0;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <p className="eyebrow">your turn</p>
      <h1 className="display mt-3 text-[clamp(2rem,7vw,3.5rem)]">
        what&apos;s <em>waiting</em>
      </h1>
      <p className="mono mt-4 text-sm text-ink-soft">{headline}</p>

      <div className="mt-8">
        <PushSubscribe />
      </div>

      {!hasWork && !turn.nextLetterUnlock ? (
        <div className="card mt-10 rounded-sm px-6 py-14 text-center">
          <p className="display text-2xl">nothing waiting.</p>
          <p className="mt-3 text-ink-soft">that&apos;s rare. go add something anyway.</p>
          <Link href="/new" className="btn btn-primary mt-6">
            add a memory
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {turn.unreadInbox > 0 && (
            <Section eyebrow={`inbox · ${turn.unreadInbox} new`}>
              <ul className="divide-y divide-haze border-y border-haze">
                {inboxPreview.map((msg) => (
                  <li key={msg.id}>
                    <Link href="/inbox" className="group flex items-center gap-3 py-4">
                      <span
                        className="mono rounded-sm px-2 py-1 text-[0.625rem]"
                        style={{ background: `${msg.authorAccent}18`, color: msg.authorAccent }}
                      >
                        {inboxKindLabel(msg.kind)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm group-hover:text-sindoor">
                        {msg.title ?? msg.body.slice(0, 60)}
                      </span>
                      <span className="eyebrow shrink-0">from {msg.authorHandle}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/inbox" className="btn btn-primary mt-4">
                open inbox
              </Link>
            </Section>
          )}

          {turn.todayPrompt && (
            <Section eyebrow="today's question">
              <TurnList items={[turn.todayPrompt]} accent={me.accent} locked />
            </Section>
          )}

          {turn.lockedFromThem.length > 0 && (
            <Section eyebrow={`${otherHandle} wrote — yours unlocks theirs`}>
              <p className="mb-5 max-w-prose text-sm text-ink-soft">
                {otherHandle} wrote {otherHandle === "momo" ? "hers" : "his"}. you can&apos;t read it until you write
                yours — or 48 hours pass.
              </p>
              <TurnList items={turn.lockedFromThem} accent={other?.accent ?? "#9B3B66"} locked />
            </Section>
          )}

          {turn.missingSide.length > 0 && (
            <Section eyebrow="your version missing">
              <TurnList items={turn.missingSide} accent={me.accent} />
            </Section>
          )}

          {turn.onThisDay.length > 0 && (
            <Section eyebrow="on this day">
              <TurnList items={turn.onThisDay} accent="#E8A317" />
            </Section>
          )}

          {turn.nextLetterUnlock && turn.daysUntilLetter !== null && (
            <Section eyebrow="sealed">
              <p className="mono text-sm">
                next letter opens {prettyDate(turn.nextLetterUnlock)}
                <span className="text-ink-soft"> · {daysUntil(turn.nextLetterUnlock)} days</span>
              </p>
              <Link href="/letters" className="btn btn-ghost mt-4">
                the letters →
              </Link>
            </Section>
          )}
        </div>
      )}
    </main>
  );
}

function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="eyebrow mb-5">{eyebrow}</p>
      {children}
    </section>
  );
}

function TurnList({
  items,
  accent,
  locked = false,
}: {
  items: Array<ThreadEntry | TurnMemory>;
  accent: string;
  locked?: boolean;
}) {
  return (
    <ul className="divide-y divide-haze border-y border-haze">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/m/${item.slug}`} className="group flex items-center gap-4 py-4">
            {item.coverThumbKey ? (
              <Photo
                objectKey={item.coverThumbKey}
                blurhash={item.coverBlurhash}
                alt={item.title}
                ratio={1}
                className="h-14 w-14 shrink-0 rounded-sm"
              />
            ) : (
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm text-xs lowercase"
                style={{ background: `${accent}18`, color: accent }}
              >
                {locked ? "lock" : "note"}
              </div>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm transition-colors group-hover:text-sindoor">
                {item.title}
              </span>
              <span className="mono block text-[0.625rem] text-ink-soft">
                {prettyDate(item.happenedOn)}
                {item.placeName ? ` · ${item.placeName}` : ""}
                {locked && "unlocksAt" in item && item.unlocksAt && (
                  <> · unlocks {new Date(item.unlocksAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</>
                )}
              </span>
            </span>
            <span className="eyebrow shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
              open →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
