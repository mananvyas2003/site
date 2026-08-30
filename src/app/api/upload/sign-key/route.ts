import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/guard";
import { isUploadKey, presignPut, r2Configured } from "@/lib/r2";

export const runtime = "nodejs";

const Body = z.object({
  key: z.string().trim().min(1).max(500),
  contentType: z.string().trim().min(1).max(100).default("image/webp"),
});

/** Presigned PUT for any allowed upload key — used for firsts photos and localhost fallback. */
export async function POST(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  if (!r2Configured()) {
    return NextResponse.json({ error: "R2 is not configured — see SETUP.md" }, { status: 503 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const { key, contentType } = parsed.data;
  if (!isUploadKey(key)) return NextResponse.json({ error: "bad key" }, { status: 400 });

  const uploadUrl = await presignPut(key, contentType);
  return NextResponse.json({ uploadUrl, key });
}
