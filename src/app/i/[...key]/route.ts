import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getObject } from "@/lib/r2";
import { unlockedForSetup } from "@/lib/people";

export const runtime = "nodejs";

const ALLOWED_PREFIXES = ["thumb/", "web/", "orig/", "voice/", "site/", "firsts/"];

/**
 * PRD §6: keep the bucket private, serve through an app route that checks the
 * session. The lazy alternative — a public bucket with unguessable UUIDs —
 * means every photo is a permanent public URL to anyone who gets the link.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await ctx.params;
  const key = segments.map(decodeURIComponent).join("/");

  if (key.includes("..") || !ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
    return new Response("nope", { status: 400 });
  }

  const session = await auth();
  const unlocked = unlockedForSetup();
  const isSiteAsset = key.startsWith("site/");
  if (!session?.user?.email && !(unlocked && isSiteAsset)) return new Response("nope", { status: 401 });

  const obj = await getObject(key);
  if (!obj || !obj.Body) return new Response("not found", { status: 404 });

  const etag = obj.ETag;
  if (etag && req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304 });
  }

  return new Response(obj.Body.transformToWebStream(), {
    headers: {
      "Content-Type": obj.ContentType ?? "application/octet-stream",
      "Content-Length": obj.ContentLength ? String(obj.ContentLength) : "",
      // immutable: keys are uuid-derived and never rewritten
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Robots-Tag": "noindex, noimageindex",
      ...(etag ? { ETag: etag } : {}),
    },
  });
}
