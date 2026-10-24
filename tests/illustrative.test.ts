import { it, expect } from "vitest";
import { reconcileSelection } from "@/lib/domain";
import { fixtureProduct } from "./fixtures/catalog";

it("prevents an illustrative product from becoming a purchase intent even if stock is accidentally added", () => {
  const product = { ...fixtureProduct, details: { tags: ["ilustrativo"] } };
  expect(() =>
    reconcileSelection(
      [{ variant_id: product.variants[0].id, quantity: 1 }],
      [product],
    ),
  ).toThrow(/ilustrativ/i);
});
it("lets an edited product become commercial after the illustrative tag is removed", () => {
  const product = { ...fixtureProduct, details: { tags: ["atemporal"] } };
  expect(
    reconcileSelection(
      [{ variant_id: product.variants[0].id, quantity: 1 }],
      [product],
    ),
  ).toHaveLength(1);
});
