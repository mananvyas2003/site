import { sql } from "drizzle-orm";
import { safeQuery } from "@/db";
import { UNLOCK_AFTER_MS } from "./notes-visibility";
import { daysUntil, istToday, prettyDate } from "./dates";
import { getLetters, getOnThisDay, type ThreadEntry } from "./queries";
import { getUnreadInboxCount } from "./inbox";

export type TurnMemory = ThreadEntry & {
  theirNoteAt: string | null;
  unlocksAt: string | null;
};

export type YourTurn = {
  /** Memories where you haven't written your version yet. */
  missingSide: TurnMemory[];
  /** They wrote theirs; you haven't — still locked until you write or 48h pass. */
  lockedFromThem: TurnMemory[];
  /** Today's prompt memory, if any (kind = prompt). Ships with daily question. */
  todayPrompt: TurnMemory | null;
  onThisDay: ThreadEntry[];
  nextLetterUnlock: string | null;
  daysUntilLetter: number | null;
  unreadInbox: number;
};

function mapTurn(rows: Record<string, unknown>[], otherId: string): TurnMemory[] {
  const now = Date.now();
  return rows.map((r) => {
    const theirNoteAt = r.their_note_at ? new Date(String(r.their_note_at)) : null;
    const unlocksAt =
      theirNoteAt && now < theirNoteAt.getTime() + UNLOCK_AFTER_MS
        ? new Date(theirNoteAt.getTime() + UNLOCK_AFTER_MS)
        : null;
    void otherId;
    return {
      id: String(r.id),
      slug: String(r.slug),
      title: String(r.title),
      subtitle: (r.subtitle as string) ?? null,
      kind: String(r.kind),
      happenedOn: String(r.happened_on).slice(0, 10),
      happenedUntil: r.happened_until ? String(r.happened_until).slice(0, 10) : null,
      placeName: (r.place_name as string) ?? null,
      city: (r.city as string) ?? null,
      isMilestone: Boolean(r.is_milestone),
      photoCount: Number(r.photo_count ?? 0),
      coverThumbKey: (r.cover_thumb_key as string) ?? null,
      coverBlurhash: (r.cover_blurhash as string) ?? null,
      noteCount: Number(r.note_count ?? 0),
      theirNoteAt: theirNoteAt?.toISOString() ?? null,
      unlocksAt: unlocksAt?.toISOString() ?? null,
    };
  });
}

const turnSelect = (otherId: string) => sql`
  select
    m.id, m.slug, m.title, m.subtitle, m.kind,
    m.happened_on, m.happened_until, m.place_name, m.city, m.is_milestone,
    (select count(*)::int from media x where x.memory_id = m.id and x.kind = 'photo') as photo_count,
    (select count(*)::int from notes n where n.memory_id = m.id) as note_count,
    coalesce(
      (select x.thumb_key from media x where x.id = m.cover_media_id),
      (select x.thumb_key from media x where x.memory_id = m.id and x.kind = 'photo' order by x.sort_order, x.created_at limit 1)
    ) as cover_thumb_key,
    coalesce(
      (select x.blurhash from media x where x.id = m.cover_media_id),
      (select x.blurhash from media x where x.memory_id = m.id and x.kind = 'photo' order by x.sort_order, x.created_at limit 1)
    ) as cover_blurhash,
    (select n.created_at from notes n where n.memory_id = m.id and n.author_id = ${otherId} limit 1) as their_note_at
  from memories m
`;

/** Per-person inbox — the daily-return engine's to-do list. */
export async function getYourTurn(viewerId: string, otherId: string | null): Promise<YourTurn> {
  const [onThisDay, letters, unreadInbox] = await Promise.all([
    getOnThisDay(),
    getLetters(),
    getUnreadInboxCount(viewerId),
  ]);
  const nextLetterUnlock = letters.nextUnlock;
  const daysUntilLetter = nextLetterUnlock ? daysUntil(nextLetterUnlock) : null;

  if (!otherId) {
    return {
      missingSide: [],
      lockedFromThem: [],
      todayPrompt: null,
      onThisDay,
      nextLetterUnlock,
      daysUntilLetter,
      unreadInbox,
    };
  }

  const [missingSide, lockedFromThem, todayPrompt] = await Promise.all([
    safeQuery(async (db) => {
      const rows = await db.execute(
        sql`${turnSelect(otherId)}
            where m.kind <> 'prompt'
              and not exists (
                select 1 from notes n where n.memory_id = m.id and n.author_id = ${viewerId}
              )
            order by m.happened_on desc
            limit 40`,
      );
      return mapTurn(rows.rows as Record<string, unknown>[], otherId);
    }, [] as TurnMemory[]),

    safeQuery(async (db) => {
      const rows = await db.execute(
        sql`${turnSelect(otherId)}
            where m.kind <> 'prompt'
              and exists (
                select 1 from notes n
                where n.memory_id = m.id and n.author_id = ${otherId}
                  and n.created_at > now() - interval '48 hours'
              )
              and not exists (
                select 1 from notes n2 where n2.memory_id = m.id and n2.author_id = ${viewerId}
              )
            order by (
              select n.created_at from notes n
              where n.memory_id = m.id and n.author_id = ${otherId}
              limit 1
            ) desc
            limit 20`,
      );
      return mapTurn(rows.rows as Record<string, unknown>[], otherId);
    }, [] as TurnMemory[]),

    safeQuery(async (db) => {
      const today = istToday();
      const rows = await db.execute(
        sql`${turnSelect(otherId)}
            where m.kind = 'prompt' and m.happened_on = ${today}
              and not exists (
                select 1 from notes n where n.memory_id = m.id and n.author_id = ${viewerId}
              )
            limit 1`,
      );
      const mapped = mapTurn(rows.rows as Record<string, unknown>[], otherId);
      return mapped[0] ?? null;
    }, null as TurnMemory | null),
  ]);

  return {
    missingSide,
    lockedFromThem,
    todayPrompt,
    onThisDay,
    nextLetterUnlock,
    daysUntilLetter,
    unreadInbox,
  };
}

/** Top line for /you and the 9pm push — first item that needs attention. */
export function yourTurnHeadline(turn: YourTurn, otherHandle: string, unreadInbox = turn.unreadInbox): string {
  if (unreadInbox > 0) {
    return unreadInbox === 1
      ? `${otherHandle} left you something — open your inbox`
      : `${unreadInbox} things waiting in your inbox`;
  }
  if (turn.todayPrompt) return `today's question is waiting for your answer`;
  if (turn.lockedFromThem[0]) {
    return `${otherHandle} wrote ${turn.lockedFromThem[0].title.toLowerCase()} — write yours to unlock`;
  }
  if (turn.missingSide[0]) {
    const n = turn.missingSide.length;
    return n === 1
      ? `"${turn.missingSide[0].title.toLowerCase()}" still needs your version`
      : `${n} memories still need your version`;
  }
  if (turn.onThisDay[0]) return `on this day: ${turn.onThisDay[0].title.toLowerCase()}`;
  if (turn.nextLetterUnlock && turn.daysUntilLetter !== null) {
    return `next letter opens ${prettyDate(turn.nextLetterUnlock)} (${turn.daysUntilLetter} days)`;
  }
  return "nothing waiting. that's rare.";
}
