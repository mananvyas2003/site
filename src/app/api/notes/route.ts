import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { notes } from "@/db/schema";
import { requireApi } from "@/lib/guard";
import { getMemoryNotes, getOtherUser } from "@/lib/queries";
import { redactForWire, resolveSides } from "@/lib/notes-visibility";

export const runtime = "nodejs";

const Body = z.object({
  memoryId: z.string().uuid(),
  body: z.string().trim().min(1).max(20_000),
});

/**
 * Writing is never gated — only reading is. You can always add your version;
 * what you can't do is read hers before you've written yours.
 */
export async function POST(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "write something first" }, { status: 400 });

  const { memoryId, body } = parsed.data;

  await db
    .insert(notes)
    .values({ memoryId, authorId: me.id, body })
    .onConflictDoUpdate({
      target: [notes.memoryId, notes.authorId],
      // editing your note must not re-lock hers, so created_at is left alone
      set: { body, updatedAt: new Date() },
    });

  const rows = await getMemoryNotes(memoryId);
  const other = await getOtherUser(me.id);
  const sides = resolveSides(rows, me.id, other?.id ?? null);

  return NextResponse.json({
    ok: true,
    mine: redactForWire(sides.mine),
    theirs: redactForWire(sides.theirs),
  });
}

/** Reading through the API applies exactly the same gate as the page does. */
export async function GET(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const memoryId = new URL(req.url).searchParams.get("memoryId");
  if (!memoryId) return NextResponse.json({ error: "memoryId required" }, { status: 400 });

  const rows = await getMemoryNotes(memoryId);
  const other = await getOtherUser(me.id);
  const sides = resolveSides(rows, me.id, other?.id ?? null);

  return NextResponse.json({
    mine: redactForWire(sides.mine),
    theirs: redactForWire(sides.theirs),
  });
}

export async function DELETE(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const memoryId = new URL(req.url).searchParams.get("memoryId");
  if (!memoryId) return NextResponse.json({ error: "memoryId required" }, { status: 400 });

  // you can only ever delete your own version
  await db.delete(notes).where(and(eq(notes.memoryId, memoryId), eq(notes.authorId, me.id)));
  return NextResponse.json({ ok: true });
}
