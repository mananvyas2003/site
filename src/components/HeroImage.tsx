"use client";

import { useState } from "react";

/**
 * The full-bleed hero. Drop your convocation photo at `public/hero.jpg` and
 * it appears; until then you get the paper wash, and the site still looks
 * finished. Hero photos need horizontal breathing room and space for type
 * over the top — crop wide.
 */
export default function HeroImage() {
  const [failed, setFailed] = useState(false);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/hero.jpg"
          alt=""
          aria-hidden
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
      {/* wash: keeps the display type readable over any crop */}
      <div
        className="absolute inset-0"
        style={{
          background: failed
            ? "radial-gradient(120% 100% at 78% 12%, rgba(232,163,23,0.22), transparent 58%), radial-gradient(90% 80% at 10% 90%, rgba(178,58,46,0.14), transparent 60%)"
            : "linear-gradient(to right, rgba(251,246,236,0.94) 0%, rgba(251,246,236,0.82) 42%, rgba(251,246,236,0.35) 100%)",
        }}
      />
    </div>
  );
}
