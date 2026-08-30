import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { firsts } from "@/db/schema";
import { requireApi } from "@/lib/guard";

export const runtime = "nodejs";

const Body = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(160),
  happenedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  memoryId: z.string().uuid().nullish(),
  note: z.string().trim().max(1000).nullish(),
  thumbKey: z.string().trim().max(500).nullish(),
  webKey: z.string().trim().max(500).nullish(),
  sortOrder: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const { id, ...values } = parsed.data;
  const payload = {
    label: values.label,
    happenedOn: values.happenedOn ?? null,
    memoryId: values.memoryId ?? null,
    note: values.note ?? null,
    thumbKey: values.thumbKey ?? undefined,
    webKey: values.webKey ?? undefined,
    sortOrder: values.sortOrder,
  };

  if (id) {
    await db.update(firsts).set({
      label: payload.label,
      happenedOn: payload.happenedOn,
      memoryId: payload.memoryId,
      note: payload.note,
      sortOrder: payload.sortOrder,
      ...(values.thumbKey !== undefined ? { thumbKey: values.thumbKey } : {}),
      ...(values.webKey !== undefined ? { webKey: values.webKey } : {}),
    }).where(eq(firsts.id, id));
    return NextResponse.json({ ok: true, id });
  }

  const [row] = await db.insert(firsts).values(payload).returning({ id: firsts.id });
  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(firsts).where(eq(firsts.id, id));
  return NextResponse.json({ ok: true });
}
