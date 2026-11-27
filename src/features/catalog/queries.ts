import "server-only";

import { cache } from "react";

import { PublicationStatus, type Prisma } from "@/generated/prisma/client";
import { getCustomerPricingContext } from "@/features/customer/auth/authorization";
import { resolvePromotionUnitPrice, type ApplicablePromotion } from "@/features/pricing/promotions";
import { db } from "@/lib/db/client";
import { catalogueSections, offerTitle, productFamilyKey, publicProductName } from "@/lib/catalog/product-options";
import { manufacturerContent, withoutCompatibilityCopy } from "@/lib/catalog/manufacturer-content";
import { manufacturerImage } from "@/lib/catalog/manufacturer-images";
import { officialProductImage } from "@/lib/catalog/official-images";
import { localeToDb, type StoreLocale } from "@/lib/i18n/config";

const productInclude = {
  brand: true,
  category: { include: { translations: true } },
  translations: true,
  sourceCatalogueItems: { select: { sourceCategory: true } },
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

export type ClientCatalogProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string | null;
  priceMinor: string;
  standardPriceMinor: string;
  priceSource: "STANDARD" | "LOYALTY" | "PROMOTION";
  currency: string;
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string };
  catalogueSections: string[];
  variantCount: number;
  images: Array<{ url: string; alt: string; width: number; height: number }>;
  variant: { id: string; available: number } | null;
  available: number;
  inStock: boolean;
  grade: string | null;
  packSize: string | null;
  searchText: string;
};

export type ClientCatalogBrand = {
  slug: string;
  name: string;
  logoUrl: string | null;
  count: number;
};

function stringSpec(specs: Record<string, unknown> | null, names: string[]) {
  if (!specs) return null;
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const [key, value] of Object.entries(specs)) {
    if (wanted.has(key.toLowerCase()) && (typeof value === "string" || typeof value === "number")) return String(value).trim();
  }
  return null;
}

function productPackSize(product: StoreProduct) {
  const fromSpecs = stringSpec(product.technicalSpecs, ["Pack", "Pack size", "Supplier pack size", "Volume", "Size"]);
  if (fromSpecs) return fromSpecs;
  const source = `${product.name} ${product.shortDescription ?? ""}`;
  return source.match(/\b\d+(?:\.\d+)?\s*(?:ml|l|lt|litre|liter|kg|g|gal)\b/i)?.[0]?.replace(/\blt\b/i, "L") ?? null;
}

function productGrade(product: StoreProduct) {
  const fromSpecs = stringSpec(product.technicalSpecs, ["Grade", "Viscosity", "SAE grade", "Supplier specification"]);
  const source = `${fromSpecs ?? ""} ${product.name} ${product.shortDescription ?? ""}`;
  const viscosity = source.match(/\b(?:0|5|10|15|20|25)\s*w\s*[- ]?\s*\d{2}\b/i)?.[0];
  if (viscosity) return viscosity.replace(/\s+/g, "").replace(/w-?/i, "W-");
  const atf = source.match(/\b(?:ATF\s*)?(?:DEXRON|DEX)\s*(?:II|III|IV|VI|2|3|4|6)\b/i)?.[0];
  if (atf) return atf.toUpperCase().replace(/^DEX\s*/, "DEXRON ").replace(/\s+/g, " ");
  const specialist = source.match(/\b(?:CVTF|CVT|DCTF|ATF|DOT\s*[345]|SAE\s*\d{2,3})\b/i)?.[0];
  return specialist?.toUpperCase().replace(/\s+/g, " ") ?? null;
}

