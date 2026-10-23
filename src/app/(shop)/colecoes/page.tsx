import { ResponsiveImage } from "@/components/responsive-image";
import Link from "next/link";
import { getTaxonomy } from "@/server/catalog";
import { imageUrl } from "@/lib/content";
export const metadata = { title: "Coleções" };
export default async function Collections() {
  const collections = await getTaxonomy("collection");
  return (
    <div className="section">
      <div className="page-intro">
        <p className="eyebrow">Histórias para vestir</p>
        <h1>Nossas coleções</h1>
      </div>
      {collections.length ? (
        <div className="collection-grid">
          {collections.map((c) => (
            <Link href={`/colecoes/${c.slug}`} key={c.id}>
              {imageUrl(c.image_url || "") && (
                <ResponsiveImage src={imageUrl(c.image_url!)} alt={c.name} />
              )}
              <h2>{c.name}</h2>
              <p className="muted">{c.description}</p>
              <span className="text-link">Descobrir coleção →</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Novas histórias em preparação.</h2>
          <p>As coleções publicadas pela Maison aparecerão aqui.</p>
          <Link href="/catalogo" className="text-link">
            Explorar catálogo →
          </Link>
        </div>
      )}
    </div>
  );
}
