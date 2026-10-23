export function applyVendorConsent(
  value: { analytics: boolean; marketing: boolean },
  sinks: {
    ga?: (...args: unknown[]) => void;
    meta?: (...args: unknown[]) => void;
    clear?: () => void;
  },
) {
  sinks.ga?.("consent", "update", {
    analytics_storage: value.analytics ? "granted" : "denied",
    ad_storage: value.marketing ? "granted" : "denied",
    ad_user_data: value.marketing ? "granted" : "denied",
    ad_personalization: value.marketing ? "granted" : "denied",
  });
  sinks.meta?.("consent", value.marketing ? "grant" : "revoke");
  if (!value.analytics) sinks.clear?.();
}
