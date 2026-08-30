"use client";

import { useCallback, useEffect, useState } from "react";
import Photo from "./Photo";

type P = {
  id: string;
  thumbKey: string;
  webKey: string;
  blurhash: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
};

/**
 * Photos, with a per-person star. Each of you stars independently — that's
 * what makes `manno's picks` and `momo's picks` free (PRD §4.3).
 */
export default function Gallery({
  photos,
  stars,
  viewerId,
  users,
  title,
}: {
  photos: P[];
  stars: { mediaId: string; userId: string }[];
  viewerId: string;
  users: { id: string; handle: string; accent: string }[];
  title: string;
}) {
  const [starred, setStarred] = useState<{ mediaId: string; userId: string }[]>(stars);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const isStarredBy = (mediaId: string, userId: string) =>
    starred.some((s) => s.mediaId === mediaId && s.userId === userId);

  async function toggleStar(mediaId: string) {
    if (!viewerId) return;
    const on = isStarredBy(mediaId, viewerId);
    setStarred((prev) =>
      on ? prev.filter((s) => !(s.mediaId === mediaId && s.userId === viewerId)) : [...prev, { mediaId, userId: viewerId }],
    );
    try {
      await fetch("/api/stars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, starred: !on }),
      });
    } catch {
      // put it back if the write failed
      setStarred((prev) =>
        on ? [...prev, { mediaId, userId: viewerId }] : prev.filter((s) => !(s.mediaId === mediaId && s.userId === viewerId)),
      );
    }
  }

  const close = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? null : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, photos.length, close]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {photos.map((p, i) => (
          <li key={p.id} className="group relative avoid-break">
            <button
              onClick={() => setLightbox(i)}
              className="block w-full"
              aria-label={p.caption ?? `${title}, photo ${i + 1}`}
            >
              <Photo
                objectKey={p.thumbKey}
                blurhash={p.blurhash}
                alt={p.caption ?? title}
                ratio={1}
                className="tilt aspect-square w-full rounded-sm"
              />
            </button>

            {/* stars: yours is a button, theirs is a read-only dot */}
            <div className="no-print absolute right-1.5 top-1.5 flex gap-1">
              {users.map((u) => {
                const on = isStarredBy(p.id, u.id);
                const mine = u.id === viewerId;
                if (!on && !mine) return null;
                return (
                  <button
                    key={u.id}
                    onClick={() => mine && toggleStar(p.id)}
                    disabled={!mine}
                    aria-label={mine ? (on ? "unstar" : "star") : `${u.handle} starred this`}
                    title={mine ? "your pick" : `${u.handle}'s pick`}
                    className={`flex h-6 w-6 items-center justify-center rounded-full backdrop-blur transition-opacity ${
                      on ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    style={{ background: on ? u.accent : "rgba(251,246,236,0.85)" }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill={on ? "var(--color-paper)" : "none"}
                      stroke={on ? "var(--color-paper)" : "var(--color-ink)"}
                      strokeWidth="2"
                    >
                      <path d="M12 3.5l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.9l6.1-.8z" strokeLinejoin="round" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {lightbox !== null && photos[lightbox] && (
        <div
          className="no-print fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/95 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/i/${photos[lightbox].webKey}`}
            alt={photos[lightbox].caption ?? title}
            className="max-h-[86vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mono mt-4 flex items-center gap-4 text-[0.6875rem] text-paper/70">
            <span>
              {lightbox + 1} / {photos.length}
            </span>
            {photos[lightbox].caption && <span>{photos[lightbox].caption}</span>}
            <button onClick={close} className="underline underline-offset-4">
              close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
