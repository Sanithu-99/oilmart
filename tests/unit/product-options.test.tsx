import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stepQuantity, belowMinimum, exceedsAvailable } from "@/lib/quantity";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/storefront/add-to-cart", () => ({ AddToCart: ({ variantId, quantity, disabled, label }: { variantId: string; quantity: string; disabled: boolean; label: string }) => <button data-variant={variantId} data-quantity={quantity} disabled={disabled}>{label}</button> }));
import { ProductOptions } from "@/components/storefront/product-options";

afterEach(cleanup);
describe("pack selection", () => {
  it("changes the cart variant, quantity rule, price and stock together", () => {
    render(<ProductOptions variants={[
      { id: "one", name: "1 L", priceMinor: "10000", standardPriceMinor: "10000", available: 4, minQuantity: "1", quantityStep: "1" },
      { id: "four", name: "4 L", priceMinor: "35000", standardPriceMinor: "35000", available: 0, minQuantity: "2", quantityStep: "2" },
    ]} sizes={[]} slug="oil" locale="en" addLabel="Add to cart" loose={false}/>);
    expect(screen.getByRole("button", { name: "Add to cart" })).toHaveAttribute("data-variant", "one");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "four" } });
    const add = screen.getByRole("button", { name: "Add to cart" });
    expect(add).toHaveAttribute("data-variant", "four");
    expect(add).toHaveAttribute("data-quantity", "2");
    expect(add).toBeDisabled();
    expect(screen.getAllByText(/350\.00/).length).toBeGreaterThan(0);
  });
  it("navigates to the independent SKU when selecting another pack", () => {
    render(<ProductOptions variants={[]} sizes={[{ slug: "oil-1l", name: "1 L" }, { slug: "oil-4l", name: "4 L" }]} slug="oil-1l" locale="si" addLabel="Add" loose={false}/>);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "oil-4l" } });
    expect(push).toHaveBeenCalledWith("/si/products/oil-4l");
  });
  it("steps loose quantities exactly and respects the actual minimum and stock boundary", () => {
    expect(stepQuantity("0.2", "0.1", 1)).toBe("0.3");
    expect(belowMinimum(stepQuantity("1", "0.5", -1), "0.5")).toBe(false);
    expect(belowMinimum(stepQuantity("0.5", "0.5", -1), "0.5")).toBe(true);
    expect(exceedsAvailable(stepQuantity("1.5", "0.5", 1), 1.7)).toBe(true);
  });
});