function clientProduct(product: StoreProduct): ClientCatalogProduct {
  const grade = productGrade(product);
  const packSize = productPackSize(product);
  const searchText = [
    product.name,
    product.sku,
    product.brand?.name,
    product.category.name,
    grade,
    packSize,
    ...product.catalogueSections,
    grade?.replace(/[^a-z0-9]/gi, ""),
  ].filter(Boolean).join(" ").toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    shortDescription: product.shortDescription,
    priceMinor: product.priceMinor.toString(),
    standardPriceMinor: product.standardPriceMinor.toString(),
    priceSource: product.priceSource,
    currency: product.currency,
    brand: product.brand,
    category: product.category,
    catalogueSections: product.catalogueSections,
    variantCount: product.variants.length,
    images: product.images,
    variant: product.variant ? { id: product.variant.id, available: product.variant.available } : null,
    available: product.available,
    inStock: product.inStock,
    grade,
    packSize,
    searchText,
  };
}

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
  const manufacturer = manufacturerContent(product.brand?.name, product.name);
  const verifiedImage = officialProductImage(product.sku) ?? manufacturerImage(product.brand?.name, product.name);
  const hasOwnerImage = product.images.some((image) => !image.url.startsWith("/images/products/inventory/"));
  const description = translation?.description ?? product.description;

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: offerTitle(publicProductName(translation?.name ?? product.name, product.sku), product.technicalSpecs as Record<string, unknown> | null),
    shortDescription: translation?.shortDescription ?? product.shortDescription,
    description: withoutCompatibilityCopy(manufacturer && (!description || description.startsWith("Available from Saranankara")) ? manufacturer.description : description),
    manufacturerUrl: manufacturer?.url ?? null,
    technicalSpecs: (translation?.technicalSpecs ?? product.technicalSpecs) as Record<string, unknown> | null,
    usedFallback: locale !== "en" && !translation,
    priceMinor,
    standardPriceMinor,
    loyaltyPriceMinor,
    priceSource: applicablePromotion ? "PROMOTION" as const : pricing.loyaltyEligible && loyaltyPriceMinor != null ? "LOYALTY" as const : "STANDARD" as const,
    currency: product.currency,
    type: product.type,
    acceptsPreOrders: product.acceptsPreOrders,
    unitOfSale: product.unitOfSale,
    featured: product.featured,
    createdAt: product.createdAt,
    brand: product.brand ? { name: product.brand.name, slug: product.brand.slug } : null,
    category: {
      name: categoryTranslation?.name ?? product.category.name,
      slug: product.category.slug,
    },
    catalogueSections: catalogueSections(product.sourceCatalogueItems.map((item) => item.sourceCategory), product.brand?.name, categoryTranslation?.name ?? product.category.name),
    variants: product.variants.map((item) => {
      const standard = item.priceOverrideMinor ?? product.standardPriceMinor;
      const loyalty = item.loyaltyPriceMinor ?? product.loyaltyPriceMinor;
      const base = pricing.loyaltyEligible && loyalty != null ? loyalty : standard;
      const promotion = resolvePromotionUnitPrice({ productId: product.id, categoryId: product.categoryId, baseUnitPriceMinor: base, loyaltyEligible: pricing.loyaltyEligible, promotions: pricing.promotions });
      return { id: item.id, name: item.name, priceMinor: (promotion?.unitPriceMinor ?? base).toString(), standardPriceMinor: standard.toString(), available: Math.max(0, decimalNumber(item.inventory?.quantityOnHand) - decimalNumber(item.inventory?.quantityReserved)), minQuantity: item.minQuantity.toString(), quantityStep: item.quantityStep.toString() };
    }),
    images: verifiedImage && !hasOwnerImage ? [verifiedImage] : product.images.map((image) => ({
      url: image.url,
      alt: publicProductName(image.altText),
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

export const getHomepagePromotion = cache(async () => {
  const now = new Date();
  return db.promotion.findFirst({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { startsAt: "desc" },
  });
});

export type CatalogFilters = {
  q?: string;
  category?: string;
  brand?: string;
  application?: string;
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

export async function getCatalogExperienceData(locale: StoreLocale) {
  const [records, navigation, pricing] = await Promise.all([
    db.product.findMany({
      where: { status: PublicationStatus.ACTIVE },
      include: productInclude,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
    getNavigationData(locale),
    getStorefrontPricing(),
  ]);
  const products = records.map((record) => clientProduct(presentProduct(record, locale, pricing)));
  const counts = new Map<string, number>();
  for (const product of products) {
    if (product.brand) counts.set(product.brand.slug, (counts.get(product.brand.slug) ?? 0) + 1);
  }
  const preferred = ["caltex", "mobil", "valvoline", "castrol", "laugfs", "toyota"];
  const brands: ClientCatalogBrand[] = navigation.brands
    .map((brand) => ({ ...brand, count: counts.get(brand.slug) ?? 0 }))
    .filter((brand) => brand.count > 0)
    .sort((a, b) => {
      const left = preferred.indexOf(a.slug);
      const right = preferred.indexOf(b.slug);
      if (left >= 0 || right >= 0) return (left < 0 ? preferred.length : left) - (right < 0 ? preferred.length : right);
      return b.count - a.count || a.name.localeCompare(b.name);
    });

  return { products, brands, categories: navigation.categories, total: products.length };
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
  const manual = record.relatedFrom.filter((item) => item.targetProduct.status === PublicationStatus.ACTIVE).map((item) => presentProduct(item.targetProduct, locale, pricing));
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
  const candidates = await db.product.findMany({ where: { status: PublicationStatus.ACTIVE, brandId: record.brandId, categoryId: record.categoryId, type: record.type }, include: productInclude });
  const family = productFamilyKey(record.name);
  const sizes = candidates.filter((item) => productFamilyKey(item.name) === family).map((item) => ({ slug: item.slug, name: presentProduct(item, locale, pricing).name }));
  return { product, related, sizes };
});

export async function getProductSlugRedirect(slug: string) {
  return db.slugRedirect.findUnique({ where: { entityType_fromSlug: { entityType: "product", fromSlug: slug } }, select: { toSlug: true } });
}

export async function getSitemapProducts() {
  return db.product.findMany({ where: { status: PublicationStatus.ACTIVE }, select: { slug: true, updatedAt: true } });
}
