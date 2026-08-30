import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { safeQuery } from "@/db";
import { counters, firsts, letters, media, memories, notes, users } from "@/db/schema";
import { istToday } from "./dates";
import { PEOPLE, type Handle } from "./people";

export type ThreadEntry = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  kind: string;
  happenedOn: string;
  happenedUntil: string | null;
  placeName: string | null;
  city: string | null;
  isMilestone: boolean;
  photoCount: number;
  coverThumbKey: string | null;
  coverBlurhash: string | null;
  noteCount: number;
};

const THREAD_SELECT = sql`
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
    ) as cover_blurhash
  from memories m
`;

function mapThread(rows: Record<string, unknown>[]): ThreadEntry[] {
  return rows.map((r) => ({
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
  }));
}

/** The thread. Newest first — one direction, no toggle (PRD 4.4). */
export async function getThread(limit = 500): Promise<ThreadEntry[]> {
  return safeQuery(async (db) => {
    const rows = await db.execute(
      sql`${THREAD_SELECT} order by m.happened_on desc, m.created_at desc limit ${limit}`,
    );
    return mapThread(rows.rows as Record<string, unknown>[]);
  }, []);
}

export async function getThreadForYear(year: number): Promise<ThreadEntry[]> {
  return safeQuery(async (db) => {
    const rows = await db.execute(
      sql`${THREAD_SELECT} where extract(year from m.happened_on) = ${year} order by m.happened_on asc, m.created_at asc`,
    );
    return mapThread(rows.rows as Record<string, unknown>[]);
  }, []);
}

/** P1: on this day. One SQL query, disproportionate emotional payoff. */
export async function getOnThisDay(): Promise<ThreadEntry[]> {
  const today = istToday();
  const mmdd = today.slice(5, 10);
  return safeQuery(async (db) => {
    const rows = await db.execute(
      sql`${THREAD_SELECT}
          where to_char(m.happened_on, 'MM-DD') = ${mmdd}
            and extract(year from m.happened_on) <> ${Number(today.slice(0, 4))}
          order by m.happened_on desc`,
    );
    return mapThread(rows.rows as Record<string, unknown>[]);
  }, []);
}

export async function searchMemories(q: string): Promise<ThreadEntry[]> {
  if (!q.trim()) return [];
  const term = `%${q.trim()}%`;
  return safeQuery(async (db) => {
    const rows = await db.execute(
      sql`${THREAD_SELECT}
          where m.title ilike ${term}
             or m.subtitle ilike ${term}
             or m.place_name ilike ${term}
             or m.city ilike ${term}
             or exists (select 1 from notes n where n.memory_id = m.id and n.body ilike ${term})
          order by m.happened_on desc limit 100`,
    );
    return mapThread(rows.rows as Record<string, unknown>[]);
  }, []);
}

export async function getMemoryBySlug(slug: string) {
  return safeQuery(async (db) => {
    const rows = await db.select().from(memories).where(eq(memories.slug, slug)).limit(1);
    return rows[0] ?? null;
  }, null);
}

export async function getMemoryMedia(memoryId: string) {
  return safeQuery(
    (db) =>
      db
        .select()
        .from(media)
        .where(eq(media.memoryId, memoryId))
        .orderBy(asc(media.sortOrder), asc(media.createdAt)),
    [],
  );
}

export async function getMemoryNotes(memoryId: string) {
  return safeQuery((db) => db.select().from(notes).where(eq(notes.memoryId, memoryId)), []);
}

export async function getStarsFor(memoryId: string) {
  return safeQuery(
    async (db) => {
      const rows = await db.execute(
        sql`select s.media_id, s.user_id from stars s join media x on x.id = s.media_id where x.memory_id = ${memoryId}`,
      );
      return (rows.rows as Record<string, unknown>[]).map((r) => ({
        mediaId: String(r.media_id),
        userId: String(r.user_id),
      }));
    },
    [] as { mediaId: string; userId: string }[],
  );
}

export async function getUsers() {
  return safeQuery((db) => db.select().from(users), []);
}

export async function getOtherUser(viewerId: string) {
  const all = await getUsers();
  return all.find((u) => u.id !== viewerId) ?? null;
}

export type CounterRow = { key: string; label: string; startDate: string };

const COUNTER_ENV: Record<string, { label: string; env: string }> = {
  met: { label: "met", env: "COUNTER_MET" },
  friends: { label: "best friends", env: "COUNTER_FRIENDS" },
  together: { label: "together", env: "COUNTER_TOGETHER" },
};

/** DB first, env as the fallback so counters work before you seed. */
export async function getCounters(): Promise<CounterRow[]> {
  const fromDb = await safeQuery((db) => db.select().from(counters), []);
  const byKey = new Map(fromDb.map((c) => [c.key, c]));
  const out: CounterRow[] = [];
  for (const [key, meta] of Object.entries(COUNTER_ENV)) {
    const row = byKey.get(key);
    // trim: a stray space in front of a pasted date silently shifts the slice
    const startDate = String(row?.startDate ?? process.env[meta.env] ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}/.test(startDate)) continue;
    out.push({ key, label: row?.label ?? meta.label, startDate: startDate.slice(0, 10) });
  }
  return out;
}

