import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/guard";
import {
  createInboxMessage,
  getInboxReceived,
  getInboxSent,
  getOtherUserId,
  getUnreadInboxCount,
} from "@/lib/inbox";
import { sendInboxPush } from "@/lib/push";

export const runtime = "nodejs";

const Body = z.object({
  kind: z.enum(["love", "journal", "ping"]),
  title: z.string().trim().max(160).nullish(),
  body: z.string().trim().min(1).max(50_000),
});

export async function GET(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const box = new URL(req.url).searchParams.get("box") ?? "received";
  const countOnly = new URL(req.url).searchParams.get("count") === "1";

  if (countOnly) {
    return NextResponse.json({ unread: await getUnreadInboxCount(me.id) });
  }

  if (box === "sent") {
    return NextResponse.json({ messages: await getInboxSent(me.id) });
  }

  return NextResponse.json({
    unread: await getUnreadInboxCount(me.id),
    messages: await getInboxReceived(me.id),
  });
}

export async function POST(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const { kind, title, body } = parsed.data;

  if (kind === "ping" && body.length > 280) {
    return NextResponse.json({ error: "keep it under 280 characters" }, { status: 400 });
  }

  const recipientId = await getOtherUserId(me.id);
  if (!recipientId) return NextResponse.json({ error: "no one to send to" }, { status: 503 });

  const id = await createInboxMessage({
    authorId: me.id,
    recipientId,
    kind,
    title: title ?? null,
    body,
  });

  if (!id) return NextResponse.json({ error: "could not send" }, { status: 503 });

  // fire-and-forget — don't block the response on push delivery
  sendInboxPush(recipientId, me.handle, kind).catch(() => {});

  return NextResponse.json({ ok: true, id });
}
