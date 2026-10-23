import { ResponsiveImage } from "@/components/responsive-image";
import Link from "next/link";
import { getContent } from "@/server/catalog";
import { imageUrl, text } from "@/lib/content";
export const metadata = { title: "Shop the Look" };
export default async function Looks() {
  const looks = await getContent("look");
  return (
    <div className="section">
      <div className="page-intro">
        <p className="eyebrow">Combinações com personalidade</p>
        <h1>Shop the Look</h1>
        <p>Descubra peças que se encontram e crie a sua composição.</p>
      </div>
      {looks.length ? (
        <div className="look-grid">
          {looks.map((l) => (
            <Link href={`/looks/${l.slug}`} className="look-card" key={l.id}>
              {imageUrl(text(l.body, "image_url")) && (
                <ResponsiveImage
                  src={imageUrl(text(l.body, "image_url"))}
                  alt={l.title}
                />
              )}
              <h3>{l.title} ↗</h3>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Inspirações em preparação.</h2>
          <p>Explore as peças disponíveis enquanto os looks são publicados.</p>
          <Link href="/catalogo" className="button">
            Explorar coleção →
          </Link>
        </div>
      )}
    </div>
  );
}
