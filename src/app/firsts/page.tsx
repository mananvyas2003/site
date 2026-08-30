import FirstsBoard from "@/components/FirstsBoard";
import { requirePage } from "@/lib/guard";
import { getFirsts, getThread } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** The fixed, editable list. Seeded with the PRD's suggestions on first run. */
export default async function FirstsPage() {
  await requirePage();
  const [firsts, thread] = await Promise.all([getFirsts(), getThread(400)]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-16">
      <p className="eyebrow">the firsts</p>
      <h1 className="display mt-3 text-[clamp(2.25rem,8vw,4.5rem)]">
        the first <em>everything</em>
      </h1>
      <p className="mt-4 max-w-lg text-ink-soft">
        the short list. each one can point at a day in the thread, once the day exists.
      </p>

      <FirstsBoard
        firsts={firsts}
        memories={thread.map((t) => ({ id: t.id, title: t.title, happenedOn: t.happenedOn }))}
      />
    </main>
  );
}
