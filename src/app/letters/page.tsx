import LettersDesk from "@/components/LettersDesk";
import { requirePage } from "@/lib/guard";
import { getLetters, getUsers } from "@/lib/queries";
import { daysUntil, prettyDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function LettersPage() {
  const me = await requirePage();
  const [{ open, sealed, nextUnlock }, users] = await Promise.all([getLetters(), getUsers()]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <p className="eyebrow">sealed</p>
      <h1 className="display mt-3 text-[clamp(2.25rem,8vw,4.5rem)]">
        some of this <em>isn&apos;t for now</em>
      </h1>

      <p className="mono mt-6 text-sm">
        {sealed.length === 0 ? (
          "nothing sealed yet."
        ) : (
          <>
            {sealed.length} letter{sealed.length === 1 ? "" : "s"} sealed
            {nextUnlock && (
              <>
                {" · "}the next one opens {prettyDate(nextUnlock)}{" "}
                <span className="text-ink-soft">({daysUntil(nextUnlock).toLocaleString("en-IN")} days)</span>
              </>
            )}
          </>
        )}
      </p>

      <p className="mt-4 max-w-lg text-sm text-ink-soft">
        the server simply doesn&apos;t hand back a sealed letter&apos;s text until its date. that&apos;s enough
        against accidental peeking, which is the actual threat here. it is not encryption — don&apos;t sell it
        as one.
      </p>

      <LettersDesk
        viewerId={me.id}
        open={open.map((l) => ({
          id: l.id,
          title: l.title,
          body: l.body,
          unlockOn: l.unlockOn,
          authorId: l.authorId,
          openedAt: l.openedAt ? l.openedAt.toISOString() : null,
        }))}
        sealed={sealed.map((l) => ({ id: l.id, unlockOn: l.unlockOn, authorId: l.authorId }))}
        users={users.map((u) => ({ id: u.id, handle: u.handle, accent: u.accent }))}
      />
    </main>
  );
}
