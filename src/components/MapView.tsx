"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { prettyDate } from "@/lib/dates";

type Pin = { slug: string; title: string; lat: number; lng: number; placeName: string | null; happenedOn: string };

const TILE = 256;

/**
 * A slippy map in about a hundred lines, on free OSM raster tiles. No
 * maplibre bundle, no tile-provider key, no billing account — a two-person
 * archive does not need vector styling, it needs dots in the right places.
 */
export default function MapView({ pins }: { pins: Pin[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 480 });
  const [zoom, setZoom] = useState(4);
  const [center, setCenter] = useState({ lat: 22.7196, lng: 75.8577 }); // indore, until we know better
  const [active, setActive] = useState<Pin | null>(null);
  const drag = useRef<{ x: number; y: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // fit to the pins once we know how big the box is
  useEffect(() => {
    if (pins.length === 0 || size.w === 0) return;
    const lats = pins.map((p) => p.lat);
    const lngs = pins.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    setCenter({ lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 });

    const spanLng = Math.max(maxLng - minLng, 0.01);
    const spanLat = Math.max(maxLat - minLat, 0.01);
    const zx = Math.log2((size.w / TILE) * (360 / spanLng));
    const zy = Math.log2((size.h / TILE) * (170 / spanLat));
    setZoom(Math.max(2, Math.min(16, Math.floor(Math.min(zx, zy)) - 1)));
  }, [pins, size.w, size.h]);

  const project = useMemo(() => {
    const scale = TILE * Math.pow(2, zoom);
    const worldX = (lng: number) => ((lng + 180) / 360) * scale;
    const worldY = (lat: number) => {
      const s = Math.sin((lat * Math.PI) / 180);
      return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale;
    };
    const cx = worldX(center.lng);
    const cy = worldY(center.lat);
    return {
      scale,
      toScreen: (lat: number, lng: number) => ({
        x: worldX(lng) - cx + size.w / 2,
        y: worldY(lat) - cy + size.h / 2,
      }),
      originX: cx - size.w / 2,
      originY: cy - size.h / 2,
    };
  }, [center, zoom, size]);

  const tiles = useMemo(() => {
    const n = Math.pow(2, zoom);
    const x0 = Math.floor(project.originX / TILE);
    const y0 = Math.floor(project.originY / TILE);
    const x1 = Math.floor((project.originX + size.w) / TILE);
    const y1 = Math.floor((project.originY + size.h) / TILE);
    const out: { x: number; y: number; left: number; top: number; key: string }[] = [];
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        if (y < 0 || y >= n) continue;
        const wrapped = ((x % n) + n) % n;
        out.push({
          x: wrapped,
          y,
          left: x * TILE - project.originX,
          top: y * TILE - project.originY,
          key: `${zoom}/${x}/${y}`,
        });
      }
    }
    return out;
  }, [project, zoom, size]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, lat: center.lat, lng: center.lng };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const degPerPx = 360 / project.scale;
    const newLng = drag.current.lng - dx * degPerPx;
    // small-angle approximation is plenty at these zoom levels
    const newLat = drag.current.lat + dy * degPerPx * Math.cos((drag.current.lat * Math.PI) / 180);
    setCenter({ lat: Math.max(-85, Math.min(85, newLat)), lng: newLng });
  }

  return (
    <div>
      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        className="relative h-[60vh] min-h-80 w-full cursor-grab touch-none overflow-hidden rounded-sm border border-haze bg-paper-deep active:cursor-grabbing"
      >
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={t.key}
            src={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
            alt=""
            width={TILE}
            height={TILE}
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{ left: t.left, top: t.top, filter: "saturate(0.55) sepia(0.16) brightness(1.03)" }}
          />
        ))}

        {pins.map((p) => {
          const { x, y } = project.toScreen(p.lat, p.lng);
          if (x < -40 || y < -40 || x > size.w + 40 || y > size.h + 40) return null;
          return (
            <button
              key={p.slug}
              onClick={() => setActive(p)}
              aria-label={p.title}
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper transition-transform hover:scale-150"
              style={{ left: x, top: y, background: "var(--color-sindoor)" }}
            />
          );
        })}

        <div className="absolute right-3 top-3 flex flex-col gap-1">
          <button onClick={() => setZoom((z) => Math.min(18, z + 1))} className="btn btn-ghost h-8 w-8 bg-paper p-0">
            +
          </button>
          <button onClick={() => setZoom((z) => Math.max(2, z - 1))} className="btn btn-ghost h-8 w-8 bg-paper p-0">
            −
          </button>
        </div>

        <span className="mono absolute bottom-1 right-2 text-[0.5625rem] text-ink-soft">© openstreetmap</span>
      </div>

      {active && (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-sm border border-haze p-4">
          <div>
            <Link href={`/m/${active.slug}`} className="display text-xl hover:text-sindoor">
              {active.title}
            </Link>
            <p className="mono text-[0.625rem] text-ink-soft">
              {prettyDate(active.happenedOn)}
              {active.placeName ? ` · ${active.placeName}` : ""}
            </p>
          </div>
          <button onClick={() => setActive(null)} className="eyebrow underline underline-offset-4">
            close
          </button>
        </div>
      )}
    </div>
  );
}
