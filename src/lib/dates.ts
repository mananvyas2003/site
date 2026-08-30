/** Everything ticks over at midnight IST. */
export const IST_OFFSET_MIN = 330;

export function istNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + (IST_OFFSET_MIN + now.getTimezoneOffset()) * 60_000);
}

/** YYYY-MM-DD in IST. */
export function istToday(now: Date = new Date()): string {
  const d = istNow(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Inclusive day count since a start date — `met` on its own day is day 1. */
export function daysSince(startDate: string, now: Date = new Date()): number {
  const [y, m, d] = startDate.split("-").map(Number);
  const start = Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  const [ty, tm, td] = istToday(now).split("-").map(Number);
  const today = Date.UTC(ty, tm - 1, td);
  return Math.floor((today - start) / 86_400_000) + 1;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-IN");
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** `14 feb 2027` — lowercase, per the voice rules. */
export function prettyDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function prettyRange(from: string, until?: string | null): string {
  if (!until || until === from) return prettyDate(from);
  const [fy, fm] = from.split("-").map(Number);
  const [uy, um] = until.split("-").map(Number);
  if (fy === uy && fm === um) {
    return `${Number(from.slice(8, 10))}–${prettyDate(until)}`;
  }
  return `${prettyDate(from)} – ${prettyDate(until)}`;
}

export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}

export function daysUntil(iso: string, now: Date = new Date()): number {
  return -daysSince(iso, now) + 1;
}
