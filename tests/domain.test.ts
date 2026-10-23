import { describe, it, expect } from "vitest";
import {
  reconcileSelection,
  productSchema,
  consentAllows,
  type Product,
} from "@/lib/domain";
import { buildWhatsAppMessage, whatsappUrl } from "@/lib/whatsapp";
import {
  safePushcutEndpoint,
  csv,
  encryptSecret,
  decryptSecret,
  verifyWebhook,
  retryDelay,
} from "@/lib/security";
const product: Product = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Vestido Açucena",
  slug: "vestido-acucena",
  sku: "Z1",
  description: "",
  short_description: "",
  price_cents: 42990,
  promo_cents: 39990,
  status: "published",
  featured: false,
  sort_order: 0,
  version: 0,
  category_id: null,
  collection_id: null,
  details: {},
  variants: [
    {
      id: "v",
      product_id: "p",
      color: "Pérola",
      size: "P",
      stock: 2,
      low_stock: 1,
      active: true,
      version: 0,
      sku: null,
    },
  ],
  media: [],
};
describe("Commerce", () => {
  it("uses server price and requires in-stock published variant", () => {
    const [item] = reconcileSelection(
      [{ variant_id: "v", quantity: 2 }],
      [product],
    );
    expect(item.unit_price_cents).toBe(39990);
    expect(() =>
      reconcileSelection([{ variant_id: "v", quantity: 3 }], [product]),
    ).toThrow(/estoque/i);
    expect(() =>
      reconcileSelection(
        [{ variant_id: "v", quantity: 1 }],
        [{ ...product, status: "draft" }],
      ),
    ).toThrow();
    expect(() =>
      reconcileSelection([{ variant_id: "v", quantity: 1.5 }], [product]),
    ).toThrow();
  });
  it("merges duplicate variants before checking stock", () => {
    expect(() =>
      reconcileSelection(
        [
          { variant_id: "v", quantity: 2 },
          { variant_id: "v", quantity: 1 },
        ],
        [product],
      ),
    ).toThrow(/estoque/i);
  });
  it("generates accented message from real snapshot and encoded official link", () => {
    const items = reconcileSelection(
      [{ variant_id: "v", quantity: 2 }],
      [product],
    );
    const message = buildWhatsAppMessage(
      "Luísa",
      items,
      "https://example.test",
    );
    expect(message).toContain("Luísa");
    expect(message).toContain("Pérola");
    expect(message).toContain("799,80");
    const url = whatsappUrl("5591999999999", message);
    expect(url).toMatch(/^https:\/\/wa.me\/5591999999999\?text=/);
    expect(new URL(url).searchParams.get("text")).toBe(message);
    expect(() => whatsappUrl("123", message)).toThrow();
  });
  it("validates full product and price rules", () => {
    expect(productSchema.safeParse(product).success).toBe(true);
    expect(
      productSchema.safeParse({ ...product, promo_cents: 999999 }).success,
    ).toBe(false);
    expect(
      productSchema.safeParse({ ...product, price_cents: -1 }).success,
    ).toBe(false);
  });
});
describe("Security boundaries", () => {
  it("allows only exact HTTPS Pushcut endpoint without credentials, query or redirect target", () => {
    expect(
      safePushcutEndpoint("https://api.pushcut.io/secret/notifications/id")
        .hostname,
    ).toBe("api.pushcut.io");
    for (const url of [
      "http://api.pushcut.io/a/notifications/b",
      "https://api.pushcut.io.evil.test/a/notifications/b",
      "https://127.0.0.1/test",
      "https://user:pass@api.pushcut.io/a/notifications/b",
      "https://api.pushcut.io/a/notifications/b?url=http://localhost",
    ])
      expect(() => safePushcutEndpoint(url)).toThrow();
  });
  it("escapes spreadsheet formulas and embedded quotes/newlines", () => {
    expect(
      csv([
        ["name", "value"],
        ["=IMPORTXML(1)", 'a"b\nc'],
      ]),
    ).toContain("'=IMPORTXML(1)");
    expect(csv([["+cmd", "@evil", "-1"]])).toContain("'+cmd");
  });
  it("encrypts and authenticates secrets at rest", () => {
    const key = "ab".repeat(32);
    const encrypted = encryptSecret("hidden", key);
    expect(encrypted).not.toContain("hidden");
    expect(decryptSecret(encrypted, key)).toBe("hidden");
    expect(() => decryptSecret(encrypted, "cd".repeat(32))).toThrow();
  });
  it("rejects forged webhook and caps retry backoff", () => {
    expect(verifyWebhook("hello", "sha256=deadbeef", "key")).toBe(false);
    expect(retryDelay(99)).toBeLessThanOrEqual(3600000);
  });
  it("denied and revoked consent do not authorize behavioral analytics", () => {
    expect(consentAllows(null, "analytics")).toBe(false);
    expect(
      consentAllows({ analytics: false, marketing: true }, "analytics"),
    ).toBe(false);
    expect(
      consentAllows({ analytics: true, marketing: false }, "marketing"),
    ).toBe(false);
  });
});
