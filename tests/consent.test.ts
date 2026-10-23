import { it, expect, vi } from "vitest";
import { applyVendorConsent } from "@/lib/vendor-consent";
it("explicitly grants, revokes and grants again, including changes originating in another tab", () => {
  const ga = vi.fn(),
    meta = vi.fn(),
    clear = vi.fn();
  for (const analytics of [true, false, true])
    applyVendorConsent(
      { analytics, marketing: analytics },
      { ga, meta, clear },
    );
  expect(meta.mock.calls.map((c) => c.slice(0, 2))).toEqual([
    ["consent", "grant"],
    ["consent", "revoke"],
    ["consent", "grant"],
  ]);
  expect(clear).toHaveBeenCalledTimes(1);
  expect(ga.mock.calls[1][2]).toMatchObject({ analytics_storage: "denied" });
});
