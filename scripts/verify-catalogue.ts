import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, PublicationStatus } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const [activeProducts, archivedSamples, productsWithImages, categories, brands, stockRows, pricedProducts] = await Promise.all([
    db.product.count({ where: { status: PublicationStatus.ACTIVE, sku: { startsWith: "INV-" } } }),
    db.product.count({ where: { status: PublicationStatus.ARCHIVED, sku: { startsWith: "SAMPLE-" } } }),
    db.product.count({ where: { status: PublicationStatus.ACTIVE, sku: { startsWith: "INV-" }, images: { some: {} } } }),
    db.category.count({ where: { status: PublicationStatus.ACTIVE } }),
    db.brand.count({ where: { status: PublicationStatus.ACTIVE } }),
    db.inventory.count({ where: { variant: { product: { status: PublicationStatus.ACTIVE, sku: { startsWith: "INV-" } } } } }),
    db.product.count({ where: { status: PublicationStatus.ACTIVE, sku: { startsWith: "INV-" }, standardPriceMinor: { gt: 0 } } }),
  ]);
  console.log(JSON.stringify({ activeProducts, archivedSamples, productsWithImages, pricedProducts, categories, brands, stockRows }, null, 2));
} finally {
  await db.$disconnect();
}
