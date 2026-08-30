import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { safeQuery } from "@/db";
import { inboxMessages, users } from "@/db/schema";
import type { InboxKind } from "@/db/schema";

export type InboxRow = {
  id: string;
  kind: InboxKind;
  title: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
  authorId: string;
  recipientId: string;
  authorHandle: string;
  authorAccent: string;
  recipientHandle: string;
};

const KIND_LABEL: Record<InboxKind, string> = {
  love: "love letter",
  journal: "journal",
  ping: "thinking of you",
};

export function inboxKindLabel(kind: InboxKind): string {
  return KIND_LABEL[kind] ?? kind;
}

function mapRow(r: Record<string, unknown>): InboxRow {
  return {
    id: String(r.id),
    kind: String(r.kind) as InboxKind,
    title: (r.title as string) ?? null,
    body: String(r.body),
    readAt: r.read_at ? new Date(String(r.read_at)).toISOString() : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
    authorId: String(r.author_id),
    recipientId: String(r.recipient_id),
    authorHandle: String(r.author_handle),
    authorAccent: String(r.author_accent),
    recipientHandle: String(r.recipient_handle),
  };
}

const INBOX_SELECT = sql`
  select
    m.id, m.kind, m.title, m.body, m.read_at, m.created_at,
    m.author_id, m.recipient_id,
    a.handle as author_handle, a.accent as author_accent,
    r.handle as recipient_handle
  from inbox_messages m
  join users a on a.id = m.author_id
  join users r on r.id = m.recipient_id
`;

export async function getUnreadInboxCount(recipientId: string): Promise<number> {
  return safeQuery(async (db) => {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inboxMessages)
      .where(and(eq(inboxMessages.recipientId, recipientId), isNull(inboxMessages.readAt)));
    return Number(rows[0]?.count ?? 0);
  }, 0);
}

export async function getInboxReceived(recipientId: string, limit = 50): Promise<InboxRow[]> {
  return safeQuery(async (db) => {
    const rows = await db.execute(
      sql`${INBOX_SELECT}
          where m.recipient_id = ${recipientId}
          order by m.read_at nulls first, m.created_at desc
          limit ${limit}`,
    );
    return (rows.rows as Record<string, unknown>[]).map(mapRow);
  }, []);
}

export async function getInboxSent(authorId: string, limit = 50): Promise<InboxRow[]> {
  return safeQuery(async (db) => {
    const rows = await db.execute(
      sql`${INBOX_SELECT}
          where m.author_id = ${authorId}
          order by m.created_at desc
          limit ${limit}`,
    );
    return (rows.rows as Record<string, unknown>[]).map(mapRow);
  }, []);
}

export async function getUnreadInboxPreview(recipientId: string, limit = 3): Promise<InboxRow[]> {
  return safeQuery(async (db) => {
    const rows = await db.execute(
      sql`${INBOX_SELECT}
          where m.recipient_id = ${recipientId} and m.read_at is null
          order by m.created_at desc
          limit ${limit}`,
    );
    return (rows.rows as Record<string, unknown>[]).map(mapRow);
  }, []);
}

export async function markInboxRead(messageId: string, recipientId: string): Promise<boolean> {
  return safeQuery(async (db) => {
    const updated = await db
      .update(inboxMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(inboxMessages.id, messageId),
          eq(inboxMessages.recipientId, recipientId),
          isNull(inboxMessages.readAt),
        ),
      )
      .returning({ id: inboxMessages.id });
    return updated.length > 0;
  }, false);
}

export async function createInboxMessage(input: {
  authorId: string;
  recipientId: string;
  kind: InboxKind;
  title?: string | null;
  body: string;
}): Promise<string | null> {
  return safeQuery(async (db) => {
    const [row] = await db
      .insert(inboxMessages)
      .values({
        authorId: input.authorId,
        recipientId: input.recipientId,
        kind: input.kind,
        title: input.title ?? null,
        body: input.body,
      })
      .returning({ id: inboxMessages.id });
    return row?.id ?? null;
  }, null);
}

export async function getOtherUserId(viewerId: string): Promise<string | null> {
  return safeQuery(async (db) => {
    const rows = await db.select().from(users).where(sql`${users.id} <> ${viewerId}`).limit(1);
    return rows[0]?.id ?? null;
  }, null);
}
