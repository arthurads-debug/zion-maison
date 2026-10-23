import "server-only";
export type MetaEvent = {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url: string;
  user_data: { fbp?: string; fbc?: string };
  custom_data: {
    content_ids?: string[];
    content_type?: "product";
    currency: "BRL";
    value?: number;
  };
};
export function makeMetaEvent(input: {
  name: string;
  id: string;
  url: string;
  cents?: number;
  products?: string[];
  timestamp?: number;
  fbp?: string;
  fbc?: string;
}): MetaEvent {
  if (input.name === "Purchase")
    throw new Error(
      "Purchase requires a separately verified sale integration.",
    );
  return {
    event_name: input.name,
    event_time: Math.floor((input.timestamp || Date.now()) / 1000),
    event_id: input.id,
    action_source: "website",
    event_source_url: input.url,
    user_data: { fbp: input.fbp, fbc: input.fbc },
    custom_data: {
      content_ids: input.products,
      content_type: "product",
      currency: "BRL",
      value: input.cents === undefined ? undefined : input.cents / 100,
    },
  };
}
// Transport is deliberately opt-in; callers must verify consent and authorization before use.
export async function sendMetaEvent(
  event: MetaEvent,
  config: {
    authorized: boolean;
    pixelId: string;
    token: string;
    graphVersion: string;
    testCode?: string;
  },
) {
  if (!config.authorized) throw new Error("CAPI is not authorized.");
  if (!/^\d+$/.test(config.pixelId)) throw new Error("Invalid Pixel ID.");
  if (!/^v\d+\.\d+$/.test(config.graphVersion))
    throw new Error("Configure the supported Graph API version.");
  const response = await fetch(
    `https://graph.facebook.com/${config.graphVersion}/${config.pixelId}/events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({
        data: [event],
        ...(config.testCode ? { test_event_code: config.testCode } : {}),
      }),
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    },
  );
  return { ok: response.ok, status: response.status };
}
