const STOP = new Set(["the", "a", "an", "and", "of", "in", "on", "at", "to", "for", "our", "we"]);

export function slugify(title: string, happenedOn: string): string {
  const words = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean)
    // a leading article is kept — "the fight" shouldn't slug to "fight"
    .filter((w, i) => i === 0 || !STOP.has(w))
    // devanagari and emoji strip to nothing, leaving orphans like the "s"
    // of a possessive; drop those rather than slug a day as "-s-birthday"
    .filter((w) => w.length > 1 || /\d/.test(w))
    .slice(0, 6);
  const stem = words.join("-") || "a-day";
  return `${happenedOn.slice(0, 10)}-${stem}`.slice(0, 80);
}

export function withSuffix(slug: string, n: number) {
  return n <= 1 ? slug : `${slug}-${n}`;
}
