import { it, expect, describe } from "vitest";
import { allowed } from "@/lib/domain";
import {
  contentSchema,
  settingsSchema,
  integrationSchema,
  validatePublication,
} from "@/lib/admin-schemas";
import { detectMedia } from "@/server/media-validation";
describe("Administration contracts", () => {
  it("staff cannot mutate their permissions or integrations", () => {
    const staff = {
      active: true,
      role: "staff",
      permissions: ["products.write"],
    };
    expect(allowed(staff, "products.write")).toBe(true);
    expect(allowed(staff, "team.write")).toBe(false);
    expect(allowed(staff, "integrations.write")).toBe(false);
  });
  it("rejects executable URLs in content and invalid WhatsApp numbers", () => {
    expect(
      contentSchema.safeParse({
        kind: "hero",
        title: "Test",
        slug: "hero",
        status: "published",
        sort_order: 0,
        body: { image_url: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
    expect(settingsSchema.safeParse({ whatsapp: "abc" }).success).toBe(false);
  });
  it("requires image and live variations for publication", () => {
    expect(() => validatePublication("published", [], 0)).toThrow();
    expect(() => validatePublication("draft", [], 0)).not.toThrow();
  });
  it("does not accept arbitrary scripts in integration config", () => {
    expect(
      integrationSchema.safeParse({
        enabled: true,
        config: { script: "alert(1)" },
      }).success,
    ).toBe(false);
  });
  it("rejects forged image MIME and accepts actual MP4 signature", () => {
    expect(() =>
      detectMedia(Buffer.from('<svg onload="evil"/>'), "image/jpeg"),
    ).toThrow();
    expect(
      detectMedia(
        Buffer.from([0, 0, 0, 24, ...Buffer.from("ftypisom")]),
        "video/mp4",
      ),
    ).toBe("video");
  });
});
