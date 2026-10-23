export function periodRange(preset: string, from?: string, to?: string) {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Belem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const add = (date: string, days: number) =>
    new Date(new Date(`${date}T12:00:00-03:00`).getTime() + days * 86400000)
      .toISOString()
      .slice(0, 10);
  let start = today,
    end = add(today, 1);
  if (preset === "yesterday") {
    start = add(today, -1);
    end = today;
  } else if (preset === "7") start = add(today, -6);
  else if (preset === "30") start = add(today, -29);
  else if (preset === "month") start = today.slice(0, 8) + "01";
  else if (preset === "custom" && from && to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
      throw new Error("Período inválido.");
    start = from;
    end = add(to, 1);
  }
  const startIso = new Date(`${start}T00:00:00-03:00`).toISOString(),
    endIso = new Date(`${end}T00:00:00-03:00`).toISOString();
  if (
    endIso <= startIso ||
    new Date(endIso).getTime() - new Date(startIso).getTime() > 400 * 86400000
  )
    throw new Error("Escolha um período de até 400 dias.");
  return { from: startIso, to: endIso };
}
export type Report = {
  archive?: {
    day: string;
    page_views: number;
    product_views: number;
    whatsapp_clicks: number;
    intents: number;
  }[];
  metrics: {
    page_views: number;
    product_views: number;
    sessions: number;
    whatsapp_clicks: number;
    intents: number;
    carts: number;
    favorites: number;
    product_sessions: number;
    converted_sessions: number;
  };
  visitors: number;
  inventory: { active: number; low: number; out: number };
  sales: { count: number; total_cents: number };
  series: { day: string; views: number; clicks: number }[];
  products: {
    id: string;
    name: string;
    slug: string;
    views: number;
    unique_views: number;
    clicks: number;
    cart: number;
    favorites: number;
  }[];
  sources: {
    source: string;
    campaign: string | null;
    sessions: number;
    clicks: number;
  }[];
  choices: { color: string | null; size: string | null; count: number }[];
};
