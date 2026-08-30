"use client";

export default function VoiceNotes({
  items,
  users,
}: {
  items: { id: string; webKey: string; durationSec: number | null; caption: string | null; uploadedBy: string | null }[];
  users: { id: string; handle: string; accent: string }[];
}) {
  return (
    <section className="no-print">
      <h2 className="eyebrow mb-4">voice</h2>
      <ul className="space-y-3">
        {items.map((v) => {
          const who = users.find((u) => u.id === v.uploadedBy);
          return (
            <li
              key={v.id}
              className="flex flex-wrap items-center gap-3 rounded-sm border p-3"
              style={{ borderColor: `${who?.accent ?? "var(--color-haze)"}44` }}
            >
              <span className="mono text-[0.6875rem]" style={{ color: who?.accent }}>
                {who?.handle ?? "voice"}
              </span>
              <audio controls preload="none" src={`/i/${v.webKey}`} className="h-9 flex-1 min-w-48" />
              {v.durationSec != null && (
                <span className="mono text-[0.625rem] text-ink-soft">
                  {Math.floor(v.durationSec / 60)}:{String(v.durationSec % 60).padStart(2, "0")}
                </span>
              )}
              {v.caption && <span className="text-sm text-ink-soft">{v.caption}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
