import { notFound } from "next/navigation";
import Link from "next/link";
import { getProduct, getProducts } from "@/server/catalog";
import { ProductDetail } from "@/components/shop/product-detail";
import { ProductCard } from "@/components/shop/product-card";
import { firstImage } from "@/lib/domain";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Peça não encontrada" };
  return {
    title: String(p.details.seo_title || p.name),
    description: String(p.details.seo_description || p.short_description),
    alternates: { canonical: `/produto/${p.slug}` },
    openGraph: { images: firstImage(p)?.url ? [firstImage(p)!.url!] : [] },
  };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const { products } = await getProducts();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: firstImage(p)?.url,
    sku: p.sku,
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: ((p.promo_cents ?? p.price_cents) / 100).toFixed(2),
      availability: p.variants.some((v) => v.active && v.stock > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/produto/${p.slug}`,
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="breadcrumbs">
        <Link href="/">Início</Link>
        <span>/</span>
        <Link href="/catalogo">Coleção</Link>
        <span>/</span>
        <span>{p.name}</span>
      </div>
      <ProductDetail product={p} />
      <section className="section">
        <div className="section-top">
          <h2>Também pode acompanhar você</h2>
        </div>
        <div className="product-grid">
          {products
            .filter((v) => v.id !== p.id)
            .slice(0, 4)
            .map((v) => (
              <ProductCard key={v.id} product={v} />
            ))}
        </div>
      </section>
      <div data-track-product={p.id} hidden />
    </>
  );
}
