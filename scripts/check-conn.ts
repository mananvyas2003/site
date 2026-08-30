import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

async function neonCheck() {
  const url = process.env.DATABASE_URL;
  if (!url) return console.log("NEON   — DATABASE_URL empty");
  try {
    const sql = neon(url);
    const r = await sql`select current_database() as db, version() as v`;
    console.log("NEON   ok   db=" + r[0].db + "  " + String(r[0].v).split(",")[0]);
    const t = await sql`select table_name from information_schema.tables where table_schema='public' order by table_name`;
    console.log("       tables: " + (t.length ? t.map((x: any) => x.table_name).join(", ") : "(none — run npm run db:push)"));
  } catch (e) {
    console.log("NEON   FAILED: " + (e as Error).message);
  }
}

async function r2Check() {
  const { R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT } = process.env;
  if (!R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
    return console.log("R2     — credentials incomplete");
  }
  const s3 = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  try {
    const list = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 5 }));
    console.log("R2     ok   bucket=" + R2_BUCKET + "  objects=" + (list.KeyCount ?? 0));
  } catch (e) {
    return console.log("R2     LIST FAILED: " + (e as Error).message);
  }
  // a real round trip: the app does put -> get -> delete, so test all three
  const key = "web/_connection-check/probe.txt";
  try {
    await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: "ok", ContentType: "text/plain" }));
    const got = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    const body = await got.Body!.transformToString();
    await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    console.log("       write/read/delete: " + (body === "ok" ? "ok" : "MISMATCH"));
  } catch (e) {
    console.log("       WRITE FAILED: " + (e as Error).message + "  (token needs Object Read & Write)");
  }
}

async function main() {
  await neonCheck();
  await r2Check();
}

main();
