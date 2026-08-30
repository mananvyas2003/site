import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireApi } from "@/lib/guard";
import { vapidPublicKey } from "@/lib/push";

export async function GET() {
  return NextResponse.json({ publicKey: vapidPublicKey() });
}

export async function POST(req: Request) {
  const me = await requireApi();
  if (!me?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "no database" }, { status: 503 });

  const body = (await req.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);

  if (existing[0]) {
    await db
      .update(pushSubscriptions)
      .set({ userId: me.id, p256dh, auth })
      .where(eq(pushSubscriptions.id, existing[0].id));
  } else {
    await db.insert(pushSubscriptions).values({ userId: me.id, endpoint, p256dh, auth });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const me = await requireApi();
  if (!me?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "no database" }, { status: 503 });

  const body = (await req.json()) as { endpoint?: string };
  const endpoint = body.endpoint?.trim();
  if (!endpoint) return NextResponse.json({ error: "bad subscription" }, { status: 400 });

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  return NextResponse.json({ ok: true });
}
