"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { inferCoords, inferDate, inferUntil, prepareImage, uploadTo, type Prepared } from "@/lib/media-client";
import { takeSharedFiles } from "@/lib/share-inbox";
import { istToday, prettyDate } from "@/lib/dates";
import VoiceRecorder from "./VoiceRecorder";

type Stage = "idle" | "reading" | "ready" | "saving" | "done";

const KINDS = ["day", "date", "trip", "milestone", "call", "fight", "first"] as const;

/**
 * The 60-second path (PRD §4.2). The only required field is the title —
 * everything else is inferred from EXIF or left blank. Do not add a required
 * field to this form. That is how the project dies.
 */
export default function NewMemory() {
  const router = useRouter();
  const params = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [items, setItems] = useState<Prepared[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [happenedOn, setHappenedOn] = useState(istToday());
  const [happenedUntil, setHappenedUntil] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("day");
  const [isMilestone, setIsMilestone] = useState(false);
  const [more, setMore] = useState(false);
  const [voice, setVoice] = useState<{ blob: Blob; seconds: number } | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const ingest = useCallback(async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;

    setStage("reading");
    setError(null);
    setProgress({ done: 0, total: images.length });

    const prepared: Prepared[] = [];
    for (const file of images) {
      try {
        prepared.push(await prepareImage(file));
      } catch (err) {
        console.error("[prepare]", file.name, err);
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.key));
      const next = [...prev, ...prepared.filter((p) => !seen.has(p.key))];

      // EXIF auto-grouping: pre-fill the date so nobody has to pick one
      const date = inferDate(next);
      if (date) setHappenedOn(date);
      const until = inferUntil(next);
      if (until) {
        setHappenedUntil(until);
        setKind((k) => (k === "day" ? "trip" : k));
      }

      const gps = inferCoords(next);
      if (gps) {
        setCoords(gps);
        fetch(`/api/geocode?lat=${gps.lat}&lng=${gps.lng}`)
          .then((r) => r.json())
          .then((d: { placeName: string | null; city: string | null }) => {
            setPlaceName((cur) => cur || d.placeName || "");
            setCity((cur) => cur || d.city || "");
          })
          .catch(() => {});
      }

      return next;
    });

    setStage("ready");
  }, []);

  // share-target: files handed over by the service worker from the share sheet
  useEffect(() => {
    if (params.get("shared") !== "1") return;
    takeSharedFiles().then((files) => {
      if (files.length) ingest(files);
    });
  }, [params, ingest]);

  // paste a screenshot straight onto the page
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) {
        e.preventDefault();
        ingest(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [ingest]);

  function removeItem(key: string) {
    setItems((prev) => {
      const gone = prev.find((p) => p.key === key);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  async function save() {
    if (!title.trim()) return;
    setStage("saving");
    setError(null);
    setProgress({ done: 0, total: items.length + (voice ? 1 : 0) });

    try {
      const created = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          kind,
          happenedOn,
          happenedUntil: happenedUntil || null,
          placeName: placeName.trim() || null,
          city: city.trim() || null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          isMilestone,
        }),
      });
      if (!created.ok) throw new Error((await created.json().catch(() => ({}))).error ?? "could not create the memory");
      const memory = (await created.json()) as { id: string; slug: string };

      for (const [i, item] of items.entries()) {
        const signed = await (
          await fetch("/api/upload/sign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memoryId: memory.id, kind: "photo" }),
          })
        ).json();
        if (!signed.webUrl) throw new Error(signed.error ?? "could not get an upload url");

        await Promise.all([
          uploadTo(signed.webUrl, item.web, "image/webp"),
          uploadTo(signed.thumbUrl, item.thumb, "image/webp"),
        ]);

        await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memoryId: memory.id,
            mediaId: signed.mediaId,
            kind: "photo",
            thumbKey: signed.thumbKey,
            webKey: signed.webKey,
            mime: "image/webp",
            width: item.width,
            height: item.height,
            bytes: item.bytes,
            blurhash: item.blurhash,
            takenAt: item.takenAt,
            sortOrder: i,
          }),
        });

        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }

      if (voice) {
        const signed = await (
          await fetch("/api/upload/sign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memoryId: memory.id, kind: "voice" }),
          })
        ).json();
        if (signed.voiceUrl) {
          await uploadTo(signed.voiceUrl, voice.blob, "audio/webm");
          await fetch("/api/media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memoryId: memory.id,
              mediaId: signed.mediaId,
              kind: "voice",
              thumbKey: signed.voiceKey,
              webKey: signed.voiceKey,
              mime: "audio/webm",
              durationSec: voice.seconds,
              sortOrder: 999,
            }),
          });
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }

      setStage("done");
      router.push(`/m/${memory.slug}?saved=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
      setStage("ready");
    }
  }

  const busy = stage === "reading" || stage === "saving";

  return (
    <div className="mt-8">
      {/* ── 1. the photos ─────────────────────────────────── */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          ingest(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          ingest(Array.from(e.dataTransfer.files));
        }}
        className="card rounded-sm p-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fileRef.current?.click()} className="btn btn-primary" disabled={busy}>
            {items.length ? "add more photos" : "select photos"}
          </button>
          <span className="text-sm text-ink-soft">
            {stage === "reading"
              ? `reading ${progress.done}/${progress.total}…`
              : items.length
                ? `${items.length} photo${items.length === 1 ? "" : "s"}`
                : "or drop them here · or paste a screenshot"}
          </span>
        </div>

        {items.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {items.map((item) => (
              <li key={item.key} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt="" className="h-20 w-20 rounded-sm object-cover" />
                <button
                  onClick={() => removeItem(item.key)}
                  aria-label="remove"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-paper opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {(happenedOn !== istToday() || placeName) && (
          <p className="mono mt-4 text-[0.6875rem] text-ink-soft">
            read from the photos: {prettyDate(happenedOn)}
            {happenedUntil && ` – ${prettyDate(happenedUntil)}`}
            {placeName && ` · ${placeName}`}
          </p>
        )}
      </div>

      {/* ── 2. the only required field ────────────────────── */}
      <div className="mt-6">
        <label className="eyebrow" htmlFor="title">
          what do we call this day
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="the one where the auto broke down"
          autoFocus
          className="field mt-2 text-lg"
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim() && !busy) save();
          }}
        />
      </div>

      <button onClick={() => setMore((m) => !m)} className="eyebrow mt-4 underline underline-offset-4">
        {more ? "hide the optional bits" : "everything else is optional →"}
      </button>

      {more && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="a line about it" full>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="field" />
          </Field>
          <Field label="happened on">
            <input type="date" value={happenedOn} onChange={(e) => setHappenedOn(e.target.value)} className="field" />
          </Field>
          <Field label="until (trips only)">
            <input
              type="date"
              value={happenedUntil}
              onChange={(e) => setHappenedUntil(e.target.value)}
              className="field"
            />
          </Field>
          <Field label="place">
            <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} className="field" />
          </Field>
          <Field label="city">
            <input value={city} onChange={(e) => setCity(e.target.value)} className="field" />
          </Field>
          <Field label="kind">
            <select value={kind} onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])} className="field">
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <Field label="milestone">
            <label className="flex h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isMilestone}
                onChange={(e) => setIsMilestone(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-sindoor)]"
              />
              mark it on the thread
            </label>
          </Field>
          <div className="sm:col-span-2">
            <span className="eyebrow">voice note</span>
            <div className="mt-2">
              <VoiceRecorder onRecorded={setVoice} recorded={voice} />
            </div>
          </div>
        </div>
      )}

      {/* ── 3. save ───────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button onClick={save} disabled={busy || !title.trim()} className="btn btn-primary">
          {stage === "saving" ? `saving ${progress.done}/${progress.total}…` : "save"}
        </button>
        <span className="text-sm text-ink-soft">
          {items.length === 0 && title.trim() ? "no photos — that's allowed" : "you can write your version next"}
        </span>
      </div>

      {error && <p className="mt-4 text-sm text-sindoor">{error}</p>}
    </div>
  );
}

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="eyebrow">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
