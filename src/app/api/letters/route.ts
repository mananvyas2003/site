import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { letters } from "@/db/schema";
import { requireApi } from "@/lib/guard";
import { istToday } from "@/lib/dates";
import { getLetters } from "@/lib/queries";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().trim().max(160).nullish(),
  body: z.string().trim().min(1).max(50_000),
  unlockOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const { title, body, unlockOn } = parsed.data;
  if (unlockOn <= istToday()) {
    return NextResponse.json({ error: "pick a date in the future — that's the point" }, { status: 400 });
  }

  const [row] = await db
    .insert(letters)
    .values({ authorId: me.id, title: title ?? null, body, unlockOn })
    .returning({ id: letters.id });

  return NextResponse.json({ ok: true, id: row.id });
}

/** Bodies for sealed letters are never in this response. */
export async function GET() {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });
  return NextResponse.json(await getLetters());
}

/** Stamps opened_at the first time an unlocked letter is actually read. */
export async function PATCH(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [row] = await db.select().from(letters).where(eq(letters.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (String(row.unlockOn).slice(0, 10) > istToday()) {
    return NextResponse.json({ error: "still sealed" }, { status: 403 });
  }
  if (!row.openedAt) {
    await db.update(letters).set({ openedAt: new Date() }).where(eq(letters.id, id));
  }

  return NextResponse.json({ ok: true });
}
