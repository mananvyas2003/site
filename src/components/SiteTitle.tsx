"use client";

/** Shared site title — manno & momo everywhere. */
export default function SiteTitle({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      manno <span className="italic text-sindoor">&</span> momo
    </span>
  );
}
