"use client";

/**
 * The share sheet hands files to the service worker, which parks them in a
 * cache and bounces the browser to /new?shared=1. This is the other half of
 * that handoff. (PRD §4.2 — the share_target friction win.)
 */
const CACHE = "mm-share-inbox";

export async function takeSharedFiles(): Promise<File[]> {
  if (!("caches" in window)) return [];
  try {
    const cache = await caches.open(CACHE);
    const keys = await cache.keys();
    const files: File[] = [];

    for (const request of keys) {
      const res = await cache.match(request);
      if (!res) continue;
      const blob = await res.blob();
      const name = decodeURIComponent(new URL(request.url).pathname.split("/").pop() || "shared");
      files.push(new File([blob], name, { type: blob.type, lastModified: Date.now() }));
      await cache.delete(request);
    }

    return files;
  } catch {
    return [];
  }
}
