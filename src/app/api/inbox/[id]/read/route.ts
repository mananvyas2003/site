import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/guard";
import { markInboxRead } from "@/lib/inbox";

export const runtime = "nodejs";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const { id } = await params;
  const ok = await markInboxRead(id, me.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
