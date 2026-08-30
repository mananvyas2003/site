import webpush from "web-push";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getOtherUser } from "./queries";
import { OTHER } from "./people";
import { getYourTurn, yourTurnHeadline } from "./your-turn";
import { getUnreadInboxCount, inboxKindLabel } from "./inbox";
import type { InboxKind } from "@/db/schema";

export function pushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim(),
  );
}

export function vapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
}

function initWebPush(): boolean {
  if (!pushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!.trim(),
    process.env.VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );
  return true;
}

export async function sendDailyPushToUser(userId: string): Promise<{ sent: number; failed: number }> {
  if (!initWebPush()) return { sent: 0, failed: 0 };

  const db = getDb();
  if (!db) return { sent: 0, failed: 0 };

  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  if (subs.length === 0) return { sent: 0, failed: 0 };

  const other = await getOtherUser(userId);
  const turn = await getYourTurn(userId, other?.id ?? null);
  const unreadInbox = await getUnreadInboxCount(userId);
  const otherHandle = other?.handle ?? OTHER.manno;
  const body = yourTurnHeadline(turn, otherHandle, unreadInbox);

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: "your turn",
          body,
          url: "/you",
        }),
      );
      sent++;
    } catch (err) {
      failed++;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }

  return { sent, failed };
}

/** 9pm IST daily push — one line from /you. */
export async function sendDailyPushAll(): Promise<{ users: number; sent: number; failed: number }> {
  const db = getDb();
  if (!db || !initWebPush()) return { users: 0, sent: 0, failed: 0 };

  const userIds = await db
    .selectDistinct({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions);

  let sent = 0;
  let failed = 0;

  for (const { userId } of userIds) {
    const result = await sendDailyPushToUser(userId);
    sent += result.sent;
    failed += result.failed;
  }

  return { users: userIds.length, sent, failed };
}

/** Immediate push when a love letter / journal / ping arrives. */
export async function sendInboxPush(
  recipientId: string,
  fromHandle: string,
  kind: InboxKind,
): Promise<void> {
  if (!initWebPush()) return;

  const db = getDb();
  if (!db) return;

  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, recipientId));
  const label = inboxKindLabel(kind);

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: "for you",
          body: `${fromHandle} sent you a ${label}`,
          url: "/inbox",
        }),
      );
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }
}
