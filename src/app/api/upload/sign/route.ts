import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireApi } from "@/lib/guard";
import { objectKey, presignPut, r2Configured } from "@/lib/r2";

export const runtime = "nodejs";

const Body = z.object({
  memoryId: z.string().uuid(),
  kind: z.enum(["photo", "voice"]).default("photo"),
});

/**
 * Hands back a media id and a pair of presigned PUTs. The browser uploads
 * straight to R2 — bytes never touch the app server, which is what keeps this
 * fast enough to do from a phone on mobile data.
 */
export async function POST(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  if (!r2Configured()) {
    return NextResponse.json({ error: "R2 is not configured — see SETUP.md" }, { status: 503 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const { memoryId, kind } = parsed.data;
  const mediaId = randomUUID();

  if (kind === "voice") {
    const voiceKey = objectKey("voice", memoryId, mediaId);
    return NextResponse.json({
      mediaId,
      voiceKey,
      voiceUrl: await presignPut(voiceKey, "audio/webm"),
    });
  }

  const thumbKey = objectKey("thumb", memoryId, mediaId);
  const webKey = objectKey("web", memoryId, mediaId);

  return NextResponse.json({
    mediaId,
    thumbKey,
    webKey,
    thumbUrl: await presignPut(thumbKey, "image/webp"),
    webUrl: await presignPut(webKey, "image/webp"),
  });
}
