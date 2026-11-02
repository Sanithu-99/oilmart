import { storeConfig } from "@/lib/config/store";

type ProductConfirmation = {
  name: string;
  sku: string;
  brand?: string | null;
};

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

export function productConfirmationWhatsAppUrl(product: ProductConfirmation) {
  const details = [
    "Hello Saranankara Oil Mart,",
    "",
    "Please confirm the current price and availability for this product:",
    `Product: ${product.name}`,
    product.brand ? `Brand: ${product.brand}` : null,
    `SKU: ${product.sku}`,
    "",
    "Please also confirm store pickup or delivery options. Thank you.",
  ].filter((line): line is string => line !== null);

  return whatsappUrl(details.join("\n"));
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
