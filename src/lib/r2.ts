import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Configured = () =>
  Boolean(
    process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID),
  );

export const BUCKET = () => process.env.R2_BUCKET ?? "";

function endpoint() {
  if (process.env.R2_ENDPOINT) return process.env.R2_ENDPOINT;
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

let _client: S3Client | null = null;
export function r2() {
  if (!r2Configured()) return null;
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: endpoint(),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

/**
 * Bucket layout (PRD §6):
 *   thumb/{memory_id}/{media_id}.webp
 *   web/{memory_id}/{media_id}.webp
 *   voice/{memory_id}/{media_id}.webm
 */
export function objectKey(rendition: "thumb" | "web" | "orig" | "voice", memoryId: string, mediaId: string) {
  const ext = rendition === "voice" ? "webm" : rendition === "orig" ? "jpg" : "webp";
  return `${rendition}/${memoryId}/${mediaId}.${ext}`;
}

export async function presignPut(key: string, contentType: string, expiresIn = 600) {
  const client = r2();
  if (!client) throw new Error("R2 is not configured");
  return getSignedUrl(client, new PutObjectCommand({ Bucket: BUCKET(), Key: key, ContentType: contentType }), {
    expiresIn,
  });
}

export async function getObject(key: string) {
  const client = r2();
  if (!client) return null;
  try {
    return await client.send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }));
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  const client = r2();
  if (!client) return;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
  } catch (err) {
    console.error("[r2] delete failed", key, err);
  }
}
