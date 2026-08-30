import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql, and } from "drizzle-orm";
import { getDb } from "@/db";
import { media, memories } from "@/db/schema";
import { requireApi } from "@/lib/guard";
import { deleteObject } from "@/lib/r2";

export const runtime = "nodejs";

const Body = z.object({
  memoryId: z.string().uuid(),
  mediaId: z.string().uuid(),
  kind: z.enum(["photo", "voice"]).default("photo"),
  thumbKey: z.string().min(1),
  webKey: z.string().min(1),
  mime: z.string().min(1),
  width: z.number().int().nullish(),
  height: z.number().int().nullish(),
  bytes: z.number().int().nullish(),
  durationSec: z.number().int().nullish(),
  blurhash: z.string().nullish(),
  caption: z.string().max(400).nullish(),
  takenAt: z.string().datetime().nullish(),
  sortOrder: z.number().int().default(0),
});

/** Records the row after the browser has finished putting the bytes in R2. */
export async function POST(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad input" }, { status: 400 });
  }
  const b = parsed.data;

  const [row] = await db
    .insert(media)
    .values({
      id: b.mediaId,
      memoryId: b.memoryId,
      kind: b.kind,
      thumbKey: b.thumbKey,
      webKey: b.webKey,
      mime: b.mime,
      width: b.width ?? null,
      height: b.height ?? null,
      bytes: b.bytes ?? null,
      durationSec: b.durationSec ?? null,
      blurhash: b.blurhash ?? null,
      caption: b.caption ?? null,
      takenAt: b.takenAt ? new Date(b.takenAt) : null,
      uploadedBy: me.id,
      sortOrder: b.sortOrder,
    })
    .returning();

  // first photo in becomes the cover, so the thread never shows a blank card
  if (b.kind === "photo") {
    await db
      .update(memories)
      .set({ coverMediaId: row.id, updatedAt: new Date() })
      .where(and(eq(memories.id, b.memoryId), sql`${memories.coverMediaId} is null`));
  }

  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  await db.update(memories).set({ coverMediaId: null }).where(eq(memories.coverMediaId, id));
  await db.delete(media).where(eq(media.id, id));

  await deleteObject(row.thumbKey);
  await deleteObject(row.webKey);
  if (row.origKey) await deleteObject(row.origKey);

  return NextResponse.json({ ok: true });
}
