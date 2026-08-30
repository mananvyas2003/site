import { daysSince, prettyDate, prettyRange, istToday, daysUntil } from "../src/lib/dates";
import { slugify } from "../src/lib/slug";

let failed = 0;
const check = (name: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  got ${JSON.stringify(a)} want ${JSON.stringify(b)}`}`);
};

const at = (iso: string) => new Date(iso);

check("start date itself is day 1", daysSince("2024-01-01", at("2024-01-01T12:00:00+05:30")), 1);
check("next day is day 2", daysSince("2024-01-01", at("2024-01-02T00:30:00+05:30")), 2);
check("leap year spans correctly", daysSince("2024-02-28", at("2024-03-01T10:00:00+05:30")), 3);
check("counts across a year", daysSince("2023-01-01", at("2024-01-01T10:00:00+05:30")), 366);

// midnight IST rollover: 18:25 UTC is 23:55 IST (same day); 18:35 UTC is 00:05 IST (next day)
check("just before IST midnight", istToday(at("2026-08-30T18:25:00Z")), "2026-08-30");
check("just after IST midnight", istToday(at("2026-08-30T18:35:00Z")), "2026-08-31");

check("pretty date is lowercase", prettyDate("2027-02-14"), "14 feb 2027");
check("same-month range compresses", prettyRange("2026-03-04", "2026-03-09"), "4–9 mar 2026");
check("cross-month range is full", prettyRange("2026-03-28", "2026-04-02"), "28 mar 2026 – 2 apr 2026");
check("single day range", prettyRange("2026-03-04", null), "4 mar 2026");

check("days until is positive for the future", daysUntil("2026-09-01", at("2026-08-30T10:00:00+05:30")) > 0, true);

check("slug carries the date, keeps leading article", slugify("The one where the auto broke down", "2026-08-30"), "2026-08-30-the-one-where-auto-broke-down");

check("orphan letters from stripped scripts are dropped", slugify("मोमो's birthday!! 🎂", "2026-01-05"), "2026-01-05-birthday");
check("empty-ish title still slugs", slugify("!!!", "2026-01-05"), "2026-01-05-a-day");

console.log(failed === 0 ? "\nall good." : `\n${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
