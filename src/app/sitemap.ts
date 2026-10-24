import { isIllustrativeProduct } from "@/lib/domain";
import type { MetadataRoute } from "next";
import { configured, database } from "@/server/supabase";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";
  const routes = ["", "/catalogo", "/colecoes", "/looks", "/sobre", "/contato"];
  const result: MetadataRoute.Sitemap = routes.map((path) => ({
    url: base + path,
    changeFrequency: "weekly",
  }));
  if (configured()) {
    const db = await database();
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db
        .from("products")
        .select("slug,updated_at,details")
        .eq("status", "published")
        .order("id")
        .range(offset, offset + 999);
      if (error) throw error;
      for (const p of (data || []).filter((p) => !isIllustrativeProduct(p)))
        result.push({
          url: `${base}/produto/${p.slug}`,
          lastModified: p.updated_at,
        });
      if (!data || data.length < 1000) break;
    }
    const [{ data: taxonomy }, { data: looks }] = await Promise.all([
      db
        .from("taxonomy")
        .select("kind,slug")
        .eq("kind", "collection")
        .eq("published", true),
      db
        .from("content_entries")
        .select("slug")
        .eq("kind", "look")
        .eq("status", "published"),
    ]);
    for (const c of taxonomy || [])
      result.push({ url: `${base}/colecoes/${c.slug}` });
    for (const c of looks || [])
      result.push({ url: `${base}/looks/${c.slug}` });
  }
  return result;
}
