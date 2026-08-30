import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { media, memories } from "@/db/schema";
import { requireApi } from "@/lib/guard";
import { deleteObject } from "@/lib/r2";

export const runtime = "nodejs";

const Patch = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  subtitle: z.string().trim().max(400).nullish(),
  kind: z.enum(["day", "date", "trip", "milestone", "call", "fight", "first"]).optional(),
  happenedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  happenedUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  placeName: z.string().trim().max(160).nullish(),
  city: z.string().trim().max(120).nullish(),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  isMilestone: z.boolean().optional(),
  coverMediaId: z.string().uuid().nullish(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const patch = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  const [row] = await db
    .update(memories)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(memories.id, id))
    .returning();

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, slug: row.slug });
}

/**
 * Deleting a memory drops its rows by cascade, but R2 objects have to go
 * explicitly — the bucket has no foreign keys.
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const { id } = await ctx.params;
  const rows = await db.select().from(media).where(eq(media.memoryId, id));

  await db.delete(memories).where(eq(memories.id, id));

  for (const m of rows) {
    await deleteObject(m.thumbKey);
    await deleteObject(m.webKey);
    if (m.origKey) await deleteObject(m.origKey);
  }

  return NextResponse.json({ ok: true });
}
