type Bucket = { count: number; resetsAt: number };

const globalBuckets = globalThis as unknown as { cartRateLimitBuckets?: Map<string, Bucket> };
const buckets = globalBuckets.cartRateLimitBuckets ?? new Map<string, Bucket>();
if (process.env.NODE_ENV !== "production") globalBuckets.cartRateLimitBuckets = buckets;

export function assertCartMutationRate(key: string, now = Date.now()) {
  const windowMs = 60_000;
  const maximum = 60;
  const current = buckets.get(key);
  if (!current || current.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return;
  }
  if (current.count >= maximum) throw new Error("Too many cart updates. Please wait a moment.");
  current.count += 1;

  if (buckets.size > 2_000) {
    for (const [bucketKey, bucket] of buckets) if (bucket.resetsAt <= now) buckets.delete(bucketKey);
  }
}
