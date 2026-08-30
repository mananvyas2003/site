"use client";

import { useEffect, useState } from "react";
import { heroImageUrl } from "@/lib/hero";

/** Hero photo — faces centred, responsive across breakpoints. */
export default function HeroSection() {
  const [source, setSource] = useState<"r2" | "static" | "none">("static");

  useEffect(() => {
    fetch("/api/hero")
      .then((r) => r.json())
      .then((d: { exists?: boolean }) => {
        if (d.exists) setSource("r2");
      })
      .catch(() => {});
  }, []);

  const src = source === "r2" ? heroImageUrl() : "/hero.jpg";

  return (
    <div className="relative h-full min-h-[inherit] w-full overflow-hidden bg-paper-deep">
      {source !== "none" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="manno and momo at convocation"
          className="h-full w-full object-cover object-[center_24%] sm:object-[center_20%] lg:object-[center_18%]"
          onError={() => setSource("none")}
        />
      )}

      {source === "none" && (
        <div
          className="h-full w-full"
          style={{
            background:
              "radial-gradient(120% 100% at 78% 12%, rgba(232,163,23,0.22), transparent 58%), radial-gradient(90% 80% at 10% 90%, rgba(178,58,46,0.14), transparent 60%)",
          }}
        />
      )}

      {/* soft edge into the text column on desktop */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-paper to-transparent lg:block"
        aria-hidden
      />
      {/* soft edge on mobile below photo */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-paper to-transparent lg:hidden"
        aria-hidden
      />
    </div>
  );
}
