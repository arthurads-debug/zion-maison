import { z } from "zod";
import "server-only";
import { database, configured, checkDb } from "./supabase";
import {
  publicSettings,
  type Product,
  type Settings,
  type Taxonomy,
  type Content,
} from "@/lib/domain";
// Browser fixtures must never depend on, or populate, the merchant's live catalog.
const isolatedCatalog = () =>
  process.env.NODE_ENV !== "production" && process.env.ZION_E2E === "1";
const productSelect =
  "*,variants(*),media:product_media(id,asset_id,color,sort_order,asset:media_assets(id,kind,url,poster_url,alt,published,width,height))";
export type CatalogFilter = {
  q?: string;
  category?: string;
  collection?: string;
  color?: string;
  size?: string;
  min?: string;
  max?: string;
  available?: string;
  sort?: string;
  page?: string;
  ids?: string[];
  featured?: boolean;
  newest?: string;
};
const catalogFilterSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  collection: z.string().max(100).optional(),
  color: z.string().max(80).optional(),
  size: z.string().max(30).optional(),
  min: z.string().max(20).optional(),
  max: z.string().max(20).optional(),
  available: z.enum(["true", "false", ""]).optional(),
  newest: z.enum(["true", "false", ""]).optional(),
  sort: z
    .enum(["newest", "price-asc", "price-desc", "popular", "featured"])
    .optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  ids: z.array(z.uuid()).max(100).optional(),
  featured: z.boolean().optional(),
});
export async function getProducts(filters: CatalogFilter = {}) {
  if (!configured() || isolatedCatalog())
    return { products: [] as Product[], count: 0 };
  const input = catalogFilterSchema.parse(filters);
  const db = await database();
  const { data, error } = await db.rpc("search_catalog", { p_filters: input });
  checkDb(error);
  return {
    products: (data?.products || []) as Product[],
    count: Number(data?.count) || 0,
  };
}
export async function getProduct(slug: string) {
  if (!configured() || isolatedCatalog()) return null;
  const db = await database();
  const { data, error } = await db
    .from("products")
    .select(productSelect)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  checkDb(error);
  return data as unknown as Product | null;
}
export async function productsForVariants(ids: string[]) {
  const db = await database();
  const { data: variants, error } = await db
    .from("variants")
    .select("product_id")
    .in("id", ids);
  checkDb(error);
  const pids = [...new Set((variants ?? []).map((v) => v.product_id))];
  if (!pids.length) return [];
  const { data, error: err } = await db
    .from("products")
    .select(productSelect)
    .in("id", pids)
    .eq("status", "published");
  checkDb(err);
  return (data ?? []) as unknown as Product[];
}
export async function getTaxonomy(kind?: string) {
  if (!configured() || isolatedCatalog()) return [] as Taxonomy[];
  const db = await database();
  let query = db
    .from("taxonomy")
    .select("*")
    .eq("published", true)
    .order("sort_order");
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query;
  checkDb(error);
  return (data ?? []) as Taxonomy[];
}
export async function getContent(kind?: string) {
  if (!configured() || isolatedCatalog()) return [] as Content[];
  const db = await database();
  let query = db
    .from("content_entries")
    .select("*")
    .eq("status", "published")
    .order("sort_order");
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query;
  checkDb(error);
  return (data ?? []) as Content[];
}
export async function getSettings() {
  if (!configured() || isolatedCatalog()) return publicSettings;
  const db = await database();
  const { data, error } = await db
    .from("site_settings")
    .select("data")
    .eq("id", "public")
    .single();
  checkDb(error);
  return { ...publicSettings, ...data?.data } as Settings;
}
export { productSelect };
