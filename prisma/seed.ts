import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  Locale,
  PrismaClient,
  ProductType,
  PublicationStatus,
  UnitOfSale,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the database");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

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
  ["engine-oils", "Engine Oils"],
  ["diesel-engine-oils", "Diesel Engine Oils"],
  ["motorcycle-oils", "Motorcycle Oils"],
  ["transmission-fluids", "Transmission Fluids"],
  ["gear-oils", "Gear Oils"],
  ["coolants", "Coolants"],
  ["loose-oils", "Loose Oils"],
  ["other-automotive-products", "Other Automotive Products"],
] as const;

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

  for (const [sortOrder, [slug, name]] of categories.entries()) {
    await db.category.upsert({
      where: { slug },
      update: { name, description: `Browse available ${name.toLowerCase()} products.`, sortOrder, status: PublicationStatus.ACTIVE },
      create: { slug, name, description: `Browse available ${name.toLowerCase()} products.`, sortOrder, status: PublicationStatus.ACTIVE },
    });
  }

  const sampleBrand = await db.brand.upsert({
    where: { slug: "sample-range" },
    update: { name: "Sample Range", status: PublicationStatus.ACTIVE },
    create: {
      slug: "sample-range",
      name: "Sample Range",
      description: "Demonstration catalogue data — not a verified commercial brand.",
      status: PublicationStatus.ACTIVE,
    },
  });

  const sampleProducts = [
    {
      sku: "SAMPLE-ENG-5W30-4L",
      slug: "sample-engine-oil-5w-30-4l",
      name: "Sample Engine Oil 5W-30",
      category: "engine-oils",
      shortDescription: "Demonstration full-synthetic engine oil · 4 L",
      description:
        "This is demonstration catalogue content used to verify the storefront workflow. Replace it with supplier-verified product data before launch.",
      specs: { Grade: "5W-30", Volume: "4 L", DataStatus: "Demonstration only" },
      price: 645000n,
      stock: "18",
      featured: true,
    },
    {
      sku: "SAMPLE-DIE-15W40-5L",
      slug: "sample-diesel-oil-15w-40-5l",
      name: "Sample Diesel Oil 15W-40",
      category: "diesel-engine-oils",
      shortDescription: "Demonstration diesel engine lubricant · 5 L",
      description: "Demonstration catalogue content. Technical claims must be supplier-verified before launch.",
      specs: { Grade: "15W-40", Volume: "5 L", DataStatus: "Demonstration only" },
      price: 780000n,
      stock: "12",
      featured: true,
    },
    {
      sku: "SAMPLE-MOTO-10W40-1L",
      slug: "sample-motorcycle-oil-10w-40-1l",
      name: "Sample Motorcycle Oil 10W-40",
      category: "motorcycle-oils",
      shortDescription: "Demonstration motorcycle lubricant · 1 L",
      description: "Demonstration catalogue content. Replace with verified product information before launch.",
      specs: { Grade: "10W-40", Volume: "1 L", DataStatus: "Demonstration only" },
      price: 285000n,
      stock: "24",
      featured: true,
    },
    {
      sku: "SAMPLE-ATF-1L",
      slug: "sample-transmission-fluid-1l",
      name: "Sample Transmission Fluid",
      category: "transmission-fluids",
      shortDescription: "Demonstration automatic transmission fluid · 1 L",
      description: "Demonstration catalogue content. Compatibility is intentionally not claimed.",
      specs: { Volume: "1 L", DataStatus: "Demonstration only" },
      price: 315000n,
      stock: "9",
      featured: false,
    },
    {
      sku: "SAMPLE-GEAR-80W90-4L",
      slug: "sample-gear-oil-80w-90-4l",
      name: "Sample Gear Oil 80W-90",
      category: "gear-oils",
      shortDescription: "Demonstration gear lubricant · 4 L",
      description: "Demonstration catalogue content. Replace with verified product information before launch.",
      specs: { Grade: "80W-90", Volume: "4 L", DataStatus: "Demonstration only" },
      price: 485000n,
      stock: "7",
      featured: true,
    },
    {
      sku: "SAMPLE-COOL-4L",
      slug: "sample-coolant-4l",
      name: "Sample Coolant Concentrate",
      category: "coolants",
      shortDescription: "Demonstration coolant product · 4 L",
      description: "Demonstration catalogue content. Replace with verified product information before launch.",
      specs: { Volume: "4 L", DataStatus: "Demonstration only" },
      price: 390000n,
      stock: "4",
      featured: false,
    },
    {
      sku: "SAMPLE-LOOSE-20W50",
      slug: "sample-loose-oil-20w-50",
      name: "Sample Loose Oil 20W-50",
      category: "loose-oils",
      shortDescription: "Demonstration loose lubricant · priced per litre",
      description: "Demonstration catalogue content. Grade and price must be verified before launch.",
      specs: { Grade: "20W-50", Unit: "Per litre", DataStatus: "Demonstration only" },
      price: 145000n,
      stock: "60",
      featured: true,
      type: ProductType.LOOSE_OIL,
      unitOfSale: UnitOfSale.LITRE,
    },
    {
      sku: "SAMPLE-BRAKE-500ML",
      slug: "sample-brake-fluid-500ml",
      name: "Sample Brake Fluid",
      category: "other-automotive-products",
      shortDescription: "Demonstration automotive fluid · 500 ml",
      description: "Demonstration catalogue content. Replace with verified product information before launch.",
      specs: { Volume: "500 ml", DataStatus: "Demonstration only" },
      price: 165000n,
      stock: "0",
      featured: false,
    },
  ] as const;

  const createdProducts: string[] = [];
  for (const [index, item] of sampleProducts.entries()) {
    const category = await db.category.findUniqueOrThrow({ where: { slug: item.category } });
    const product = await db.product.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        shortDescription: item.shortDescription,
        description: item.description,
        technicalSpecs: item.specs,
        standardPriceMinor: item.price,
        categoryId: category.id,
        brandId: sampleBrand.id,
        featured: item.featured,
        status: PublicationStatus.ACTIVE,
      },
      create: {
        sku: item.sku,
        slug: item.slug,
        name: item.name,
        shortDescription: item.shortDescription,
        description: item.description,
        technicalSpecs: item.specs,
        categoryId: category.id,
        brandId: sampleBrand.id,
        standardPriceMinor: item.price,
        type: "type" in item ? item.type : ProductType.STANDARD,
        unitOfSale: "unitOfSale" in item ? item.unitOfSale : UnitOfSale.BOTTLE,
        status: PublicationStatus.ACTIVE,
        featured: item.featured,
      },
    });
    createdProducts.push(product.id);

    const variant = await db.productVariant.upsert({
      where: { sku: `${item.sku}-DEFAULT` },
      update: { name: "Default", active: true },
      create: { productId: product.id, sku: `${item.sku}-DEFAULT`, name: "Default" },
    });
    await db.inventory.upsert({
      where: { variantId: variant.id },
      update: { quantityOnHand: item.stock, quantityReserved: "0", lowStockThreshold: "3" },
      create: { variantId: variant.id, quantityOnHand: item.stock, lowStockThreshold: "3" },
    });
    await db.productImage.upsert({
      where: { productId_storageKey: { productId: product.id, storageKey: `sample-${index}` } },
      update: {},
      create: {
        productId: product.id,
        storageKey: `sample-${index}`,
        url: "/images/storefront/sample-lubricant.png",
        altText: `${item.name} demonstration product image`,
        width: 1254,
        height: 1254,
        primary: true,
      },
    });
  }

  for (const [sortOrder, targetProductId] of createdProducts.slice(1, 5).entries()) {
    await db.relatedProduct.upsert({
      where: { sourceProductId_targetProductId: { sourceProductId: createdProducts[0]!, targetProductId } },
      update: { sortOrder },
      create: { sourceProductId: createdProducts[0]!, targetProductId, sortOrder },
    });
  }

  const settings = [
    ["store.identity", { name: "Saranankara Oil Mart", demoSeed: true }],
    ["store.phone", { value: "+94 71 571 6717", demoSeed: true }],
    [
      "store.address",
      {
        line1: "70/5B, Dhammalankara Maratha",
        line2: "Hill St",
        city: "Dehiwala-Mount Lavinia",
        postalCode: "10350",
        country: "Sri Lanka",
        demoSeed: true,
      },
    ],
    ["store.currency", { value: "LKR", demoSeed: true }],
    ["store.timezone", { value: "Asia/Colombo", demoSeed: true }],
    ["payments.cardSurcharge", { enabled: false, proposedBasisPoints: 400, demoSeed: true }],
    ["quotations.fee", { enabled: false, amountMinor: null, demoSeed: true }],
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
