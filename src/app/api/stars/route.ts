import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { stars } from "@/db/schema";
import { requireApi } from "@/lib/guard";

export const runtime = "nodejs";

const Body = z.object({ mediaId: z.string().uuid(), starred: z.boolean() });

export async function POST(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const { mediaId, starred } = parsed.data;

  if (starred) {
    await db.insert(stars).values({ mediaId, userId: me.id }).onConflictDoNothing();
  } else {
    await db.delete(stars).where(and(eq(stars.mediaId, mediaId), eq(stars.userId, me.id)));
  }

  return NextResponse.json({ ok: true });
}
