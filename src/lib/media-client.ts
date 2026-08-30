"use client";

import imageCompression from "browser-image-compression";
import exifr from "exifr";
import { encode } from "blurhash";

export type Prepared = {
  key: string; // local dedupe key
  name: string;
  web: Blob;
  thumb: Blob;
  width: number;
  height: number;
  bytes: number;
  blurhash: string | null;
  takenAt: string | null; // ISO
  lat: number | null;
  lng: number | null;
  previewUrl: string;
};

/**
 * Read EXIF, then re-encode. The re-encode happens through a canvas, which is
 * also what strips EXIF from the published rendition — we read your GPS to
 * place the memory and then never publish it (PRD §4.3).
 */
export async function prepareImage(file: File): Promise<Prepared> {
  let takenAt: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;

  try {
    const exif = await exifr.parse(file, { pick: ["DateTimeOriginal", "CreateDate", "latitude", "longitude"], gps: true });
    const when: Date | undefined = exif?.DateTimeOriginal ?? exif?.CreateDate;
    if (when instanceof Date && !Number.isNaN(when.getTime())) takenAt = when.toISOString();
    if (typeof exif?.latitude === "number") lat = exif.latitude;
    if (typeof exif?.longitude === "number") lng = exif.longitude;
  } catch {
    /* a phone screenshot has no exif; that's fine */
  }

  if (!takenAt && file.lastModified) takenAt = new Date(file.lastModified).toISOString();

  const web = await imageCompression(file, {
    maxWidthOrHeight: 1600,
    initialQuality: 0.8,
    fileType: "image/webp",
    useWebWorker: true,
    preserveExif: false,
  });

  const thumb = await imageCompression(file, {
    maxWidthOrHeight: 400,
    initialQuality: 0.72,
    fileType: "image/webp",
    useWebWorker: true,
    preserveExif: false,
  });

  const { width, height } = await imageSize(web);
  const blurhash = await hashOf(thumb);

  return {
    key: `${file.name}:${file.size}:${file.lastModified}`,
    name: file.name,
    web,
    thumb,
    width,
    height,
    bytes: web.size,
    blurhash,
    takenAt,
    lat,
    lng,
    previewUrl: URL.createObjectURL(thumb),
  };
}

function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) return createImageBitmap(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  try {
    const bmp = await loadBitmap(blob);
    const size = { width: bmp.width, height: bmp.height };
    if ("close" in bmp) bmp.close();
    return size;
  } catch {
    return { width: 0, height: 0 };
  }
}

/** 32px-wide blurhash so the grid never flashes grey. */
async function hashOf(blob: Blob): Promise<string | null> {
  try {
    const bmp = await loadBitmap(blob);
    const w = 32;
    const h = Math.max(1, Math.round((bmp.height / bmp.width) * 32));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bmp as CanvasImageSource, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    if ("close" in bmp) bmp.close();
    return encode(data.data, w, h, 4, 3);
  } catch {
    return null;
  }
}

/** The date the batch happened on — the earliest capture time we found. */
export function inferDate(items: Prepared[]): string | null {
  const stamps = items.map((i) => i.takenAt).filter(Boolean) as string[];
  if (stamps.length === 0) return null;
  return stamps.sort()[0].slice(0, 10);
}

export function inferUntil(items: Prepared[]): string | null {
  const stamps = items.map((i) => i.takenAt).filter(Boolean) as string[];
  if (stamps.length === 0) return null;
  const last = stamps.sort().at(-1)!.slice(0, 10);
  const first = stamps.sort()[0].slice(0, 10);
  return last !== first ? last : null;
}

export function inferCoords(items: Prepared[]): { lat: number; lng: number } | null {
  const withGps = items.filter((i) => i.lat != null && i.lng != null);
  if (withGps.length === 0) return null;
  const lat = withGps.reduce((a, i) => a + (i.lat as number), 0) / withGps.length;
  const lng = withGps.reduce((a, i) => a + (i.lng as number), 0) / withGps.length;
  return { lat, lng };
}

export async function uploadTo(url: string, blob: Blob, contentType: string) {
  const res = await fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": contentType } });
  if (!res.ok) throw new Error(`upload failed (${res.status})`);
}

/** Presigned PUT for a single allowed key. */
export async function presignUpload(key: string, contentType: string): Promise<string> {
  const res = await fetch("/api/upload/sign-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, contentType }),
  });
  const data = (await res.json().catch(() => ({}))) as { uploadUrl?: string; error?: string };
  if (!res.ok || !data.uploadUrl) throw new Error(data.error ?? `presign failed (${res.status})`);
  return data.uploadUrl;
}

/**
 * Upload a rendition. Prefers a presigned URL (browser → R2, required on Vercel —
 * serverless functions cap request bodies at 4.5 MB). Falls back to the app
 * proxy only on localhost when CORS isn't configured yet.
 */
export async function uploadRendition(
  key: string,
  blob: Blob,
  contentType: string,
  presignedUrl?: string | null,
) {
  if (presignedUrl) {
    await uploadTo(presignedUrl, blob, contentType);
    return;
  }

  const onLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (onLocalhost) {
    await uploadBlob(key, blob, contentType);
    return;
  }

  const url = await presignUpload(key, contentType);
  await uploadTo(url, blob, contentType);
}

/** Upload through the app server — localhost fallback when R2 CORS isn't set up. */
export async function uploadBlob(key: string, blob: Blob, contentType: string) {
  const form = new FormData();
  form.append("key", key);
  form.append("file", blob, key.split("/").pop() ?? "upload");
  const res = await fetch("/api/upload/put", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `upload failed (${res.status})`);
}
