import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/guard";

export const runtime = "nodejs";

/**
 * Reverse geocode via OpenStreetMap Nominatim — free, no key, no billing
 * account. Proxied through the server so the coordinates in your EXIF never
 * leave as a browser request with your IP attached to them.
 *
 * Nominatim's usage policy asks for a real User-Agent and at most 1 req/sec.
 * A two-person app hits that ceiling exactly never.
 */
export async function GET(req: NextRequest) {
  const me = await requireApi();
  if (!me) return NextResponse.json({ error: "nope" }, { status: 401 });

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        headers: { "User-Agent": "manno-weds-momo/1.0 (private archive)", "Accept-Language": "en" },
        next: { revalidate: 86400 },
      },
    );
    if (!res.ok) return NextResponse.json({ placeName: null, city: null });

    const data = (await res.json()) as {
      name?: string;
      address?: Record<string, string>;
      display_name?: string;
    };
    const a = data.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.state_district ?? a.county ?? null;
    const placeName =
      data.name ||
      a.amenity ||
      a.leisure ||
      a.tourism ||
      a.shop ||
      a.building ||
      a.road ||
      a.suburb ||
      a.neighbourhood ||
      city;

    return NextResponse.json({ placeName: placeName ?? null, city: city ?? null });
  } catch {
    return NextResponse.json({ placeName: null, city: null });
  }
}
