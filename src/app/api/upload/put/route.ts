import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/guard";
import { isUploadKey, putObject, r2Configured } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * Browser → app → R2. Avoids CORS on the bucket, which breaks whenever the
 * dev server picks a port other than 3000.
 */
export async function POST(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  if (!r2Configured()) {
    return NextResponse.json({ error: "R2 is not configured — see SETUP.md" }, { status: 503 });
  }

  const form = await req.formData();
  const key = String(form.get("key") ?? "").trim();
  const file = form.get("file");

  if (!key || !isUploadKey(key)) {
    return NextResponse.json({ error: "bad key" }, { status: 400 });
  }
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "file too large for server upload — use direct R2 upload" }, { status: 413 });
  }

  const contentType = file.type || (key.endsWith(".webm") ? "audio/webm" : "image/webp");

  try {
    await putObject(key, Buffer.from(await file.arrayBuffer()), contentType);
    return NextResponse.json({ ok: true, key });
  } catch (err) {
    console.error("[upload/put]", key, err);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}
