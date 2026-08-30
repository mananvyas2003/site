import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { counters, firsts, letters, media, memories, notes, stars, users } from "@/db/schema";
import { requireApi } from "@/lib/guard";
import { istToday } from "@/lib/dates";

export const runtime = "nodejs";

/**
 * PRD §10, the highest-severity non-behavioural risk: this must never become
 * the only copy. Every row, plus every R2 key, in one file. Run it quarterly
 * and keep the result somewhere you both have.
 *
 * Notes and letters are exported in full, sealed ones included — an export is
 * a backup, not a reading surface, and a backup that withholds data is a
 * broken backup.
 */
export async function GET() {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const [u, m, md, n, s, f, l, c] = await Promise.all([
    db.select().from(users),
    db.select().from(memories),
    db.select().from(media),
    db.select().from(notes),
    db.select().from(stars),
    db.select().from(firsts),
    db.select().from(letters),
    db.select().from(counters),
  ]);

  const objectKeys = md.flatMap((row) => [row.thumbKey, row.webKey, row.origKey].filter(Boolean) as string[]);

  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: me.handle,
    schemaVersion: 1,
    counts: {
      users: u.length,
      memories: m.length,
      media: md.length,
      notes: n.length,
      stars: s.length,
      firsts: f.length,
      letters: l.length,
    },
    tables: { users: u, memories: m, media: md, notes: n, stars: s, firsts: f, letters: l, counters: c },
    // the bucket has no foreign keys; this list is how you verify a sync
    objectKeys,
    restoreHint:
      "rows restore with a plain insert. the image bytes live in R2 under these keys — mirror the bucket with `rclone sync r2:BUCKET ./photos` and keep the two together.",
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="manno-momo-${istToday()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
