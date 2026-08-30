/**
 * A password box on the open internet needs a lock on the door. In-memory,
 * per-process — which in serverless means it resets when the instance does.
 * That is fine here: it isn't trying to stop a determined attacker, it's
 * trying to make an online guessing attack against two accounts pointlessly
 * slow, and it costs nothing.
 */
type Bucket = { fails: number; blockedUntil: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const FREE_ATTEMPTS = 5;
const MAX_BLOCK_MS = 15 * 60 * 1000;

function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, b] of buckets) {
    if (b.blockedUntil < now - WINDOW_MS) buckets.delete(key);
  }
}

export function checkLocked(key: string): { locked: boolean; retryInSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.blockedUntil <= now) return { locked: false, retryInSec: 0 };
  return { locked: true, retryInSec: Math.ceil((b.blockedUntil - now) / 1000) };
}

export function recordFailure(key: string): void {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key) ?? { fails: 0, blockedUntil: 0 };
  b.fails += 1;
  if (b.fails > FREE_ATTEMPTS) {
    // 2s, 4s, 8s … capped at 15 minutes
    const backoff = Math.min(MAX_BLOCK_MS, 1000 * 2 ** (b.fails - FREE_ATTEMPTS));
    b.blockedUntil = now + backoff;
  }
  buckets.set(key, b);
}

export function recordSuccess(key: string): void {
  buckets.delete(key);
}
