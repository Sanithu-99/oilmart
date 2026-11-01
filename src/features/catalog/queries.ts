import "server-only";

import { cache } from "react";

import { PublicationStatus, type Prisma } from "@/generated/prisma/client";
import { getCustomerPricingContext } from "@/features/customer/auth/authorization";
import { resolvePromotionUnitPrice, type ApplicablePromotion } from "@/features/pricing/promotions";
import { db } from "@/lib/db/client";
import { localeToDb, type StoreLocale } from "@/lib/i18n/config";

const productInclude = {
  brand: true,
  category: { include: { translations: true } },
  translations: true,
  images: { orderBy: [{ primary: "desc" }, { sortOrder: "asc" }] },
  variants: {
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { inventory: true },
  },
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function decimalNumber(value: { toString(): string } | null | undefined): number {
  return Number(value?.toString() ?? 0);
}

export type StoreProduct = ReturnType<typeof presentProduct>;

export function presentProduct(product: ProductRecord, locale: StoreLocale, pricing: { loyaltyEligible: boolean; promotions: readonly ApplicablePromotion[] } = { loyaltyEligible: false, promotions: [] }) {
  const dbLocale = localeToDb[locale];
  const translation = product.translations.find((item) => item.locale === dbLocale);
  const categoryTranslation = product.category.translations.find((item) => item.locale === dbLocale);
  const variant = product.variants[0] ?? null;
  const onHand = decimalNumber(variant?.inventory?.quantityOnHand);
  const reserved = decimalNumber(variant?.inventory?.quantityReserved);
  const available = Math.max(0, onHand - reserved);
  const standardPriceMinor = variant?.priceOverrideMinor ?? product.standardPriceMinor;
  const loyaltyPriceMinor = variant?.loyaltyPriceMinor ?? product.loyaltyPriceMinor;
  const basePriceMinor = pricing.loyaltyEligible && loyaltyPriceMinor != null ? loyaltyPriceMinor : standardPriceMinor;
  const promotion = resolvePromotionUnitPrice({ productId: product.id, categoryId: product.categoryId, baseUnitPriceMinor: basePriceMinor, loyaltyEligible: pricing.loyaltyEligible, promotions: pricing.promotions });
  const applicablePromotion = promotion && promotion.unitPriceMinor >= 0n && promotion.unitPriceMinor < basePriceMinor ? promotion : null;
  const priceMinor = applicablePromotion?.unitPriceMinor ?? basePriceMinor;

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: translation?.name ?? product.name,
    shortDescription: translation?.shortDescription ?? product.shortDescription,
    description: translation?.description ?? product.description,
    technicalSpecs: (translation?.technicalSpecs ?? product.technicalSpecs) as Record<string, unknown> | null,
    usedFallback: locale !== "en" && !translation,
    priceMinor,
    standardPriceMinor,
    loyaltyPriceMinor,
    priceSource: applicablePromotion ? "PROMOTION" as const : pricing.loyaltyEligible && loyaltyPriceMinor != null ? "LOYALTY" as const : "STANDARD" as const,
    currency: product.currency,
    type: product.type,
    unitOfSale: product.unitOfSale,
    featured: product.featured,
    createdAt: product.createdAt,
    brand: product.brand ? { name: product.brand.name, slug: product.brand.slug } : null,
    category: {
      name: categoryTranslation?.name ?? product.category.name,
      slug: product.category.slug,
    },
    images: product.images.map((image) => ({
      url: image.url,
      alt: image.altText,
      width: image.width ?? 900,
      height: image.height ?? 900,
    })),
    variant: variant
      ? {
          id: variant.id,
          sku: variant.sku,
          name: variant.name,
          minQuantity: variant.minQuantity.toString(),
          quantityStep: variant.quantityStep.toString(),
          available,
        }
      : null,
    available,
    inStock: available > 0,
  };
}

async function getStorefrontPricing() {
  const now = new Date();
  const [context, promotions] = await Promise.all([
    getCustomerPricingContext(),
    db.promotion.findMany({
      where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      include: { products: true, categories: true },
    }),
  ]);
  return {
    loyaltyEligible: context.loyaltyEligible,
    promotions: promotions.map((promotion) => ({ ...promotion, productIds: promotion.products.map((item) => item.productId), categoryIds: promotion.categories.map((item) => item.categoryId) })),
  };
}

