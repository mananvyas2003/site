import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { memories } from "@/db/schema";
import { requireApi } from "@/lib/guard";
import { slugify, withSuffix } from "@/lib/slug";
import { istToday } from "@/lib/dates";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(400).nullish(),
  kind: z.enum(["day", "date", "trip", "milestone", "call", "fight", "first"]).default("day"),
  happenedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  happenedUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  placeName: z.string().trim().max(160).nullish(),
  city: z.string().trim().max(120).nullish(),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  isMilestone: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad input" }, { status: 400 });
  }
  const input = parsed.data;
  const happenedOn = input.happenedOn ?? istToday();

  // slugs collide when two days share a title; suffix until one is free
  const base = slugify(input.title, happenedOn);
  let slug = base;
  for (let n = 1; n <= 30; n++) {
    slug = withSuffix(base, n);
    const taken = await db.select({ id: memories.id }).from(memories).where(eq(memories.slug, slug)).limit(1);
    if (taken.length === 0) break;
  }

  const [row] = await db
    .insert(memories)
    .values({
      slug,
      title: input.title,
      subtitle: input.subtitle ?? null,
      kind: input.kind,
      happenedOn,
      happenedUntil: input.happenedUntil ?? null,
      placeName: input.placeName ?? null,
      city: input.city ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      isMilestone: input.isMilestone || input.kind === "milestone",
      createdBy: me.id,
    })
    .returning();

  return NextResponse.json({ id: row.id, slug: row.slug });
}
