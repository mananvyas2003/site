"use client";

import { useEffect, useRef, useState } from "react";
import { decode } from "blurhash";

/**
 * Blurhash placeholder painted to a canvas, so the grid never flashes grey
 * (PRD §4.3). Falls back to a haze fill when a hash is missing.
 */
export default function Photo({
  objectKey,
  blurhash,
  alt,
  className = "",
  sizes,
  priority = false,
  ratio,
}: {
  objectKey: string | null;
  blurhash?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  ratio?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return;
    try {
      const w = 32;
      const h = ratio ? Math.max(1, Math.round(32 / ratio)) : 32;
      const pixels = decode(blurhash, w, h);
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      const imageData = ctx.createImageData(w, h);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      /* a bad hash is not worth a crash */
    }
  }, [blurhash, ratio]);

  if (!objectKey) {
    return <div className={`bg-haze/60 ${className}`} aria-hidden />;
  }

  return (
    <span className={`relative block overflow-hidden bg-haze/50 ${className}`}>
      {blurhash && (
        <canvas
          ref={canvasRef}
          aria-hidden
          className="absolute inset-0 h-full w-full transition-opacity duration-500"
          style={{ opacity: loaded ? 0 : 1 }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/i/${objectKey}`}
        alt={alt}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="relative h-full w-full object-cover transition-opacity duration-500"
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </span>
  );
}