export const getNavigationData = cache(async (locale: StoreLocale) => {
  const [categories, brands] = await Promise.all([
    db.category.findMany({
      where: { status: PublicationStatus.ACTIVE },
      include: { translations: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.brand.findMany({
      where: { status: PublicationStatus.ACTIVE },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  const dbLocale = localeToDb[locale];
  return {
    categories: categories.map((category) => ({
      slug: category.slug,
      name: category.translations.find((item) => item.locale === dbLocale)?.name ?? category.name,
      description: category.translations.find((item) => item.locale === dbLocale)?.description ?? category.description,
    })),
    brands: brands.map(({ slug, name, logoUrl }) => ({ slug, name, logoUrl })),
  };
});

export async function getHomepageData(locale: StoreLocale) {
  const now = new Date();
  const [navigation, featuredRecords, newRecords, promotions, hero, pricing] = await Promise.all([
    getNavigationData(locale),
    db.product.findMany({
      where: { status: PublicationStatus.ACTIVE, featured: true },
      include: productInclude,
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.product.findMany({
      where: { status: PublicationStatus.ACTIVE },
      include: productInclude,
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.promotion.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { startsAt: "desc" },
      take: 1,
    }),
    db.contentEntry.findUnique({ where: { key_locale: { key: "homepage.hero", locale: localeToDb[locale] } } }),
    getStorefrontPricing(),
  ]);

  return {
    ...navigation,
    featured: featuredRecords.map((product) => presentProduct(product, locale, pricing)),
    newArrivals: newRecords.map((product) => presentProduct(product, locale, pricing)),
    promotion: promotions[0] ?? null,
    hero: hero?.status === PublicationStatus.ACTIVE ? { title: hero.title, body: hero.body } : null,
  };
}

export type CatalogFilters = {
  q?: string;
  category?: string;
  brand?: string;
  availability?: "in" | "out";
  sort?: "newest" | "price-asc" | "price-desc";
  page?: number;
};

export async function getCatalog(locale: StoreLocale, filters: CatalogFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 8;
  let category = filters.category;
  if (category) {
    const redirect = await db.slugRedirect.findUnique({ where: { entityType_fromSlug: { entityType: "category", fromSlug: category } } });
    category = redirect?.toSlug ?? category;
  }
  const where: Prisma.ProductWhereInput = {
    status: PublicationStatus.ACTIVE,
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" } },
            { sku: { contains: filters.q, mode: "insensitive" } },
            { brand: { name: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(filters.brand ? { brand: { slug: filters.brand } } : {}),
    ...(filters.availability
      ? {
          variants: {
            some: {
              active: true,
              inventory:
                filters.availability === "in"
                  ? { quantityOnHand: { gt: 0 } }
                  : { quantityOnHand: { lte: 0 } },
            },
          },
        }
      : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "price-asc"
      ? { standardPriceMinor: "asc" }
      : filters.sort === "price-desc"
        ? { standardPriceMinor: "desc" }
        : { createdAt: "desc" };

  const [total, records, navigation, pricing] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, include: productInclude, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    getNavigationData(locale),
    getStorefrontPricing(),
  ]);

  return {
    ...navigation,
    products: records.map((record) => presentProduct(record, locale, pricing)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export const getProductBySlug = cache(async (slug: string, locale: StoreLocale) => {
  const record = await db.product.findFirst({
    where: { slug, status: PublicationStatus.ACTIVE },
    include: {
      ...productInclude,
      relatedFrom: {
        orderBy: { sortOrder: "asc" },
        include: { targetProduct: { include: productInclude } },
      },
    },
  });
  if (!record) return null;
  const pricing = await getStorefrontPricing();
  const product = presentProduct(record, locale, pricing);
  const manual = record.relatedFrom.map((item) => presentProduct(item.targetProduct, locale, pricing));
  const related = manual.length
    ? manual
    : (
        await db.product.findMany({
          where: { id: { not: record.id }, categoryId: record.categoryId, status: PublicationStatus.ACTIVE },
          include: productInclude,
          take: 4,
          orderBy: { createdAt: "desc" },
        })
      ).map((item) => presentProduct(item, locale, pricing));
  return { product, related };
});

export async function getProductSlugRedirect(slug: string) {
  return db.slugRedirect.findUnique({ where: { entityType_fromSlug: { entityType: "product", fromSlug: slug } }, select: { toSlug: true } });
}

export async function getSitemapProducts() {
  return db.product.findMany({ where: { status: PublicationStatus.ACTIVE }, select: { slug: true, updatedAt: true } });
}
