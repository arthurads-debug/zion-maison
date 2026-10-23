"use client";
import { applyVendorConsent } from "@/lib/vendor-consent";
type VendorWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
};
type Entry = {
  type: string;
  id: string;
  params: Record<string, unknown>;
  gaDone: boolean;
  metaDone: boolean;
};
let consent = { analytics: false, marketing: false };
let gaId = "";
let pixelId = "";
let googleReady = false,
  metaReady = false;
let queue: Entry[] = [];
const metaNames: Record<string, string> = {
  page_view: "PageView",
  view_item: "ViewContent",
  search: "Search",
  add_to_cart: "AddToCart",
  add_to_wishlist: "AddToWishlist",
};
const customNames: Record<string, string> = {
  whatsapp_click: "WhatsAppClick",
  product_inquiry: "WhatsAppProductInquiry",
  cart_inquiry: "WhatsAppCartInquiry",
  shop_the_look_click: "ShopTheLookClick",
  video_product_click: "VideoProductClick",
};
function clearCookies(prefixes: string[]) {
  for (const item of document.cookie.split(";")) {
    const name = item.split("=")[0].trim();
    if (prefixes.some((p) => name.startsWith(p))) {
      document.cookie = `${name}=; Max-Age=0; Path=/`;
      const labels = location.hostname.split(".");
      for (let n = 0; n < labels.length - 1; n++)
        document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${labels.slice(n).join(".")}`;
    }
  }
}
export function configureVendorConsent(next: {
  analytics: boolean;
  marketing: boolean;
}) {
  consent = next;
  const w = window as VendorWindow;
  if (gaId)
    (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] =
      !next.analytics;
  applyVendorConsent(next, {
    ga: w.gtag,
    meta: w.fbq,
    clear() {
      localStorage.removeItem("zion-visitor");
      localStorage.removeItem("zion-session");
      clearCookies(["_ga"]);
    },
  });
  if (!next.marketing) clearCookies(["_fbp", "_fbc"]);
  queue = queue.filter((e) => {
    if (!next.analytics) e.gaDone = true;
    if (!next.marketing) e.metaDone = true;
    return !(e.gaDone && e.metaDone);
  });
  flush();
}
function flush() {
  const w = window as VendorWindow;
  for (const item of queue) {
    if (consent.analytics && googleReady && w.gtag && !item.gaDone) {
      w.gtag("event", item.type, item.params);
      item.gaDone = true;
    }
    if (consent.marketing && metaReady && w.fbq && !item.metaDone) {
      w.fbq(
        metaNames[item.type] ? "track" : "trackCustom",
        metaNames[item.type] || customNames[item.type] || item.type,
        item.params,
        { eventID: item.id },
      );
      item.metaDone = true;
    }
  }
  queue = queue.filter((e) => !e.gaDone || !e.metaDone);
}
export function queueVendorEvent(
  type: string,
  id: string,
  params: Record<string, unknown>,
) {
  queue.push({
    type,
    id,
    params,
    gaDone: !consent.analytics,
    metaDone: !consent.marketing,
  });
  if (queue.length > 100) queue.shift();
  flush();
}
export function googleLoaded(
  id: string,
  next: { analytics: boolean; marketing: boolean },
) {
  const w = window as VendorWindow;
  gaId = id;
  googleReady = true;
  w.dataLayer ??= [];
  // Google documents the arguments-object queue format for the gtag bootstrap.
  w.gtag ??= function () {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", id, {
    send_page_view: false,
    allow_google_signals: next.marketing,
  });
  configureVendorConsent(next);
}
export function metaLoaded(
  id: string,
  next: { analytics: boolean; marketing: boolean },
) {
  pixelId = id;
  metaReady = true;
  const w = window as VendorWindow;
  w.fbq?.("init", pixelId);
  configureVendorConsent(next);
}
