import { z } from "zod";
export const eventTypes = [
  "page_view",
  "view_item",
  "search",
  "select_item",
  "select_variant",
  "add_to_cart",
  "remove_from_cart",
  "view_cart",
  "cart_started",
  "add_to_wishlist",
  "remove_from_wishlist",
  "whatsapp_click",
  "product_inquiry",
  "cart_inquiry",
  "shop_the_look_click",
  "video_product_click",
] as const;
export const eventSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(eventTypes),
    session_id: z.uuid(),
    visitor_id: z.uuid(),
    product_id: z.uuid().optional(),
    variant_id: z.uuid().optional(),
    attribution: z.record(z.string(), z.string().max(150)).optional(),
    data: z
      .object({
        path: z.string().max(300).optional(),
        query: z.string().max(100).optional(),
        color: z.string().max(80).optional(),
        size: z.string().max(30).optional(),
        quantity: z.number().int().min(1).max(99).optional(),
        intent: z.boolean().optional(),
        intent_id: z.uuid().optional(),
        source: z.string().max(150).optional(),
      })
      .strict()
      .default({}),
  })
  .strict();
export function attribution(url: string) {
  const parsed = new URL(url);
  return Object.fromEntries(
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ].flatMap((key) => {
      const v = parsed.searchParams.get(key);
      return v ? [[key, v.replace(/[<>\r\n]/g, "").slice(0, 150)]] : [];
    }),
  );
}
export function aggregateEvents(
  events: { type: string; session_id: string | null }[],
) {
  const sessions = new Set(
    events.filter((e) => e.session_id).map((e) => e.session_id),
  );
  const views = events.filter((e) => e.type === "view_item").length;
  const productSessions = new Set(
    events
      .filter((e) => e.type === "view_item" && e.session_id)
      .map((e) => e.session_id),
  );
  const clicked = new Set(
    events
      .filter(
        (e) =>
          e.type === "whatsapp_click" &&
          e.session_id &&
          productSessions.has(e.session_id),
      )
      .map((e) => e.session_id),
  );
  return {
    views,
    sessions: sessions.size,
    whatsapp: events.filter((e) => e.type === "whatsapp_click").length,
    intents: events.filter((e) => e.type === "whatsapp_intent_created").length,
    sales: events.filter((e) => e.type === "sale_confirmed").length,
    whatsappRate: productSessions.size
      ? (100 * clicked.size) / productSessions.size
      : 0,
  };
}
