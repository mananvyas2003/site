import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function main() {
  const db = getDb();
  if (!db) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  console.log("Running migrations…\n");

  // inbox_messages
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inbox_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      from_user_id uuid NOT NULL REFERENCES users(id),
      to_user_id uuid NOT NULL REFERENCES users(id),
      kind text NOT NULL DEFAULT 'note',
      subject text,
      body text NOT NULL,
      read_at timestamptz,
      created_at timestamptz DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS inbox_to_read_idx ON inbox_messages (to_user_id, read_at)`);
  console.log("  ✓ inbox_messages");

  // push_subscriptions
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint text NOT NULL,
      p256dh text NOT NULL,
      auth text NOT NULL,
      created_at timestamptz DEFAULT now(),
      UNIQUE (user_id, endpoint)
    )
  `);
  console.log("  ✓ push_subscriptions");

  // firsts photo columns
  await db.execute(sql`ALTER TABLE firsts ADD COLUMN IF NOT EXISTS thumb_key text`);
  await db.execute(sql`ALTER TABLE firsts ADD COLUMN IF NOT EXISTS web_key text`);
  console.log("  ✓ firsts thumb_key / web_key");

  console.log("\nAll migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
