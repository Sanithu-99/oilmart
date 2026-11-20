import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  Locale,
  PrismaClient,
  ProductType,
  PublicationStatus,
  UnitOfSale,
} from "../src/generated/prisma/client";
import { applicationsForInventoryProduct } from "../src/lib/catalog/applications";
import caltexRetailPriceList from "./data/caltex-retail-price-list-2026-10-26.json";
import inventoryProducts from "./data/inventory-products.json";
import inventoryReportSource from "./data/inventory-report-source-2026-10-14.json";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the database");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const caltexByProductSku = new Map(
  caltexRetailPriceList.items.flatMap((item) => item.matchedProductSku ? [[item.matchedProductSku, item] as const] : []),
);

const permissions = [
  "admin.dashboard.read",
  "catalog.read",
  "catalog.write",
  "inventory.read",
  "inventory.adjust",
  "orders.read",
  "orders.manage",
  "customers.read",
  "customers.manage",
  "loyalty.manage",
  "preorders.manage",
  "quotations.manage",
  "promotions.manage",
  "content.manage",
  "settings.manage",
  "audit.read",
] as const;

const rolePermissionMap: Record<string, readonly string[]> = {
  owner: permissions,
  admin: permissions.filter((permission) => permission !== "settings.manage"),
  inventory_manager: ["admin.dashboard.read", "catalog.read", "inventory.read", "inventory.adjust"],
  order_manager: [
    "admin.dashboard.read",
    "catalog.read",
    "inventory.read",
    "orders.read",
    "orders.manage",
    "preorders.manage",
    "quotations.manage",
  ],
  support: [
    "admin.dashboard.read",
    "catalog.read",
    "orders.read",
    "customers.read",
    "customers.manage",
    "loyalty.manage",
  ],
};

