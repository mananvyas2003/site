import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Validates everything needed for a Vercel production deploy.
 * Run locally with production env vars, or after `vercel env pull`.
 */
const REQUIRED = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_ENDPOINT",
  "MANNO_EMAIL",
  "MOMO_EMAIL",
  "COUNTER_MET",
  "COUNTER_FRIENDS",
  "COUNTER_TOGETHER",
] as const;

const PASSWORD_KEYS = ["MANNO_PASSWORD_HASH", "MOMO_PASSWORD_HASH", "MANNO_PASSWORD", "MOMO_PASSWORD"] as const;

function ok(label: string, detail?: string) {
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label: string, detail: string) {
  console.log(`  ✗ ${label} — ${detail}`);
}

function main() {
  console.log("\nDeploy readiness\n");

  let errors = 0;

  for (const key of REQUIRED) {
    const val = process.env[key]?.trim();
    if (!val) {
      fail(key, "missing");
      errors++;
    } else {
      ok(key);
    }
  }

  const mannoAuth = Boolean(process.env.MANNO_PASSWORD_HASH?.trim() || process.env.MANNO_PASSWORD?.trim());
  const momoAuth = Boolean(process.env.MOMO_PASSWORD_HASH?.trim() || process.env.MOMO_PASSWORD?.trim());
  if (!mannoAuth) {
    fail("manno login", "set MANNO_PASSWORD_HASH (run npm run set-password)");
    errors++;
  } else ok("manno login");
  if (!momoAuth) {
    fail("momo login", "set MOMO_PASSWORD_HASH (run npm run set-password)");
    errors++;
  } else ok("momo login");

  const authUrl = process.env.AUTH_URL?.trim();
  if (!authUrl) {
    fail("AUTH_URL", "set to https://your-domain.vercel.app (required for reliable login cookies)");
    errors++;
  } else if (authUrl.startsWith("http://localhost")) {
    fail("AUTH_URL", `still localhost — set to your production URL`);
    errors++;
  } else if (!authUrl.startsWith("https://")) {
    fail("AUTH_URL", "must start with https://");
    errors++;
  } else {
    ok("AUTH_URL", authUrl);
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl.includes("channel_binding=require")) {
    fail("DATABASE_URL", "remove channel_binding=require — breaks Neon HTTP driver on Vercel");
    errors++;
  }
  if (dbUrl && !dbUrl.includes("-pooler") && !dbUrl.includes("pooler")) {
    console.log("  ⚠ DATABASE_URL — use Neon’s pooled connection string on Vercel");
  } else if (dbUrl) {
    ok("DATABASE_URL pooling", "pooled");
  }

  const pushKeys = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "CRON_SECRET"];
  const pushReady = pushKeys.every((k) => process.env[k]?.trim());
  if (pushReady) {
    ok("web push + cron");
  } else {
    console.log("  ⚠ web push optional — skip VAPID_* and CRON_SECRET if you don't want daily reminders");
  }

  console.log("\nBefore first deploy:");
  console.log("  1. npm run migrate-all   (or db:push if starting fresh)");
  console.log("  2. npm run db:seed       (idempotent — safe to re-run)");
  console.log("  3. Add your Vercel URL to R2 → bucket → CORS AllowedOrigins");
  console.log("  4. npm run check-conn    (prove Neon + R2 answer)\n");

  if (errors) {
    console.log(`${errors} issue(s) — fix before deploying.\n`);
    process.exit(1);
  }
  console.log("Looks ready for Vercel.\n");
}

main();
