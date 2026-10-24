import { z } from "zod";
export type Variant = {
  id: string;
  product_id: string;
  sku: string | null;
  color: string;
  size: string;
  stock: number;
  low_stock: number;
  active: boolean;
  version: number;
};
export type Media = {
  id: string;
  asset_id: string;
  color: string | null;
  sort_order: number;
  asset: {
    id: string;
    kind: "image" | "video";
    url: string | null;
    poster_url: string | null;
    alt: string;
    width?: number;
    height?: number;
    published: boolean;
  };
};
export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string;
  short_description: string;
  price_cents: number;
  promo_cents: number | null;
  status: "draft" | "published" | "archived";
  featured: boolean;
  sort_order: number;
  version: number;
  category_id: string | null;
  collection_id: string | null;
  details: Record<string, unknown>;
  variants: Variant[];
  media: Media[];
  created_at?: string;
};
export type Taxonomy = {
  id: string;
  kind: "category" | "collection";
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  published: boolean;
  sort_order: number;
};
export type Content = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  body: Record<string, unknown>;
  status: string;
  sort_order: number;
};
export type Settings = {
  home_order?: string[];
  name: string;
  announcement: string;
  whatsapp: string;
  instagram: string;
  timezone: string;
  logo_url?: string;
  icon_url?: string;
  email?: string;
  address?: string;
  business_id?: string;
  about?: string;
  default_message?: string;
};
export type SelectionLine = { variant_id: string; quantity: number };
export type Snapshot = {
  variant_id: string;
  product_id: string;
  name: string;
  slug: string;
  color: string;
  size: string;
  quantity: number;
  unit_price_cents: number;
};
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const selectionSchema = z
  .array(
    z.object({
      variant_id: z.string().min(1),
      quantity: z.number().int().min(1).max(99),
    }),
  )
  .min(1)
  .max(100);
export const productSchema = z
  .object({
    id: z.uuid().optional(),
    version: z.number().int().min(0).optional(),
    name: z.string().trim().min(1).max(200),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    sku: z.string().max(100).nullable().optional(),
    description: z.string().max(20000).default(""),
    short_description: z.string().max(500).default(""),
    price_cents: z.number().int().min(0).max(100000000),
    promo_cents: z.number().int().min(0).nullable().default(null),
    category_id: z.uuid().nullable().default(null),
    collection_id: z.uuid().nullable().default(null),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    featured: z.boolean().default(false),
    sort_order: z.number().int().default(0),
    details: z
      .object({
        composition: z.string().max(5000).optional(),
        care: z.string().max(5000).optional(),
        measurements: z.string().max(10000).optional(),
        tags: z.array(z.string().max(100)).max(50).optional(),
        seo_title: z.string().max(150).optional(),
        seo_description: z.string().max(500).optional(),
      })
      .default({}),
  })
  .refine((p) => p.promo_cents === null || p.promo_cents < p.price_cents, {
    message: "O preço promocional deve ser menor que o preço original.",
    path: ["promo_cents"],
  });
export const variantSchema = z.object({
  id: z.uuid().optional(),
  color: z.string().trim().min(1).max(80),
  size: z.string().trim().min(1).max(30),
  sku: z.string().max(100).nullable().optional(),
  active: z.boolean().default(true),
  low_stock: z.number().int().min(0).max(10000).default(2),
});
/** Editorial examples can be edited into real merchandise by removing this tag. */
export function isIllustrativeProduct(product: Pick<Product, "details">) {
  const tags = product.details.tags;
  return (
    Array.isArray(tags) &&
    tags.some(
      (tag) =>
        typeof tag === "string" && tag.trim().toLowerCase() === "ilustrativo",
    )
  );
}
export function reconcileSelection(
  input: SelectionLine[],
  products: Product[],
): Snapshot[] {
  const lines = selectionSchema.parse(input);
  const merged = new Map<string, number>();
  for (const l of lines)
    merged.set(l.variant_id, (merged.get(l.variant_id) ?? 0) + l.quantity);
  return [...merged].map(([id, quantity]) => {
    const product = products.find(
      (p) =>
        p.status === "published" &&
        p.variants.some((v) => v.id === id && v.active),
    );
    const variant = product?.variants.find((v) => v.id === id);
    if (!product || !variant)
      throw new Error(
        "Esta peça não está mais disponível. Atualize sua seleção.",
      );
    if (isIllustrativeProduct(product))
      throw new Error(
        "Esta peça é ilustrativa e não está disponível para compra.",
      );
    if (quantity > variant.stock)
      throw new Error(
        `Estoque insuficiente para ${product.name} (${variant.color}, ${variant.size}).`,
      );
    return {
      variant_id: id,
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      color: variant.color,
      size: variant.size,
      quantity,
      unit_price_cents: product.promo_cents ?? product.price_cents,
    };
  });
}
export function consentAllows(
  value: { analytics: boolean; marketing: boolean } | null,
  type: "analytics" | "marketing",
) {
  return value?.[type] === true;
}
export const publicSettings: Settings = {
  name: "Zion Maison",
  announcement: "Enviamos para todo o Brasil",
  whatsapp: "",
  instagram: "https://www.instagram.com/zionmaison_/",
  timezone: "America/Belem",
};
export function firstImage(p: Product) {
  return [...p.media]
    .sort((a, b) => a.sort_order - b.sort_order)
    .find((m) => m.asset.kind === "image" && m.asset.url)?.asset;
}
export const permissionOptions = [
  "products.read",
  "products.write",
  "stock.read",
  "stock.write",
  "content.read",
  "content.write",
  "reports.read",
] as const;
export function allowed(
  profile: { role: string; permissions: string[]; active: boolean } | null,
  permission: string,
) {
  return (
    !!profile?.active &&
    (profile.role === "owner" || profile.permissions.includes(permission))
  );
}
