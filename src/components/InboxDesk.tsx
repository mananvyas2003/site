"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InboxKind } from "@/db/schema";
import type { InboxRow } from "@/lib/inbox";
import { inboxKindLabel } from "@/lib/inbox";

type U = { id: string; handle: string; accent: string };

const COMPOSE: { kind: InboxKind; label: string; hint: string; placeholder: string; maxLen?: number }[] = [
  {
    kind: "ping",
    label: "thinking of you",
    hint: "lands instantly in their inbox — under 280 characters",
    placeholder: "just wanted you to know i'm thinking about you.",
    maxLen: 280,
  },
  {
    kind: "love",
    label: "love letter",
    hint: "for their eyes only — they'll see it in their inbox",
    placeholder: "dear momo,\n\ni don't say this enough, but…",
  },
  {
    kind: "journal",
    label: "journal entry",
    hint: "a longer reflection, just for the two of you",
    placeholder: "today felt like…",
  },
];

export default function InboxDesk({
  viewerId,
  other,
  received,
  sent,
  initialUnread,
}: {
  viewerId: string;
  other: U | null;
  received: InboxRow[];
  sent: InboxRow[];
  initialUnread: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"for-you" | "from-you">("for-you");
  const [composing, setComposing] = useState<InboxKind | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [unread, setUnread] = useState(initialUnread);

  const composeMeta = COMPOSE.find((c) => c.kind === composing);

  async function send() {
    if (!composing || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: composing,
          title: title.trim() || null,
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "could not send");
      setTitle("");
      setBody("");
      setComposing(null);
      setTab("from-you");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not send");
    } finally {
      setBusy(false);
    }
  }

  async function openMessage(msg: InboxRow) {
    setOpenId(msg.id);
    if (!msg.readAt && msg.recipientId === viewerId) {
      await fetch(`/api/inbox/${msg.id}/read`, { method: "PATCH" });
      setUnread((u) => Math.max(0, u - 1));
      router.refresh();
    }
  }

  function startReply(kind: InboxKind) {
    setComposing(kind);
    setTitle("");
    setBody("");
    setOpenId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const list = tab === "for-you" ? received : sent;

  return (
    <div className="mt-10 space-y-8">
      {/* compose picker */}
      {!composing ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {COMPOSE.map((c) => (
            <button
              key={c.kind}
              type="button"
              onClick={() => {
                setComposing(c.kind);
                setTitle("");
                setBody("");
                setError(null);
              }}
              className="card rounded-sm p-4 text-left transition-colors hover:border-marigold/50"
            >
              <span className="mono text-[0.6875rem] text-marigold">{c.label}</span>
              <p className="mt-2 text-sm text-ink-soft">{c.hint}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="card space-y-3 rounded-sm p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="mono text-[0.6875rem]" style={{ color: other?.accent ?? "var(--color-ink)" }}>
              {composeMeta?.label} → {other?.handle ?? "them"}
            </span>
            <button
              type="button"
              onClick={() => setComposing(null)}
              className="eyebrow underline underline-offset-4"
            >
              cancel
            </button>
          </div>

          {composing !== "ping" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="a title, optional"
              className="field"
            />
          )}

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={composeMeta?.placeholder}
            rows={composing === "ping" ? 3 : 8}
            maxLength={composeMeta?.maxLen}
            className="field min-h-24 resize-y leading-relaxed"
            autoFocus
          />

          {composeMeta?.maxLen && (
            <p className="mono text-right text-[0.625rem] text-ink-soft">
              {body.length}/{composeMeta.maxLen}
            </p>
          )}

          <button
            type="button"
            onClick={send}
            disabled={busy || !body.trim()}
            className="btn btn-primary"
            style={{ background: other?.accent ?? "var(--color-ink)" }}
          >
            {busy ? "sending…" : `send to ${other?.handle ?? "them"}'s inbox`}
          </button>

          {error && <p className="text-sm text-sindoor">{error}</p>}
        </div>
      )}

      {/* tabs */}
      <div className="flex gap-4 border-b border-haze">
        <button
          type="button"
          onClick={() => setTab("for-you")}
          className="eyebrow pb-3 transition-colors"
          style={{
            color: tab === "for-you" ? "var(--color-ink)" : "var(--color-ink-soft)",
            borderBottom: tab === "for-you" ? "2px solid var(--color-sindoor)" : "2px solid transparent",
          }}
        >
          for you{unread > 0 ? ` · ${unread}` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("from-you")}
          className="eyebrow pb-3 transition-colors"
          style={{
            color: tab === "from-you" ? "var(--color-ink)" : "var(--color-ink-soft)",
            borderBottom: tab === "from-you" ? "2px solid var(--color-haze)" : "2px solid transparent",
          }}
        >
          from you
        </button>
      </div>

      {/* message list */}
      {list.length === 0 ? (
        <p className="text-ink-soft">
          {tab === "for-you"
            ? "nothing here yet. when they write, it lands here — only you see it."
            : "you haven't sent anything yet. pick one of the three above."}
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((msg) => {
            const isOpen = openId === msg.id;
            const unreadMsg = !msg.readAt && msg.recipientId === viewerId;
            const fromThem = msg.authorId !== viewerId;

            return (
              <li key={msg.id}>
                <div
                  className={`rounded-sm border transition-colors ${
                    unreadMsg ? "border-sindoor/50 bg-sindoor/5" : "border-haze bg-paper"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openMessage(msg)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mono flex flex-wrap items-center gap-2 text-[0.6875rem]">
                          <span style={{ color: fromThem ? msg.authorAccent : other?.accent }}>
                            {fromThem ? msg.authorHandle : "you"}
                          </span>
                          <span className="text-ink-soft">·</span>
                          <span className="text-ink-soft">{inboxKindLabel(msg.kind)}</span>
                          {unreadMsg && (
                            <span className="rounded-sm bg-sindoor px-1.5 py-0.5 text-paper">new</span>
                          )}
                        </div>
                        {msg.title && !isOpen && (
                          <p className="mt-1 truncate text-sm font-medium">{msg.title}</p>
                        )}
                        {!isOpen && (
                          <p className="mt-1 truncate text-sm text-ink-soft">
                            {msg.body.slice(0, 100)}
                            {msg.body.length > 100 ? "…" : ""}
                          </p>
                        )}
                      </div>
                      <time className="mono shrink-0 text-[0.625rem] text-ink-soft">
                        {new Date(msg.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </time>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-haze px-4 pb-4">
                      {msg.title && <h3 className="display text-xl">{msg.title}</h3>}
                      <p className="mt-3 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                      {fromThem && (
                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startReply("ping")}
                            className="btn btn-ghost text-sm"
                          >
                            quick reply
                          </button>
                          <button
                            type="button"
                            onClick={() => startReply("love")}
                            className="btn btn-ghost text-sm"
                          >
                            write back
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mono text-[0.625rem] text-ink-soft">
        only the recipient sees these. sealed letters on a timer live under{" "}
        <Link href="/letters" className="underline underline-offset-2">
          sealed
        </Link>
        .
      </p>
    </div>
  );
}
