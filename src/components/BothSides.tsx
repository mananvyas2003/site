"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { prettyDate } from "@/lib/dates";

export type WireSide =
  | { state: "empty" }
  | { state: "locked"; unlocksAt: string }
  | { state: "mine" | "visible"; body: string; createdAt: string | null; updatedAt: string | null };

export type Person = { handle: string; displayName: string; accent: string };

/**
 * The signature feature (PRD §4.1). Two notes side by side, each in that
 * person's accent. You do not see theirs until you've written yours — so the
 * write box is always open, and only the *read* is gated.
 */
export default function BothSides({
  memoryId,
  me,
  them,
  mine,
  theirs,
  readOnly = false,
}: {
  memoryId: string;
  me: Person;
  them: Person | null;
  mine: WireSide;
  theirs: WireSide;
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
      <MySide memoryId={memoryId} me={me} side={mine} readOnly={readOnly} />
      <TheirSide them={them} side={theirs} iveWritten={mine.state === "mine"} />
    </div>
  );
}

function SideFrame({
  person,
  children,
  meta,
}: {
  person: { handle: string; displayName: string; accent: string } | null;
  children: React.ReactNode;
  meta?: string;
}) {
  const accent = person?.accent ?? "var(--color-haze)";
  return (
    <section
      className="relative rounded-sm border bg-paper-deep/60 p-5 avoid-break"
      style={{ borderColor: `${accent}44` }}
    >
      <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] rounded-l-sm" style={{ background: accent }} />
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <span className="mono text-[0.6875rem] lowercase tracking-[0.16em]" style={{ color: accent }}>
          {person?.handle ?? "the other side"}
        </span>
        {meta && <span className="mono text-[0.625rem] text-ink-soft">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function MySide({
  memoryId,
  me,
  side,
  readOnly,
}: {
  memoryId: string;
  me: Person;
  side: WireSide;
  readOnly: boolean;
}) {
  const router = useRouter();
  const existing = side.state === "mine" ? side.body : "";
  const [editing, setEditing] = useState(side.state !== "mine");
  const [body, setBody] = useState(existing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId, body: body.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not save");
    } finally {
      setSaving(false);
    }
  }

  const meta =
    side.state === "mine" && side.createdAt ? prettyDate(side.createdAt.slice(0, 10)) : undefined;

  return (
    <SideFrame person={me} meta={meta}>
      {readOnly || (!editing && side.state === "mine") ? (
        <>
          <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">
            {side.state === "mine" ? side.body : ""}
          </p>
          {!readOnly && (
            <button onClick={() => setEditing(true)} className="eyebrow mt-3 underline underline-offset-4">
              edit
            </button>
          )}
        </>
      ) : (
        <>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="your version. don't polish it."
            rows={5}
            className="field min-h-32 resize-y text-[0.95rem] leading-relaxed"
          />
          <div className="mt-3 flex items-center gap-3">
            <button onClick={save} disabled={saving || !body.trim()} className="btn btn-primary">
              {saving ? "saving…" : side.state === "mine" ? "update" : "save my version"}
            </button>
            {side.state === "mine" && (
              <button
                onClick={() => {
                  setBody(existing);
                  setEditing(false);
                }}
                className="eyebrow underline underline-offset-4"
              >
                cancel
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-sindoor">{error}</p>}
        </>
      )}
    </SideFrame>
  );
}

const PLACEHOLDER =
  "we got there late and the place was already closing but they let us in anyway and you laughed at me for ordering the same thing i always order.";

function TheirSide({
  them,
  side,
  iveWritten,
}: {
  them: Person | null;
  side: WireSide;
  iveWritten: boolean;
}) {
  const who = them?.handle ?? "she";
  const possessive = them?.handle === "manno" ? "his" : "hers";
  const pronoun = them?.handle === "manno" ? "him" : "her";

  if (side.state === "locked") {
    return (
      <SideFrame person={them} meta={`opens ${prettyDate(side.unlocksAt.slice(0, 10))}`}>
        <p className="sealed-text whitespace-pre-wrap text-[0.95rem] leading-relaxed" aria-hidden>
          {PLACEHOLDER}
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          {who} has written {possessive}. write yours to unlock.
        </p>
      </SideFrame>
    );
  }

  if (side.state === "empty") {
    return (
      <SideFrame person={them}>
        <p className="text-sm text-ink-soft">
          {iveWritten
            ? `${who} hasn't written ${possessive} yet — nudge ${pronoun}.`
            : `nothing on this side yet.`}
        </p>
      </SideFrame>
    );
  }

  const meta = side.createdAt ? prettyDate(side.createdAt.slice(0, 10)) : undefined;
  return (
    <SideFrame person={them} meta={meta}>
      <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">{side.body}</p>
    </SideFrame>
  );
}
