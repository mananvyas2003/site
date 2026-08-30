import MapView from "@/components/MapView";
import { requirePage } from "@/lib/guard";
import { getMapPins } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** MapLibre + free OSM tiles. Not Google Maps — that means a billing account. */
export default async function MapPage() {
  await requirePage();
  const pins = await getMapPins();

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
      <p className="eyebrow">the map</p>
      <h1 className="display mt-3 text-[clamp(2rem,7vw,3.5rem)]">
        everywhere we <em>went</em>
      </h1>
      <p className="mt-4 text-ink-soft">
        {pins.length === 0
          ? "no memory has coordinates yet. photos with gps in them get pinned automatically."
          : `${pins.length} place${pins.length === 1 ? "" : "s"}, read out of the photos.`}
      </p>

      <div className="mt-8">
        <MapView
          pins={pins.flatMap((p) =>
            p.lat != null && p.lng != null ? [{ ...p, lat: p.lat, lng: p.lng }] : [],
          )}
        />
      </div>
    </main>
  );
}
