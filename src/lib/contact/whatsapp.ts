import { storeConfig } from "@/lib/config/store";

type ProductConfirmation = {
  name: string;
  sku: string;
  brand?: string | null;
  packSize?: string | null;
};

type InquiryProduct = { name: string; packSize?: string | null; sku?: string };

type CartOrderItem = {
  name: string;
  sku?: string;
  quantity: string;
  priceAvailable: boolean;
  unitPriceMinor: string;
  lineTotalMinor: string;
};

function lkr(minor: string) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(minor) / 100);
}

export function whatsappUrl(message: string) {
  return `https://wa.me/${storeConfig.whatsapp}?text=${encodeURIComponent(message)}`;
}

function nameWithPack(product: InquiryProduct) {
  if (!product.packSize) return product.name;
  const normalizedName = product.name.toLocaleLowerCase("en").replace(/[^a-z0-9]/g, "");
  const normalizedPack = product.packSize.toLocaleLowerCase("en").replace(/[^a-z0-9]/g, "");
  return normalizedPack && normalizedName.endsWith(normalizedPack) ? product.name : `${product.name} (${product.packSize})`;
}

export function productConfirmationWhatsAppUrl(product: ProductConfirmation) {
  return whatsappUrl(`Hi Saranankara Oil Mart, I am inquiring about availability and today's price for ${nameWithPack(product)}. Do you have stock at the Dehiwala shop?`);
}

export function inquiryListWhatsAppUrl(products: InquiryProduct[]) {
  const lines = products.slice(0, 5).map((product, index) => `${index + 1}. ${nameWithPack(product)}${product.sku ? ` · ${product.sku}` : ""}`);
  return whatsappUrl([
    "Hi Saranankara Oil Mart,",
    "",
    "Please send me today's price and stock availability for this inquiry list:",
    ...lines,
    "",
    "I would like to collect from the Dehiwala shop or arrange delivery. Please send a combined quote. Thank you.",
  ].join("\n"));
}

export function deliveryQuoteWhatsAppUrl() {
  return whatsappUrl([
    "Hello Saranankara Oil Mart,",
    "",
    "I would like a delivery quote for an order.",
    "My delivery area is: ",
    "The products I need are: ",
    "",
    "Please confirm delivery availability and the estimated charge. Thank you.",
  ].join("\n"));
}

export function oilMatchWhatsAppUrl() {
  return whatsappUrl([
    "Hello Saranankara Oil Mart,",
    "",
    "I need help choosing the correct oil for my vehicle.",
    "Vehicle make and model: ",
    "Year: ",
    "Engine / fuel type: ",
    "Preferred oil grade (if known): ",
    "",
    "Please recommend a suitable product from your current stock. Thank you.",
  ].join("\n"));
}

export function cartOrderWhatsAppUrl(cart: {
  items: CartOrderItem[];
  totalMinor: string;
  hasUnavailablePrices: boolean;
}) {
  const lines = cart.items.flatMap((item, index) => [
    `${index + 1}. ${item.quantity} × ${item.name}`,
    item.sku ? `   SKU: ${item.sku}` : null,
    item.priceAvailable ? `   Unit price: ${lkr(item.unitPriceMinor)}` : "   Price: Please confirm",
    item.priceAvailable ? `   Line total: ${lkr(item.lineTotalMinor)}` : null,
    "",
  ]).filter((line): line is string => line !== null);

  const totalLabel = cart.hasUnavailablePrices ? "Priced-item subtotal" : "Order total";
  return whatsappUrl([
    "Hello Saranankara Oil Mart,",
    "",
    "I would like to place this order:",
    "",
    ...lines,
    `${totalLabel}: ${lkr(cart.totalMinor)}`,
    cart.hasUnavailablePrices ? "Some items require price confirmation." : null,
    "",
    "Please confirm availability, the final total, and delivery or store pickup. Thank you.",
  ].filter((line): line is string => line !== null).join("\n"));
}
