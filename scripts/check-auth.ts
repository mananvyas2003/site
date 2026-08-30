import {
  hashPassword,
  verifyPassword,
  hasPassword,
  configuredHandles,
  isHandle,
  unlockedForSetup,
} from "../src/lib/people";
import { checkLocked, recordFailure, recordSuccess } from "../src/lib/rate-limit";

let failed = 0;
const check = (name: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  got ${JSON.stringify(a)} want ${JSON.stringify(b)}`}`);
};

// isolate from whatever is really in .env.local
for (const k of ["MANNO_PASSWORD", "MOMO_PASSWORD", "MANNO_PASSWORD_HASH", "MOMO_PASSWORD_HASH"]) delete process.env[k];

// ── hashes ────────────────────────────────────────────────
process.env.MANNO_PASSWORD_HASH = hashPassword("correct horse battery");
check("right password verifies", verifyPassword("manno", "correct horse battery"), true);
check("wrong password rejected", verifyPassword("manno", "correct horse batteryy"), false);
check("empty password rejected", verifyPassword("manno", ""), false);
check("case matters", verifyPassword("manno", "Correct horse battery"), false);
check("hash is salted (two hashes differ)", hashPassword("same") === hashPassword("same"), false);
// regression: `$` in an env value is eaten by dotenv-expand, which silently
// mangles the hash and locks you out with no useful error
check("hash contains no $ (dotenv-expand would eat it)", hashPassword("x").includes("$"), false);
check("password containing $ still verifies", (() => {
  process.env.MANNO_PASSWORD_HASH = hashPassword("a$b$c dollars");
  return verifyPassword("manno", "a$b$c dollars");
})(), true);
process.env.MANNO_PASSWORD_HASH = hashPassword("correct horse battery");
check("a garbage hash never opens the door", (() => {
  process.env.MOMO_PASSWORD_HASH = "not-a-real-hash";
  const r = verifyPassword("momo", "anything");
  delete process.env.MOMO_PASSWORD_HASH;
  return r;
})(), false);

// ── the two accounts are independent ──────────────────────
check("momo's password doesn't open manno", verifyPassword("momo", "correct horse battery"), false);
check("momo has no password set", hasPassword("momo"), false);
check("only manno can sign in", configuredHandles(), ["manno"]);

process.env.MOMO_PASSWORD_HASH = hashPassword("a different one entirely");
check("both configured now", configuredHandles(), ["manno", "momo"]);
check("momo's own password works", verifyPassword("momo", "a different one entirely"), true);
check("manno's password still doesn't open momo", verifyPassword("momo", "correct horse battery"), false);

// ── plaintext fallback ────────────────────────────────────
delete process.env.MANNO_PASSWORD_HASH;
process.env.MANNO_PASSWORD = "plain fallback pw";
check("plaintext fallback works", verifyPassword("manno", "plain fallback pw"), true);
check("plaintext fallback rejects wrong", verifyPassword("manno", "plain fallback pX"), false);

process.env.MANNO_PASSWORD_HASH = hashPassword("the hashed one");
check("hash wins over plaintext when both set", verifyPassword("manno", "plain fallback pw"), false);
check("  ...and the hashed one is accepted", verifyPassword("manno", "the hashed one"), true);

// ── handles ───────────────────────────────────────────────
check("unknown handle rejected", isHandle("nehal"), false);
check("sql-ish handle rejected", isHandle("manno' or 1=1--"), false);
check("known handles accepted", [isHandle("manno"), isHandle("momo")], [true, true]);

// ── rate limiting ─────────────────────────────────────────
const key = `test:${Date.now()}`;
check("starts unlocked", checkLocked(key).locked, false);
for (let i = 0; i < 5; i++) recordFailure(key);
check("5 failures still allowed", checkLocked(key).locked, false);
recordFailure(key);
check("6th failure locks", checkLocked(key).locked, true);
check("lock reports a wait", checkLocked(key).retryInSec > 0, true);
recordSuccess(key);
check("success clears the lock", checkLocked(key).locked, false);

// ── the setup fallback must never survive a deploy ────────
// without the NODE_ENV guard, deploying before setting a password would
// publish the whole archive to anyone holding the URL
{
  // node 24 refuses defineProperty on process.env; plain assignment works
  const env = process.env as Record<string, string | undefined>;
  const setNodeEnv = (v: string) => {
    env.NODE_ENV = v;
  };
  const origEnv = process.env.NODE_ENV;

  delete process.env.MANNO_PASSWORD_HASH;
  delete process.env.MOMO_PASSWORD_HASH;
  delete process.env.MANNO_PASSWORD;
  process.env.AUTH_SECRET = "test-secret";

  setNodeEnv("development");
  check("dev + no password -> unlocked so you can look around", unlockedForSetup(), true);

  setNodeEnv("production");
  check("PRODUCTION + no password -> LOCKED, never public", unlockedForSetup(), false);

  process.env.MANNO_PASSWORD_HASH = hashPassword("something real");
  setNodeEnv("development");
  check("dev + password set -> login required", unlockedForSetup(), false);

  setNodeEnv(origEnv ?? "test");
}

console.log(failed === 0 ? "\nall good." : `\n${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
