import { notFound } from "next/navigation";
import { getTaxonomy, getProducts } from "@/server/catalog";
import { ProductCard } from "@/components/shop/product-card";
export default async function Collection({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const taxonomy = await getTaxonomy("collection");
  const collection = taxonomy.find((c) => c.slug === slug);
  if (!collection) notFound();
  const { products } = await getProducts({ collection: slug });
  return (
    <div className="section">
      <div className="page-intro">
        <p className="eyebrow">Coleção Zion Maison</p>
        <h1>{collection.name}</h1>
        <p>{collection.description}</p>
      </div>
      {products.length ? (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Esta coleção ainda não tem peças publicadas.</p>
        </div>
      )}
    </div>
  );
}
