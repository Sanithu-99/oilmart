import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

import { getEnv } from "@/lib/env";

const MAX_BYTES = 5 * 1024 * 1024;

export type StoredProductImage = { storageKey: string; url: string; width: number; height: number };

async function normalize(file: File) {
  if (file.size <= 0 || file.size > MAX_BYTES) throw new Error("Image must be between 1 byte and 5 MB");
  const input = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height || !["jpeg", "png", "webp", "avif"].includes(metadata.format ?? "")) {
    throw new Error("Upload a valid JPEG, PNG, WebP, or AVIF image");
  }
  if (metadata.width < 320 || metadata.height < 320 || metadata.width > 8_000 || metadata.height > 8_000) {
    throw new Error("Image dimensions must be between 320 and 8,000 pixels");
  }
  const output = await sharp(input).rotate().resize({ width: 2_000, height: 2_000, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  return { buffer: output.data, width: output.info.width, height: output.info.height };
}

function s3Client(env: ReturnType<typeof getEnv>) {
  return new S3Client({
    region: env.S3_REGION!,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: Boolean(env.S3_ENDPOINT),
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
  });
}

export async function storeProductImage(productId: string, file: File): Promise<StoredProductImage> {
  const normalized = await normalize(file);
  const storageKey = `products/${productId}/${randomUUID()}.webp`;
  const env = getEnv();
  const hasS3 = env.S3_BUCKET && env.S3_REGION && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_PUBLIC_URL;
  if (hasS3) {
    await s3Client(env).send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: storageKey, Body: normalized.buffer, ContentType: "image/webp", CacheControl: "public,max-age=31536000,immutable" }));
    return { storageKey, url: `${env.S3_PUBLIC_URL!.replace(/\/$/, "")}/${storageKey}`, width: normalized.width, height: normalized.height };
  }
  if (env.NODE_ENV === "production") throw new Error("S3-compatible image storage must be configured in production");
  const destination = path.join(process.cwd(), "public", "uploads", storageKey);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, normalized.buffer, { flag: "wx" });
  return { storageKey: `local/${storageKey}`, url: `/uploads/${storageKey}`, width: normalized.width, height: normalized.height };
}

export async function removeProductImage(storageKey: string) {
  const env = getEnv();
  if (storageKey.startsWith("local/")) {
    if (env.NODE_ENV === "production") throw new Error("Local image deletion is disabled in production");
    const relative = storageKey.slice("local/".length);
    const destination = path.join(process.cwd(), "public", "uploads", relative);
    if (!destination.startsWith(path.join(process.cwd(), "public", "uploads"))) throw new Error("Invalid storage key");
    await unlink(destination).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    return;
  }
  if (!env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) throw new Error("S3 storage is not configured");
  await s3Client(env).send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: storageKey }));
}