const categories = [
  ["engine-oils", "Engine Oils", "Petrol and passenger-vehicle engine oils in current stock."],
  ["diesel-engine-oils", "Diesel Engine Oils", "Lubricants for diesel engines, commercial vehicles and fleets."],
  ["motorcycle-oils", "Motorcycle Oils", "Two-stroke and four-stroke oils for motorcycles and three-wheelers."],
  ["transmission-fluids", "Transmission Fluids", "ATF, CVT and other automatic transmission fluids."],
  ["gear-oils", "Gear Oils", "Manual transmission and differential lubricants."],
  ["suspension-fluids", "Suspension Fluids", "Fork and shock-absorber fluids."],
  ["coolants", "Coolants", "Radiator coolants and antifreeze products."],
  ["brake-fluids", "Brake Fluids", "DOT-rated brake and clutch fluids."],
  ["greases-lubricants", "Greases & Lubricants", "Greases, hydraulic oils and specialist lubricants."],
  ["filters", "Filters", "Oil, fuel and air filters for popular vehicle applications."],
  ["additives-cleaners", "Additives & Cleaners", "Fuel, engine and radiator treatments and cleaners."],
  ["car-care", "Car Care", "Cleaning, polishing, interior and exterior care products."],
  ["battery-care", "Battery Care", "Battery water, acid and related maintenance products."],
  ["loose-oils", "Loose Oils", "Workshop oils sold by measured quantity."],
  ["automotive-accessories", "Automotive Accessories", "Useful workshop, maintenance and vehicle accessories."],
] as const;

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const permissionRecords = new Map<string, string>();
  for (const key of permissions) {
    const permission = await db.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
    permissionRecords.set(key, permission.id);
  }

  for (const [key, assignedPermissions] of Object.entries(rolePermissionMap)) {
    const role = await db.role.upsert({
      where: { key },
      update: {},
      create: {
        key,
        name: key
          .split("_")
          .map((part) => part[0]!.toUpperCase() + part.slice(1))
          .join(" "),
        system: true,
      },
    });

    await db.rolePermission.createMany({
      data: assignedPermissions.map((permissionKey) => ({
        roleId: role.id,
        permissionId: permissionRecords.get(permissionKey)!,
      })),
      skipDuplicates: true,
    });
  }

  for (const [legacyKey, currentKey] of [["administrator", "admin"], ["customer_support", "support"]] as const) {
    const [legacyRole, currentRole] = await Promise.all([
      db.role.findUnique({ where: { key: legacyKey }, include: { users: true } }),
      db.role.findUniqueOrThrow({ where: { key: currentKey } }),
    ]);
    if (legacyRole) {
      await db.userRole.createMany({
        data: legacyRole.users.map(({ userId }) => ({ userId, roleId: currentRole.id })),
        skipDuplicates: true,
      });
      await db.role.delete({ where: { id: legacyRole.id } });
    }
  }

  const categoryRecords = new Map<string, string>();
  for (const [sortOrder, [slug, name, description]] of categories.entries()) {
    const category = await db.category.upsert({
      where: { slug },
      update: { name, description, sortOrder, status: PublicationStatus.ACTIVE },
      create: { slug, name, description, sortOrder, status: PublicationStatus.ACTIVE },
    });
    categoryRecords.set(slug, category.id);
  }
  await db.category.updateMany({
    where: { slug: "other-automotive-products" },
    data: { status: PublicationStatus.ARCHIVED },
  });

  const brands = [...new Set(inventoryProducts.map((item) => item.brand).filter((brand): brand is string => Boolean(brand)))];
  const brandRecords = new Map<string, string>();
  for (const [sortOrder, name] of brands.sort((a, b) => a.localeCompare(b)).entries()) {
    const brand = await db.brand.upsert({
      where: { slug: slugify(name) },
      update: { name, sortOrder, status: PublicationStatus.ACTIVE },
      create: { slug: slugify(name), name, sortOrder, status: PublicationStatus.ACTIVE },
    });
    brandRecords.set(name, brand.id);
  }

  await db.product.updateMany({
    where: { sku: { startsWith: "SAMPLE-" } },
    data: { status: PublicationStatus.ARCHIVED, featured: false },
  });
  await db.brand.updateMany({
    where: { slug: "sample-range" },
    data: { status: PublicationStatus.ARCHIVED },
  });

  const currentInventorySkus = inventoryProducts.map((item) => item.sku);
  await db.product.updateMany({
    where: { sku: { startsWith: "INV-", notIn: currentInventorySkus } },
    data: { status: PublicationStatus.ARCHIVED, featured: false },
  });

  async function upsertInventoryProduct(item: (typeof inventoryProducts)[number]) {
    const categoryId = categoryRecords.get(item.category);
    if (!categoryId) throw new Error(`Unknown inventory category: ${item.category}`);
    const priceListItem = caltexByProductSku.get(item.sku);
    const vehicleApplications = [
      ...new Set([
        ...applicationsForInventoryProduct(item),
        ...(priceListItem ? [priceListItem.applicationSlug] : []),
      ]),
    ];
    // Public product specifications stay customer-facing. Supplier material codes,
    // source rows and effective dates remain available through SourceCatalogueItem
    // in the admin dashboard instead of leaking into the storefront specification table.
    const technicalSpecs = item.specifications;
    const retailPriceMinor = BigInt(priceListItem?.retailPriceMinor ?? item.priceMinor);
    const product = await db.product.upsert({
      where: { sku: item.sku },
      update: {
        slug: item.slug,
        type: item.type as ProductType,
        name: item.name,
        shortDescription: item.shortDescription,
        description: item.description,
        technicalSpecs,
        standardPriceMinor: retailPriceMinor,
        loyaltyPriceMinor: null,
        vehicleApplications,
        categoryId,
        brandId: item.brand ? brandRecords.get(item.brand) ?? null : null,
        unitOfSale: item.unitOfSale as UnitOfSale,
        featured: item.featured,
        status: PublicationStatus.ACTIVE,
      },
      create: {
        sku: item.sku,
        slug: item.slug,
        type: item.type as ProductType,
        name: item.name,
        shortDescription: item.shortDescription,
        description: item.description,
        technicalSpecs,
        standardPriceMinor: retailPriceMinor,
        loyaltyPriceMinor: null,
        vehicleApplications,
        categoryId,
        brandId: item.brand ? brandRecords.get(item.brand) ?? null : null,
        unitOfSale: item.unitOfSale as UnitOfSale,
        featured: item.featured,
        status: PublicationStatus.ACTIVE,
      },
    });

    const variant = await db.productVariant.upsert({
      where: { sku: `${item.sku}-DEFAULT` },
      update: { productId: product.id, name: "Default", priceOverrideMinor: null, loyaltyPriceMinor: null, active: true },
      create: { productId: product.id, sku: `${item.sku}-DEFAULT`, name: "Default" },
    });
    await db.inventory.upsert({
      where: { variantId: variant.id },
      update: { quantityOnHand: item.quantity, quantityReserved: "0", lowStockThreshold: "3" },
      create: { variantId: variant.id, quantityOnHand: item.quantity, lowStockThreshold: "3" },
    });

    await db.productImage.deleteMany({ where: { productId: product.id, storageKey: "inventory-primary", ...(item.image ? { NOT: { url: item.image } } : {}) } });
    if (item.image) {
      await db.productImage.upsert({
        where: { productId_storageKey: { productId: product.id, storageKey: "inventory-primary" } },
        update: { url: item.image, altText: `${item.name} product pack`, width: 900, height: 900, primary: true },
        create: { productId: product.id, storageKey: "inventory-primary", url: item.image, altText: `${item.name} product pack`, width: 900, height: 900, primary: true },
      });
    }

    if (item.type === "LOOSE_OIL") {
      await db.looseOilConfig.upsert({
        where: { productId: product.id },
        update: { measurementLabel: "Per litre", minPurchaseQuantity: "1", purchaseIncrement: "1", predefinedQuantities: [1, 2, 4, 5] },
        create: { productId: product.id, measurementLabel: "Per litre", minPurchaseQuantity: "1", purchaseIncrement: "1", predefinedQuantities: [1, 2, 4, 5] },
      });
    } else {
      await db.looseOilConfig.deleteMany({ where: { productId: product.id } });
    }
  }

  for (let index = 0; index < inventoryProducts.length; index += 12) {
    await Promise.all(inventoryProducts.slice(index, index + 12).map(upsertInventoryProduct));
  }

  const productsBySku = new Map(
    (await db.product.findMany({
      where: { sku: { in: inventoryProducts.map((item) => item.sku) } },
      select: { id: true, sku: true, vehicleApplications: true },
    })).map((product) => [product.sku, product] as const),
  );

  const inventorySource = await db.catalogueSource.upsert({
    where: { key: "inventory-details-2026-10-14" },
    update: {
      title: inventoryReportSource.source.title,
      sourceFilename: "Inventory Details Report.pdf",
      effectiveDate: new Date(`${inventoryReportSource.source.effectiveDate}T00:00:00.000Z`),
      pageCount: inventoryReportSource.source.pages,
      currency: inventoryReportSource.source.currency,
      pricesIncludeVat: inventoryReportSource.source.pricesIncludeVat,
      retainedPriceColumn: inventoryReportSource.source.retainedPriceColumn,
      excludedColumns: inventoryReportSource.source.excludedPriceColumns,
    },
    create: {
      key: "inventory-details-2026-10-14",
      title: inventoryReportSource.source.title,
      sourceFilename: "Inventory Details Report.pdf",
      effectiveDate: new Date(`${inventoryReportSource.source.effectiveDate}T00:00:00.000Z`),
      pageCount: inventoryReportSource.source.pages,
      currency: inventoryReportSource.source.currency,
      pricesIncludeVat: inventoryReportSource.source.pricesIncludeVat,
      retainedPriceColumn: inventoryReportSource.source.retainedPriceColumn,
      excludedColumns: inventoryReportSource.source.excludedPriceColumns,
    },
  });

  const caltexSource = await db.catalogueSource.upsert({
    where: { key: "caltex-price-list-2026-10-26" },
    update: {
      title: caltexRetailPriceList.source.title,
      sourceFilename: "Caltex Price Revision 26th Oct 2026.pdf",
      effectiveDate: new Date(`${caltexRetailPriceList.source.effectiveDate}T00:00:00.000Z`),
      pageCount: caltexRetailPriceList.source.pages,
      currency: caltexRetailPriceList.source.currency,
      pricesIncludeVat: caltexRetailPriceList.source.pricesIncludeVat,
      retainedPriceColumn: caltexRetailPriceList.source.retainedPriceColumn,
      excludedColumns: caltexRetailPriceList.source.excludedPriceColumns,
    },
    create: {
      key: "caltex-price-list-2026-10-26",
      title: caltexRetailPriceList.source.title,
      sourceFilename: "Caltex Price Revision 26th Oct 2026.pdf",
      effectiveDate: new Date(`${caltexRetailPriceList.source.effectiveDate}T00:00:00.000Z`),
      pageCount: caltexRetailPriceList.source.pages,
      currency: caltexRetailPriceList.source.currency,
      pricesIncludeVat: caltexRetailPriceList.source.pricesIncludeVat,
      retainedPriceColumn: caltexRetailPriceList.source.retainedPriceColumn,
      excludedColumns: caltexRetailPriceList.source.excludedPriceColumns,
    },
  });

  await db.sourceCatalogueItem.deleteMany({
    where: {
      OR: [
        { sourceId: inventorySource.id, sourceKey: { notIn: inventoryReportSource.items.map((item) => item.sourceKey) } },
        { sourceId: caltexSource.id, sourceKey: { notIn: caltexRetailPriceList.items.map((item) => item.materialCode) } },
      ],
    },
  });

  for (let index = 0; index < inventoryReportSource.items.length; index += 20) {
    await Promise.all(inventoryReportSource.items.slice(index, index + 20).map((item) => {
      const matchedProduct = item.matchedProductSku ? productsBySku.get(item.matchedProductSku) : null;
      const data = {
        materialCode: null,
        name: item.description,
        specification: null,
        packSize: null,
        retailPriceMinor: null,
        currency: inventoryReportSource.source.currency,
        quantity: item.quantity,
        unit: item.unit,
        sourceCategory: item.sourceCategory,
        applicationSlug: matchedProduct?.vehicleApplications[0] ?? null,
        sourcePage: item.sourcePage,
        sourceRow: item.sourceRow,
        matchedProductId: matchedProduct?.id ?? null,
      };
      return db.sourceCatalogueItem.upsert({
        where: { sourceId_sourceKey: { sourceId: inventorySource.id, sourceKey: item.sourceKey } },
        update: data,
        create: { sourceId: inventorySource.id, sourceKey: item.sourceKey, ...data },
      });
    }));
  }

  for (let index = 0; index < caltexRetailPriceList.items.length; index += 20) {
    await Promise.all(caltexRetailPriceList.items.slice(index, index + 20).map((item) => {
      const matchedProduct = item.matchedProductSku ? productsBySku.get(item.matchedProductSku) : null;
      const data = {
        materialCode: item.materialCode,
        name: item.description,
        specification: item.productSpecification,
        packSize: item.packSize,
        retailPriceMinor: BigInt(item.retailPriceMinor),
        currency: caltexRetailPriceList.source.currency,
        quantity: null,
        unit: null,
        sourceCategory: item.applicationGroup,
        applicationSlug: item.applicationSlug,
        sourcePage: item.sourcePage,
        sourceRow: item.sourceRow,
        matchedProductId: matchedProduct?.id ?? null,
      };
      return db.sourceCatalogueItem.upsert({
        where: { sourceId_sourceKey: { sourceId: caltexSource.id, sourceKey: item.materialCode } },
        update: data,
        create: { sourceId: caltexSource.id, sourceKey: item.materialCode, ...data },
      });
    }));
  }

  const settings = [
    ["store.identity", { name: "Saranankara Oil Mart" }],
    ["store.phone", { value: "+94 71 571 6717" }],
    [
      "store.address",
      {
        line1: "70/5B. Dhammalankara Mawatha",
        line2: "Hill St",
        city: "Dehiwala-Mount Lavinia",
        postalCode: "10350",
        country: "Sri Lanka",
      },
    ],
    ["store.currency", { value: "LKR" }],
    ["store.timezone", { value: "Asia/Colombo" }],
    ["payments.cardSurcharge", { enabled: false, proposedBasisPoints: 400 }],
    ["quotations.fee", { enabled: false, amountMinor: null }],
  ] as const;

  for (const [key, value] of settings) {
    await db.storeSetting.upsert({
      where: { key_locale: { key, locale: Locale.EN } },
      update: { value, public: key.startsWith("store.") },
      create: { key, locale: Locale.EN, value, public: key.startsWith("store.") },
    });
  }

  await db.deliverySettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      pickupEnabled: true,
      deliveryEnabled: false,
      manualQuoteEnabled: true,
    },
  });
}

main()
  .finally(async () => db.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