export type FirstRow = {
  id: string;
  label: string;
  happenedOn: string | null;
  memoryId: string | null;
  memorySlug: string | null;
  memoryTitle: string | null;
  thumbKey: string | null;
  note: string | null;
  sortOrder: number;
};

export async function getFirsts(): Promise<FirstRow[]> {
  return safeQuery(
    async (db) => {
      const rows = await db.execute(
        sql`select f.*, m.slug as memory_slug, m.title as memory_title,
                   (select x.thumb_key from media x where x.memory_id = m.id order by x.sort_order limit 1) as thumb_key
            from firsts f left join memories m on m.id = f.memory_id
            order by f.sort_order asc, f.happened_on asc nulls last`,
      );
      return (rows.rows as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        label: String(r.label),
        happenedOn: r.happened_on ? String(r.happened_on).slice(0, 10) : null,
        memoryId: (r.memory_id as string) ?? null,
        memorySlug: (r.memory_slug as string) ?? null,
        memoryTitle: (r.memory_title as string) ?? null,
        thumbKey: (r.thumb_key as string) ?? null,
        note: (r.note as string) ?? null,
        sortOrder: Number(r.sort_order ?? 0),
      }));
    },
    [] as FirstRow[],
  );
}

/**
 * Sealed letters. Bodies are simply not returned until unlock_on <= today —
 * the withholding happens here, at the query, never in the client.
 */
export async function getLetters() {
  const today = istToday();
  const rows = await safeQuery((db) => db.select().from(letters).orderBy(asc(letters.unlockOn)), []);
  const open = rows
    .filter((l) => String(l.unlockOn).slice(0, 10) <= today)
    .map((l) => ({ ...l, unlockOn: String(l.unlockOn).slice(0, 10) }));
  const sealed = rows
    .filter((l) => String(l.unlockOn).slice(0, 10) > today)
    .map((l) => ({
      id: l.id,
      authorId: l.authorId,
      unlockOn: String(l.unlockOn).slice(0, 10),
      createdAt: l.createdAt,
    }));
  return { open, sealed, nextUnlock: sealed[0]?.unlockOn ?? null };
}

export type MapPin = {
  slug: string;
  title: string;
  lat: number | null;
  lng: number | null;
  placeName: string | null;
  happenedOn: string;
};

export async function getMapPins(): Promise<MapPin[]> {
  return safeQuery(
    async (db) => {
      const rows = await db
        .select({
          slug: memories.slug,
          title: memories.title,
          lat: memories.lat,
          lng: memories.lng,
          placeName: memories.placeName,
          happenedOn: memories.happenedOn,
        })
        .from(memories)
        .where(and(isNotNull(memories.lat), isNotNull(memories.lng)))
        .orderBy(desc(memories.happenedOn));
      return rows.map((r) => ({ ...r, happenedOn: String(r.happenedOn).slice(0, 10) }));
    },
    [] as MapPin[],
  );
}

export type Pick = {
  id: string;
  thumbKey: string;
  blurhash: string | null;
  caption: string | null;
  slug: string;
  title: string;
  happenedOn: string;
};

export async function getPicksFor(handle: Handle): Promise<Pick[]> {
  return safeQuery(
    async (db) => {
      const rows = await db.execute(
        sql`select x.id, x.thumb_key, x.blurhash, x.caption, m.slug, m.title, m.happened_on
            from stars s
            join media x on x.id = s.media_id
            join users u on u.id = s.user_id
            join memories m on m.id = x.memory_id
            where u.handle = ${handle}
            order by m.happened_on desc, x.sort_order asc`,
      );
      return (rows.rows as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        thumbKey: String(r.thumb_key),
        blurhash: (r.blurhash as string) ?? null,
        caption: (r.caption as string) ?? null,
        slug: String(r.slug),
        title: String(r.title),
        happenedOn: String(r.happened_on).slice(0, 10),
      }));
    },
    [] as Pick[],
  );
}

/** Stats for the hero and "the count" section. */
export async function getStats() {
  return safeQuery(
    async (db) => {
      const rows = await db.execute(
        sql`select
              (select count(*)::int from memories) as memories,
              (select count(*)::int from media where kind = 'photo') as photos,
              (select count(*)::int from media where kind = 'voice') as voices,
              (select count(*)::int from notes) as notes,
              (select count(*)::int from letters) as letters,
              (select count(distinct city)::int from memories where city is not null) as cities,
              (select min(happened_on) from memories) as first_day`,
      );
      const r = (rows.rows[0] ?? {}) as Record<string, unknown>;
      return {
        memories: Number(r.memories ?? 0),
        photos: Number(r.photos ?? 0),
        voices: Number(r.voices ?? 0),
        notes: Number(r.notes ?? 0),
        letters: Number(r.letters ?? 0),
        cities: Number(r.cities ?? 0),
        firstDay: r.first_day ? String(r.first_day).slice(0, 10) : null,
      };
    },
    { memories: 0, photos: 0, voices: 0, notes: 0, letters: 0, cities: 0, firstDay: null as string | null },
  );
}

export { PEOPLE };
