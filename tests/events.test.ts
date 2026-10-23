import { describe, it, expect } from "vitest";
import { aggregateEvents, eventSchema, attribution } from "@/lib/events";
describe("Event semantics", () => {
  it("separates intents, WhatsApp clicks and confirmed sales", () => {
    const result = aggregateEvents([
      { type: "view_item", session_id: "a" },
      { type: "view_item", session_id: "a" },
      { type: "whatsapp_click", session_id: "a" },
      { type: "whatsapp_intent_created", session_id: null },
      { type: "sale_confirmed", session_id: null },
    ]);
    expect(result.views).toBe(2);
    expect(result.sessions).toBe(1);
    expect(result.whatsapp).toBe(1);
    expect(result.sales).toBe(1);
    expect(result.whatsappRate).toBe(100);
  });
  it("has safe zero denominators", () => {
    expect(aggregateEvents([]).whatsappRate).toBe(0);
  });
  it("rejects arbitrary data and personal event parameters", () => {
    expect(
      eventSchema.safeParse({
        type: "view_item",
        id: crypto.randomUUID(),
        session_id: crypto.randomUUID(),
        visitor_id: crypto.randomUUID(),
        data: { name: "Secret" },
      }).success,
    ).toBe(false);
  });
  it("retains allowlisted attribution only, without arbitrary URL queries", () => {
    const data = attribution(
      "https://example.test/?utm_source=instagram&email=private@example.test",
    );
    expect(data).toEqual({ utm_source: "instagram" });
  });
});
