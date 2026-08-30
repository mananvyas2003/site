import { NextResponse } from "next/server";
import { requireApi } from "@/lib/guard";
import { HERO_WEB_KEY } from "@/lib/hero";
import { objectExists, presignPut, r2Configured } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET() {
  if (!r2Configured()) return NextResponse.json({ exists: false, configured: false });

  const exists = await objectExists(HERO_WEB_KEY);
  return NextResponse.json({
    exists,
    configured: true,
    key: HERO_WEB_KEY,
    url: exists ? `/i/${HERO_WEB_KEY}` : null,
  });
}

/** Presigned PUT for the hero photo — overwrites the previous one. */
export async function POST() {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  if (!r2Configured()) {
    return NextResponse.json({ error: "R2 is not configured — see SETUP.md" }, { status: 503 });
  }

  const uploadUrl = await presignPut(HERO_WEB_KEY, "image/webp");
  return NextResponse.json({ uploadUrl, key: HERO_WEB_KEY });
}
