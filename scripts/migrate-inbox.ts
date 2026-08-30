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

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inbox_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind text NOT NULL,
      title text,
      body text NOT NULL,
      read_at timestamptz,
      created_at timestamptz DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS inbox_messages_recipient_idx
    ON inbox_messages (recipient_id, read_at)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS inbox_messages_author_idx
    ON inbox_messages (author_id)
  `);

  console.log("inbox_messages table ready");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
