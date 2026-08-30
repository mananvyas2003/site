"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { prepareImage, uploadTo } from "@/lib/media-client";

type Props = {
  memoryId: string;
  slug: string;
  title: string;
  subtitle: string | null;
  happenedOn: string;
  happenedUntil: string | null;
  placeName: string | null;
  city: string | null;
  kind: string;
  isMilestone: boolean;
  lat: number | null;
  lng: number | null;
  photos: { id: string; thumbKey: string }[];
  coverMediaId: string | null;
};

const KINDS = ["day", "date", "trip", "milestone", "call", "fight", "first"];

export default function MemoryActions(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: props.title,
    subtitle: props.subtitle ?? "",
    happenedOn: props.happenedOn,
    happenedUntil: props.happenedUntil ?? "",
    placeName: props.placeName ?? "",
    city: props.city ?? "",
    kind: props.kind,
    isMilestone: props.isMilestone,
  });

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/memories/${props.memoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "could not save");
      if (data.slug && data.slug !== props.slug) router.replace(`/m/${data.slug}`);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not save");
    } finally {
      setBusy(false);
    }
  }

  async function addPhotos(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const [i, file] of images.entries()) {
        const item = await prepareImage(file);
        const signed = await (
          await fetch("/api/upload/sign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memoryId: props.memoryId, kind: "photo" }),
          })
        ).json();
        if (!signed.webUrl) throw new Error(signed.error ?? "no upload url");

        await Promise.all([
          uploadTo(signed.webUrl, item.web, "image/webp"),
          uploadTo(signed.thumbUrl, item.thumb, "image/webp"),
        ]);

        await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memoryId: props.memoryId,
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
            sortOrder: props.photos.length + i,
          }),
        });
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`delete "${props.title}" and its photos? this cannot be undone.`)) return;
    setBusy(true);
    await fetch(`/api/memories/${props.memoryId}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <section className="no-print mt-16 border-t border-haze pt-6">
      <button onClick={() => setOpen((o) => !o)} className="eyebrow underline underline-offset-4">
        {open ? "done editing" : "edit this day"}
      </button>

      {open && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <L label="title" full>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="field"
              />
            </L>
            <L label="a line about it" full>
              <input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className="field"
              />
            </L>
            <L label="happened on">
              <input
                type="date"
                value={form.happenedOn}
                onChange={(e) => setForm({ ...form, happenedOn: e.target.value })}
                className="field"
              />
            </L>
            <L label="until">
              <input
                type="date"
                value={form.happenedUntil}
                onChange={(e) => setForm({ ...form, happenedUntil: e.target.value })}
                className="field"
              />
            </L>
            <L label="place">
              <input
                value={form.placeName}
                onChange={(e) => setForm({ ...form, placeName: e.target.value })}
                className="field"
              />
            </L>
            <L label="city">
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="field"
              />
            </L>
            <L label="kind">
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="field"
              >
                {KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </L>
            <L label="milestone">
              <label className="flex h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isMilestone}
                  onChange={(e) => setForm({ ...form, isMilestone: e.target.checked })}
                  className="h-4 w-4 accent-[var(--color-sindoor)]"
                />
                mark it on the thread
              </label>
            </L>
          </div>

          <button
            onClick={() =>
              patch({
                title: form.title,
                subtitle: form.subtitle || null,
                happenedOn: form.happenedOn,
                happenedUntil: form.happenedUntil || null,
                placeName: form.placeName || null,
                city: form.city || null,
                kind: form.kind,
                isMilestone: form.isMilestone,
              })
            }
            disabled={busy}
            className="btn btn-primary"
          >
            {busy ? "saving…" : "save changes"}
          </button>

          {props.photos.length > 0 && (
            <div>
              <span className="eyebrow">cover photo</span>
              <ul className="mt-2 flex flex-wrap gap-2">
                {props.photos.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => patch({ coverMediaId: p.id })}
                      className="block rounded-sm ring-offset-2 ring-offset-paper"
                      style={{
                        boxShadow: props.coverMediaId === p.id ? "0 0 0 2px var(--color-marigold)" : undefined,
                      }}
                      aria-label="use as cover"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/i/${p.thumbKey}`} alt="" className="h-16 w-16 rounded-sm object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <span className="eyebrow">add photos</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={(e) => {
                addPhotos(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
              className="mt-2 block text-sm"
            />
          </div>

          {error && <p className="text-sm text-sindoor">{error}</p>}

          <button onClick={remove} disabled={busy} className="eyebrow text-sindoor underline underline-offset-4">
            delete this day
          </button>
        </div>
      )}
    </section>
  );
}

function L({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="eyebrow">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
