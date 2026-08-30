import InboxDesk from "@/components/InboxDesk";
import { requirePage } from "@/lib/guard";
import { getInboxReceived, getInboxSent, getUnreadInboxCount } from "@/lib/inbox";
import { getOtherUser, getUsers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const me = await requirePage();
  const [received, sent, unread, users] = await Promise.all([
    getInboxReceived(me.id),
    getInboxSent(me.id),
    getUnreadInboxCount(me.id),
    getUsers(),
  ]);

  const other = users.find((u) => u.id !== me.id) ?? (await getOtherUser(me.id));

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <p className="eyebrow">for you</p>
      <h1 className="display mt-3 text-[clamp(2rem,7vw,3.5rem)]">
        your <em>inbox</em>
      </h1>
      <p className="mt-4 max-w-lg text-ink-soft">
        love letters, journal entries, and quick lines — only the person you send them to sees them here.
        {unread > 0 && (
          <span className="mono ml-1 text-sindoor">
            · {unread} unread
          </span>
        )}
      </p>

      <InboxDesk
        viewerId={me.id}
        other={
          other
            ? { id: other.id, handle: other.handle, accent: other.accent }
            : null
        }
        received={received}
        sent={sent}
        initialUnread={unread}
      />
    </main>
  );
}
