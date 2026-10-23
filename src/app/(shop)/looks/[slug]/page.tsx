import { ResponsiveImage } from "@/components/responsive-image";
import { notFound } from "next/navigation";
import { getContent, getProducts } from "@/server/catalog";
import { database } from "@/server/supabase";
import { imageUrl, text } from "@/lib/content";
import { ProductCard } from "@/components/shop/product-card";
import { LookSelection } from "@/components/shop/look-selection";
export default async function LookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entries = await getContent("look");
  const look = entries.find((l) => l.slug === slug);
  if (!look) notFound();
  const db = await database();
  const { data: items } = await db
    .from("look_items")
    .select("*")
    .eq("look_id", look.id)
    .order("sort_order");
  const ids = (items ?? []).map((i) => i.product_id);
  const { products } = ids.length
    ? await getProducts({ ids })
    : { products: [] };
  return (
    <div className="section">
      <div className="page-intro">
        <p className="eyebrow">Shop the Look</p>
        <h1>{look.title}</h1>
        <p>{text(look.body, "text")}</p>
      </div>
      <div className="editorial-section">
        <div className="look-detail-image">
          {imageUrl(text(look.body, "image_url")) && (
            <ResponsiveImage
              src={imageUrl(text(look.body, "image_url"))}
              alt={look.title}
            />
          )}
          {(items ?? [])
            .filter(
              (i) =>
                i.x !== null &&
                i.y !== null &&
                products.some((p) => p.id === i.product_id),
            )
            .map((i, n) => (
              <a
                key={i.id}
                href={`#look-${i.product_id}`}
                className="look-hotspot"
                style={{ left: `${i.x}%`, top: `${i.y}%` }}
                aria-label={`Ver peça ${n + 1}`}
              >
                {n + 1}
              </a>
            ))}
        </div>
        <LookSelection products={products} />
      </div>
      <div className="product-grid" style={{ marginTop: 40 }}>
        {products.map((p) => (
          <div key={p.id} id={`look-${p.id}`}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
