"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Photo from "./Photo";
import { prettyDate } from "@/lib/dates";
import { prepareImage, uploadRendition, type Prepared } from "@/lib/media-client";
import type { FirstRow } from "@/lib/queries";

/** The PRD's starting list — offered once, when the board is empty. */
const SUGGESTED = [
  "first conversation",
  "first coffee",
  "first movie",
  "first fight",
  "first trip",
  "first time she called you manno",
];

type SavePayload = {
  id?: string;
  label: string;
  happenedOn: string | null;
  memoryId: string | null;
  note: string | null;
  sortOrder: number;
  photo?: Prepared | null;
};

export default function FirstsBoard({
  firsts,
  memories,
}: {
  firsts: FirstRow[];
  memories: { id: string; title: string; happenedOn: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(payload: SavePayload) {
    setBusy(true);
    try {
      const { photo, ...rest } = payload;
      const res = await fetch("/api/firsts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "save failed");

      const id = payload.id ?? data.id;
      if (photo && id) {
        const thumbKey = `firsts/${id}/thumb.webp`;
        const webKey = `firsts/${id}/web.webp`;
        await uploadRendition(thumbKey, photo.thumb, "image/webp");
        await uploadRendition(webKey, photo.web, "image/webp");
        await fetch("/api/firsts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...rest, thumbKey, webKey }),
        });
      }

      setEditing(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "couldn't save");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("remove this first?")) return;
    setBusy(true);
    await fetch(`/api/firsts?id=${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  async function seed() {
    setBusy(true);
    for (const [i, label] of SUGGESTED.entries()) {
      await fetch("/api/firsts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, sortOrder: i }),
      });
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-10">
      {firsts.length === 0 && (
        <div className="card rounded-sm px-6 py-12 text-center">
          <p className="text-ink-soft">the list is empty.</p>
          <button onClick={seed} disabled={busy} className="btn btn-primary mt-5">
            start with the usual six
          </button>
        </div>
      )}

      <ul className="grid gap-px overflow-hidden rounded-sm border border-haze bg-haze sm:grid-cols-2">
        {firsts.map((f) => (
          <li key={f.id} className="bg-paper p-5">
            {editing === f.id ? (
              <FirstForm
                initial={f}
                memories={memories}
                busy={busy}
                onCancel={() => setEditing(null)}
                onSave={(payload) => save({ id: f.id, ...payload })}
              />
            ) : (
              <div className="flex items-start gap-4">
                {f.thumbKey && (
                  <Photo objectKey={f.thumbKey} alt={f.label} ratio={1} className="h-16 w-16 shrink-0 rounded-sm" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="display text-xl">{f.label}</h2>
                  {f.happenedOn && <p className="mono mt-1 text-[0.625rem] text-ink-soft">{prettyDate(f.happenedOn)}</p>}
                  {f.note && <p className="mt-2 text-sm text-ink-soft">{f.note}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {f.memorySlug ? (
                      <Link href={`/m/${f.memorySlug}`} className="eyebrow underline underline-offset-4">
                        {f.memoryTitle} →
                      </Link>
                    ) : (
                      <span className="eyebrow opacity-60">no day linked yet</span>
                    )}
                    <button onClick={() => setEditing(f.id)} className="eyebrow underline underline-offset-4">
                      edit
                    </button>
                    <button onClick={() => remove(f.id)} className="eyebrow text-sindoor underline underline-offset-4">
                      remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}

        <li className="bg-paper p-5">
          {editing === "new" ? (
            <FirstForm
              memories={memories}
              busy={busy}
              onCancel={() => setEditing(null)}
              onSave={(payload) => save({ ...payload, sortOrder: firsts.length })}
            />
          ) : (
            <button onClick={() => setEditing("new")} className="eyebrow underline underline-offset-4">
              + add a first
            </button>
          )}
        </li>
      </ul>
    </div>
  );
}

function FirstForm({
  initial,
  memories,
  busy,
  onSave,
  onCancel,
}: {
  initial?: FirstRow;
  memories: { id: string; title: string; happenedOn: string }[];
  busy: boolean;
  onSave: (payload: Omit<SavePayload, "id">) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState(initial?.label ?? "");
  const [happenedOn, setHappenedOn] = useState(initial?.happenedOn ?? "");
  const [memoryId, setMemoryId] = useState(initial?.memoryId ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [photo, setPhoto] = useState<Prepared | null>(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    return () => {
      if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    };
  }, [photo]);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setPreparing(true);
    try {
      const next = await prepareImage(file);
      setPhoto((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return next;
      });
      if (!happenedOn && next.takenAt) setHappenedOn(next.takenAt.slice(0, 10));
    } catch {
      alert("couldn't read that photo");
    } finally {
      setPreparing(false);
    }
  }

  const previewKey = photo?.previewUrl ?? initial?.thumbKey ?? null;

  return (
    <div className="space-y-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="first…"
        className="field"
        autoFocus
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="date" value={happenedOn} onChange={(e) => setHappenedOn(e.target.value)} className="field" />
        <select value={memoryId} onChange={(e) => setMemoryId(e.target.value)} className="field">
          <option value="">— link a day —</option>
          {memories.map((m) => (
            <option key={m.id} value={m.id}>
              {m.happenedOn} · {m.title}
            </option>
          ))}
        </select>
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="a line, optional" className="field" />

      <div className="flex items-start gap-4">
        {previewKey &&
          (photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.previewUrl} alt="" className="h-20 w-20 shrink-0 rounded-sm object-cover" />
          ) : (
            initial?.thumbKey && (
              <Photo objectKey={initial.thumbKey} alt={initial.label} ratio={1} className="h-20 w-20 shrink-0 rounded-sm" />
            )
          ))}
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy || preparing}
            className="btn btn-ghost text-sm"
          >
            {preparing ? "preparing…" : photo ? "change photo" : initial?.thumbKey ? "replace photo" : "add photo"}
          </button>
          {photo && (
            <button
              type="button"
              onClick={() => {
                setPhoto((prev) => {
                  if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
                  return null;
                });
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="eyebrow block text-sindoor underline underline-offset-4"
            >
              remove new photo
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() =>
            onSave({
              label: label.trim(),
              happenedOn: happenedOn || null,
              memoryId: memoryId || null,
              note: note.trim() || null,
              sortOrder: initial?.sortOrder ?? 0,
              photo,
            })
          }
          disabled={busy || preparing || !label.trim()}
          className="btn btn-primary"
        >
          save
        </button>
        <button onClick={onCancel} className="eyebrow underline underline-offset-4">
          cancel
        </button>
      </div>
    </div>
  );
}
