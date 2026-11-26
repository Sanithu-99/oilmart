import { describe, expect, it } from "vitest";
import { calculatePrice } from "@/features/pricing/service";
import { productFamilyKey, publicSpecifications, offerTitle, catalogueSections } from "@/lib/catalog/product-options";
import { manufacturerContent } from "@/lib/catalog/manufacturer-content";
import { assertPreorderDecision, assertQuotationEditable, quotationFeeMinor, requestSchema } from "@/features/requests/validation";

describe("loyalty payment estimates", () => {
  const lines = [{ productId: "oil", quantity: "1.5", standardUnitPriceMinor: 120000n, loyaltyUnitPriceMinor: 100000n }];
  it.each(["CASH", "BANK_TRANSFER"] as const)("keeps the approved member price for %s", (paymentMethod) => {
    expect(calculatePrice(lines, { loyaltyEligible: true, paymentMethod }).totalMinor).toBe(150000n);
  });
  it("adds four percent to loyalty items, excluding delivery and standard-priced items", () => {
    const result = calculatePrice([...lines, { productId: "filter", quantity: "1", standardUnitPriceMinor: 20000n }], { loyaltyEligible: true, paymentMethod: "CARD", deliveryMinor: 5000n });
    expect(result.surchargeMinor).toBe(6000n);
    expect(result.totalMinor).toBe(181000n);
  });
  it("never gives an unapproved member loyalty pricing or its adjustment", () => {
    const result = calculatePrice(lines, { loyaltyEligible: false, paymentMethod: "CARD" });
    expect(result.totalMinor).toBe(180000n);
    expect(result.surchargeMinor).toBe(0n);
  });
  it("rounds fractional cents once and applies the rule to the promotional loyalty total", () => {
    expect(calculatePrice([{ ...lines[0], quantity: "1", loyaltyUnitPriceMinor: 13n }], { loyaltyEligible: true, paymentMethod: "CARD" }).surchargeMinor).toBe(1n);
    expect(calculatePrice([{ ...lines[0], promotionUnitPriceMinor: 90000n }], { loyaltyEligible: true, paymentMethod: "CARD" }).surchargeMinor).toBe(5400n);
  });
});

describe("catalogue requirements", () => {
  it("groups pack sizes while keeping distinct grades and model numbers separate", () => {
    expect(productFamilyKey("Caltex Formula 10W30 (1 L)")).toBe(productFamilyKey("Caltex Formula 10W30 4 L"));
    expect(productFamilyKey("Caltex Formula 15W40 1 L")).not.toBe(productFamilyKey("Caltex Formula 10W30 1 L"));
    expect(productFamilyKey("Fuji C-224")).not.toBe(productFamilyKey("Fuji C-933"));
  });
  it("removes fitment claims and internal fields while retaining real specifications", () => {
    expect(publicSpecifications({ "Suitable For": "Model X", "Vehicle compatibility": "Model Y", "Machine application": "Machine Z", Grade: "10W30", "Stock unit": "can" })).toEqual([["Grade", "10W30"]]);
  });
  it("uses document sections and never exposes numeric warehouse headings", () => {
    expect(catalogueSections(["01", "Caltex - Passenger Car Motor Oils"], "Caltex", "Engine Oils")).toEqual(["Caltex - Passenger Car Motor Oils"]);
    expect(catalogueSections(["28"], "Mobil", "Gear Oils")).toEqual(["Mobil · Gear Oils"]);
  });
  it("adds verified offer copy without inventing a free litre", () => {
    expect(offerTitle("Oil 5 L", {})).toBe("Oil 5 L");
    expect(offerTitle("Oil 5 L", { "Pack offer": "5 L + 1 L free (6 L total)" })).toContain("6 L total");
  });
  it("only uses manufacturer summaries for the exact brand and product grade", () => {
    expect(manufacturerContent("Caltex", "Caltex Havoline Super 4T 20W50 1 L")?.url).toContain("20w-50");
    expect(manufacturerContent("Caltex", "Caltex Havoline Super 4T 10W40 1 L")).toBeNull();
    expect(manufacturerContent("Other", "Caltex Havoline Super 4T 20W50 1 L")).toBeNull();
  });
});

describe("owner-approved requests", () => {
  it("stores an individual fee exactly, including zero, and rejects invalid money", () => {
    expect(quotationFeeMinor("1250.50")).toBe(125050n);
    expect(quotationFeeMinor("0")).toBe(0n);
    for (const input of ["", "-1", "1.001", "NaN", "1e9"]) expect(() => quotationFeeMinor(input)).toThrow();
  });
  it("blocks repeat pre-order decisions and changes after quotation acceptance", () => {
    expect(() => assertPreorderDecision("PENDING_APPROVAL")).not.toThrow();
    expect(() => assertPreorderDecision("APPROVED")).toThrow();
    expect(() => assertQuotationEditable("PREPARED")).not.toThrow();
    expect(() => assertQuotationEditable("ACCEPTED")).toThrow();
  });
  it("requires contact details, positive measured quantity and explicit acknowledgement", () => {
    const input = { kind: "quote", requestKey: "b2249299-b674-49da-abd5-92eb9a203a91", locale: "en", name: "Customer", phone: "0771234567", vehicle: "Vehicle 1", notes: "Please quote two litres", productSlug: "", variantId: "", quantity: "1.5", accepted: "on" };
    expect(requestSchema.safeParse(input).success).toBe(true);
    for (const update of [{ phone: "123" }, { quantity: "-1" }, { quantity: "0" }, { quantity: "0.0001" }, { accepted: "" }]) expect(requestSchema.safeParse({ ...input, ...update }).success).toBe(false);
  });
});
