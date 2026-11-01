import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

import { getEnv } from "@/lib/env";

const MAX_BYTES = 5 * 1024 * 1024;
const NEON_PRODUCT_IMAGE_BUCKET = "product-images";

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

function resolveS3(env: ReturnType<typeof getEnv>) {
  const endpoint = env.AWS_ENDPOINT_URL_S3 ?? env.S3_ENDPOINT;
  const region = env.AWS_REGION ?? env.S3_REGION;
  const bucket = env.S3_BUCKET ?? (env.AWS_ENDPOINT_URL_S3 ? NEON_PRODUCT_IMAGE_BUCKET : undefined);
  const accessKeyId = env.AWS_ACCESS_KEY_ID ?? env.S3_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY ?? env.S3_SECRET_ACCESS_KEY;
  const publicUrl = env.S3_PUBLIC_URL ?? (endpoint && bucket ? `${endpoint.replace(/\/$/, "")}/${bucket}` : undefined);
  return { endpoint, region, bucket, accessKeyId, secretAccessKey, publicUrl };
}

function s3Client(config: ReturnType<typeof resolveS3>) {
  return new S3Client({
    region: config.region!,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.endpoint),
    credentials: { accessKeyId: config.accessKeyId!, secretAccessKey: config.secretAccessKey! },
  });
}

export async function storeProductImage(productId: string, file: File): Promise<StoredProductImage> {
  const normalized = await normalize(file);
  const storageKey = `products/${productId}/${randomUUID()}.webp`;
  const env = getEnv();
  const storage = resolveS3(env);
  const hasS3 = storage.bucket && storage.region && storage.accessKeyId && storage.secretAccessKey && storage.publicUrl;
  if (hasS3) {
    await s3Client(storage).send(new PutObjectCommand({ Bucket: storage.bucket, Key: storageKey, Body: normalized.buffer, ContentType: "image/webp", CacheControl: "public,max-age=31536000,immutable" }));
    return { storageKey, url: `${storage.publicUrl!.replace(/\/$/, "")}/${storageKey}`, width: normalized.width, height: normalized.height };
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
  const storage = resolveS3(env);
  if (!storage.bucket || !storage.region || !storage.accessKeyId || !storage.secretAccessKey) throw new Error("S3 storage is not configured");
  await s3Client(storage).send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: storageKey }));
}
