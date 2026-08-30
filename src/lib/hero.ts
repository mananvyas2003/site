/** Full-bleed hero image — one shared photo, stored in R2. */
export const HERO_WEB_KEY = "site/hero.webp";

export function heroImageUrl(version?: string): string {
  const base = `/i/${HERO_WEB_KEY}`;
  return version ? `${base}?v=${version}` : base;
}
