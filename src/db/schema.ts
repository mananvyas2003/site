import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  primaryKey,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  handle: text("handle").unique().notNull(), // 'manno' | 'momo'
  displayName: text("display_name").notNull(),
  email: text("email").unique().notNull(),
  accent: text("accent").notNull(),
  avatarKey: text("avatar_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").unique().notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    kind: text("kind").notNull().default("day"), // day|date|trip|milestone|call|fight|first
    happenedOn: date("happened_on").notNull(),
    happenedUntil: date("happened_until"),
    placeName: text("place_name"),
    city: text("city"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    coverMediaId: uuid("cover_media_id"),
    isMilestone: boolean("is_milestone").default(false),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("memories_happened_on_idx").on(t.happenedOn)],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id").references(() => memories.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("photo"), // photo|voice
    thumbKey: text("thumb_key").notNull(),
    webKey: text("web_key").notNull(),
    origKey: text("orig_key"),
    mime: text("mime").notNull(),
    width: integer("width"),
    height: integer("height"),
    bytes: integer("bytes"),
    durationSec: integer("duration_sec"),
    blurhash: text("blurhash"),
    caption: text("caption"),
    takenAt: timestamp("taken_at", { withTimezone: true }),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("media_memory_sort_idx").on(t.memoryId, t.sortOrder)],
);

// the signature feature — one version each, editable
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id").references(() => memories.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique("notes_memory_author_uniq").on(t.memoryId, t.authorId)],
);

export const stars = pgTable(
  "stars",
  {
    mediaId: uuid("media_id").references(() => media.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.mediaId, t.userId] })],
);

export const firsts = pgTable("firsts", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  happenedOn: date("happened_on"),
  memoryId: uuid("memory_id").references(() => memories.id),
  note: text("note"),
  thumbKey: text("thumb_key"),
  webKey: text("web_key"),
  sortOrder: integer("sort_order").default(0),
});

export const letters = pgTable("letters", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").references(() => users.id),
  title: text("title"),
  body: text("body").notNull(),
  unlockOn: date("unlock_on").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const counters = pgTable("counters", {
  key: text("key").primaryKey(), // 'met' | 'friends' | 'together'
  label: text("label").notNull(),
  startDate: date("start_date").notNull(),
});

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique("push_subscriptions_endpoint_uniq").on(t.endpoint)],
);

/** Private notes between the two of you — only the recipient sees them in their inbox. */
export const inboxMessages = pgTable(
  "inbox_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    recipientId: uuid("recipient_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    kind: text("kind").notNull(), // love | journal | ping
    title: text("title"),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("inbox_messages_recipient_idx").on(t.recipientId, t.readAt),
    index("inbox_messages_author_idx").on(t.authorId),
  ],
);

export type User = typeof users.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Letter = typeof letters.$inferSelect;
export type First = typeof firsts.$inferSelect;
export type Counter = typeof counters.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InboxMessage = typeof inboxMessages.$inferSelect;
export type InboxKind = "love" | "journal" | "ping";
