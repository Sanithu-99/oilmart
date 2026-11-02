import { describe, expect, it } from "vitest";

import { cartOrderWhatsAppUrl, deliveryQuoteWhatsAppUrl, oilMatchWhatsAppUrl, productConfirmationWhatsAppUrl } from "@/lib/contact/whatsapp";

function decodedMessage(value: string) {
  const url = new URL(value);
  expect(url.origin).toBe("https://wa.me");
  expect(url.pathname).toBe("/94715716717");
  return url.searchParams.get("text") ?? "";
}

describe("WhatsApp order links", () => {
  it("prefills a product price-confirmation request", () => {
    const message = decodedMessage(productConfirmationWhatsAppUrl({
      name: "Laugfs Revtron Gold 4T 10W30 1 L",
      sku: "LAUGFS-4T-1L",
      brand: "Laugfs",
    }));

    expect(message).toContain("Please confirm the current price and availability");
    expect(message).toContain("Product: Laugfs Revtron Gold 4T 10W30 1 L");
    expect(message).toContain("Brand: Laugfs");
    expect(message).toContain("SKU: LAUGFS-4T-1L");
  });

  it("prefills every cart line, quantity, price state and subtotal", () => {
    const message = decodedMessage(cartOrderWhatsAppUrl({
      items: [
        { name: "Valvoline MaxLife ATF 4 L", sku: "VAL-ATF-4L", quantity: "2", priceAvailable: true, unitPriceMinor: "2450000", lineTotalMinor: "4900000" },
        { name: "Laugfs Revtron Gold 4T", sku: "LAUGFS-4T", quantity: "1", priceAvailable: false, unitPriceMinor: "0", lineTotalMinor: "0" },
      ],
      totalMinor: "4900000",
      hasUnavailablePrices: true,
    }));

    expect(message).toContain("2 × Valvoline MaxLife ATF 4 L");
    expect(message).toContain("SKU: VAL-ATF-4L");
    expect(message).toContain("1 × Laugfs Revtron Gold 4T");
    expect(message).toContain("Price: Please confirm");
    expect(message).toContain("Priced-item subtotal");
    expect(message).toContain("Some items require price confirmation.");
  });

  it("prefills delivery and oil-matching support requests", () => {
    const delivery = decodedMessage(deliveryQuoteWhatsAppUrl());
    const oilMatch = decodedMessage(oilMatchWhatsAppUrl());

    expect(delivery).toContain("I would like a delivery quote");
    expect(delivery).toContain("My delivery area is:");
    expect(oilMatch).toContain("help choosing the correct oil");
    expect(oilMatch).toContain("Vehicle make and model:");
  });
});
