"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { daysUntil, prettyDate } from "@/lib/dates";

type OpenLetter = {
  id: string;
  title: string | null;
  body: string;
  unlockOn: string;
  authorId: string | null;
  openedAt: string | null;
};

type SealedLetter = { id: string; unlockOn: string; authorId: string | null };
type U = { id: string; handle: string; accent: string };

export default function LettersDesk({
  viewerId,
  open,
  sealed,
  users,
}: {
  viewerId: string;
  open: OpenLetter[];
  sealed: SealedLetter[];
  users: U[];
}) {
  const router = useRouter();
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [unlockOn, setUnlockOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const who = (id: string | null) => users.find((u) => u.id === id);

  async function seal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || null, body: body.trim(), unlockOn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "could not seal it");
      setTitle("");
      setBody("");
      setUnlockOn("");
      setWriting(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not seal it");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 space-y-10">
      <div>
        {writing ? (
          <div className="card space-y-3 rounded-sm p-5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="a title, optional"
              className="field"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="write it now. you won't be able to read it again until the date."
              rows={8}
              className="field min-h-44 resize-y leading-relaxed"
              autoFocus
            />
            <label className="block">
              <span className="eyebrow">opens on</span>
              <input
                type="date"
                value={unlockOn}
                onChange={(e) => setUnlockOn(e.target.value)}
                className="field mt-2"
              />
            </label>
            <div className="flex items-center gap-3">
              <button onClick={seal} disabled={busy || !body.trim() || !unlockOn} className="btn btn-primary">
                {busy ? "sealing…" : "seal it"}
              </button>
              <button onClick={() => setWriting(false)} className="eyebrow underline underline-offset-4">
                cancel
              </button>
            </div>
            {error && <p className="text-sm text-sindoor">{error}</p>}
          </div>
        ) : (
          <button onClick={() => setWriting(true)} className="btn btn-primary">
            write one
          </button>
        )}
      </div>

      {sealed.length > 0 && (
        <section>
          <h2 className="eyebrow mb-4">still sealed</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {sealed.map((l) => {
              const u = who(l.authorId);
              return (
                <li
                  key={l.id}
                  className="relative overflow-hidden rounded-sm border p-5"
                  style={{ borderColor: `${u?.accent ?? "var(--color-haze)"}44` }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-full w-[3px]"
                    style={{ background: u?.accent ?? "var(--color-haze)" }}
                  />
                  <div className="mono flex items-baseline justify-between text-[0.6875rem]">
                    <span style={{ color: u?.accent }}>{u?.handle ?? "—"}</span>
                    <span className="text-ink-soft">{daysUntil(l.unlockOn).toLocaleString("en-IN")} days</span>
                  </div>
                  <p className="sealed-text mt-3 text-sm leading-relaxed" aria-hidden>
                    there is a thing i have never said out loud and this is where it goes, and by the time you
                    read it we will already know whether it was true.
                  </p>
                  <p className="mono mt-3 text-[0.625rem] text-ink-soft">opens {prettyDate(l.unlockOn)}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {open.length > 0 && (
        <section>
          <h2 className="eyebrow mb-4">open</h2>
          <ul className="space-y-4">
            {open.map((l) => {
              const u = who(l.authorId);
              return (
                <li
                  key={l.id}
                  className="relative rounded-sm border bg-paper-deep/50 p-5"
                  style={{ borderColor: `${u?.accent ?? "var(--color-haze)"}44` }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-full w-[3px]"
                    style={{ background: u?.accent ?? "var(--color-haze)" }}
                  />
                  <div className="mono flex flex-wrap items-baseline justify-between gap-2 text-[0.6875rem]">
                    <span style={{ color: u?.accent }}>{u?.handle ?? "—"}</span>
                    <span className="text-ink-soft">sealed until {prettyDate(l.unlockOn)}</span>
                  </div>
                  {l.title && <h3 className="display mt-2 text-2xl">{l.title}</h3>}
                  <p className="mt-3 whitespace-pre-wrap leading-relaxed">{l.body}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {open.length === 0 && sealed.length === 0 && (
        <p className="text-ink-soft">nothing here yet. write one with a date far enough away to be a surprise.</p>
      )}

      <p className="mono text-[0.625rem] text-ink-soft">
        {viewerId ? "" : "sign in to write one."}
      </p>
    </div>
  );
}
