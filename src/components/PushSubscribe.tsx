"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Opt in to the one daily push at 9pm — top line of /you. */
export default function PushSubscribe() {
  const [state, setState] = useState<"idle" | "unsupported" | "denied" | "subscribed" | "loading">("idle");
  const [publicKey, setPublicKey] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    fetch("/api/push/subscribe")
      .then((r) => r.json())
      .then((d: { publicKey?: string }) => {
        if (d.publicKey) setPublicKey(d.publicKey);
      })
      .catch(() => {});

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setState("subscribed");
      })
      .catch(() => {});
  }, []);

  if (state === "unsupported") return null;
  if (!publicKey) {
    return (
      <p className="mono text-[0.6875rem] text-ink-soft">
        daily push needs VAPID keys — see SETUP.md
      </p>
    );
  }

  async function subscribe() {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      setState("subscribed");
    } catch {
      setState("idle");
    }
  }

  async function unsubscribe() {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("idle");
    } catch {
      setState("subscribed");
    }
  }

  if (state === "subscribed") {
    return (
      <div className="card rounded-sm p-4">
        <p className="mono text-[0.6875rem] text-marigold">daily push on · 9pm ist</p>
        <p className="mt-1 text-sm text-ink-soft">one notification, top line of this page.</p>
        <button type="button" onClick={unsubscribe} className="btn btn-ghost mt-3 text-sm">
          turn off
        </button>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <p className="mono text-[0.6875rem] text-ink-soft">
        notifications blocked — enable them in your browser settings.
      </p>
    );
  }

  return (
    <div className="card rounded-sm p-4">
      <p className="mono text-[0.6875rem] text-ink-soft">9pm, once a day</p>
      <p className="mt-1 text-sm text-ink-soft">what&apos;s waiting on your turn — nothing more.</p>
      <button
        type="button"
        onClick={subscribe}
        disabled={state === "loading"}
        className="btn btn-ghost mt-3 text-sm"
      >
        {state === "loading" ? "…" : "remind me"}
      </button>
    </div>
  );
}
