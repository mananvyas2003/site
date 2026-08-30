/* eslint-disable no-restricted-globals */
/**
 * Three jobs, no caching of app assets — this is a private site and a stale
 * shell is worse than a network round trip.
 *
 *  1. Catch the POST from the phone's share sheet, park the files in a cache,
 *     and bounce to /new?shared=1 where the page picks them up.
 *  2. Show the one daily push at 9pm (top line of /you).
 *  3. Nothing else.
 */
const INBOX = "mm-share-inbox";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "your turn", body: "something's waiting.", url: "/you" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* empty payload */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/you";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

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
