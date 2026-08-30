/* eslint-disable no-restricted-globals */
/**
 * Two jobs, no caching of app assets — this is a private site and a stale
 * shell is worse than a network round trip.
 *
 *  1. Catch the POST from the phone's share sheet, park the files in a cache,
 *     and bounce to /new?shared=1 where the page picks them up.
 *  2. Nothing else.
 */
const INBOX = "mm-share-inbox";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(
      (async () => {
        try {
          const form = await event.request.formData();
          const files = form.getAll("photos").filter((f) => f && typeof f !== "string");
          const cache = await caches.open(INBOX);

          for (const [i, file] of files.entries()) {
            const name = encodeURIComponent(file.name || `shared-${i}`);
            await cache.put(
              new Request(`/__shared/${Date.now()}-${i}-${name}`),
              new Response(file, { headers: { "Content-Type": file.type || "image/jpeg" } }),
            );
          }
        } catch (err) {
          console.error("[sw] share-target", err);
        }
        return Response.redirect("/new?shared=1", 303);
      })(),
    );
  }
});
