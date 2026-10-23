import { HomeOrder } from "@/components/shop/home-order";
import { ResponsiveImage } from "@/components/responsive-image";
import Link from "next/link";
import {
  getProducts,
  getContent,
  getTaxonomy,
  getSettings,
} from "@/server/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { EditorialVideo } from "@/components/shop/editorial-video";
import { ArrowRight, ArrowUpRight } from "@/components/shop/icons";
import { text, safeLink, imageUrl } from "@/lib/content";
export default async function Home() {
  const [{ products }, content, categories, newest, popular, settings] =
    await Promise.all([
      getProducts({ featured: true }),
      getContent(),
      getTaxonomy("category"),
      getProducts({ sort: "newest" }),
      getProducts({ sort: "popular" }),
      getSettings(),
    ]);
  const hero = content.find((c) => c.kind === "hero");
  const heroImage = imageUrl(text(hero?.body ?? {}, "image_url"));
  const mobileImage = imageUrl(text(hero?.body ?? {}, "mobile_image_url"));
  const sections = content.filter((c) => c.kind === "section");
  const videos = content.filter((c) => c.kind === "video");
  const looks = content.filter((c) => c.kind === "look");
  const instagram = content.filter((c) => c.kind === "instagram");
  return (
    <HomeOrder order={settings.home_order}>
      <section
        data-home-block="hero"
        className={`hero ${heroImage ? "has-image" : ""}`}
      >
        {heroImage && (
          <picture>
            {mobileImage && (
              <source media="(max-width: 700px)" srcSet={mobileImage} />
            )}
            <ResponsiveImage
              className="hero-photo"
              src={heroImage}
              alt={text(hero?.body ?? {}, "alt", "Editorial Zion Maison")}
              fetchPriority="high"
            />
          </picture>
        )}
        <div className="hero-content">
          <p className="eyebrow">ZION MAISON · MODA COM SIGNIFICADO</p>
          <h1>
            {hero?.title || (
              <>
                Elegância que
                <br />
                acompanha <em>você.</em>
              </>
            )}
          </h1>
          <p className="hero-description">
            {text(
              hero?.body ?? {},
              "subtitle",
              "Peças atemporais que traduzem personalidade, qualidade e versatilidade.",
            )}
          </p>
          <Link
            href={safeLink(text(hero?.body ?? {}, "cta_href", "/catalogo"))}
            className="button"
          >
            {text(hero?.body ?? {}, "cta_label", "Explorar coleção")}
            <ArrowRight size={18} />
          </Link>
        </div>
        {!heroImage && (
          <div className="hero-art" aria-hidden="true">
            <div className="fabric fabric-one" />
            <div className="fabric fabric-two" />
            <span className="hero-monogram">Z</span>
            <span className="art-caption">L’ART DE S’HABILLER</span>
          </div>
        )}
        <div className="hero-bottom">
          <span>ESSÊNCIA ATEMPORAL</span>
          <span>
            Descubra o universo Zion <ArrowDown />
          </span>
          <span>01 — MAISON</span>
        </div>
      </section>
      <div data-home-block="values" className="brand-values">
        <span>Escolhas com personalidade</span>
        <i>✧</i>
        <span>Elegância em movimento</span>
        <i>✧</i>
        <span>Envios para todo o Brasil</span>
      </div>
      {categories.length > 0 && (
        <section
          data-home-block="categories"
          className="section category-section"
        >
          <div className="section-heading">
            <p className="eyebrow">Encontre o seu estilo</p>
            <h2>Um universo de possibilidades.</h2>
          </div>
          <div className="category-grid">
            {categories.map((c, i) => (
              <Link
                href={`/catalogo?category=${c.slug}`}
                key={c.id}
                className="category-card"
              >
                {imageUrl(c.image_url || "") ? (
                  <ResponsiveImage
                    src={imageUrl(c.image_url!)}
                    alt={c.name}
                    loading="lazy"
                  />
                ) : (
                  <div className="category-placeholder">0{i + 1}</div>
                )}
                <div>
                  <h3>{c.name}</h3>
                  <ArrowUpRight size={18} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section data-home-block="featured" className="section picks-section">
        <div className="section-top">
          <div>
            <p className="eyebrow">Curadoria Zion Maison</p>
            <h2>Escolhas para você</h2>
          </div>
          <Link className="text-link" href="/catalogo">
            Ver coleção <ArrowRight size={17} />
          </Link>
        </div>
        {products.length ? (
          <div className="product-grid">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="collection-awaiting">
            <span className="tiny-star">✧</span>
            <div>
              <h3>Espaço para novas descobertas.</h3>
              <p>
                As peças da coleção aparecerão aqui assim que forem publicadas.
              </p>
            </div>
            <Link
              href="/catalogo"
              className="circle-link"
              aria-label="Explorar catálogo"
            >
              <ArrowUpRight />
            </Link>
          </div>
        )}
      </section>
      {[
        {
          key: "newest",
          title: "Novidades na Maison",
          products: newest.products,
        },
        {
          key: "popular",
          title: "Mais procuradas",
          products: popular.products,
        },
      ].map(
        (block) =>
          block.products.length > 0 && (
            <section
              data-home-block={block.key}
              className="section"
              key={block.key}
            >
              <div className="section-top">
                <h2>{block.title}</h2>
                <Link
                  className="text-link"
                  href={`/catalogo?sort=${block.key}`}
                >
                  Ver todas <ArrowRight size={16} />
                </Link>
              </div>
              <div className="product-grid">
                {block.products.slice(0, 4).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          ),
      )}
      <section data-home-block="story" className="maison-story">
        <div className="story-emblem">
          <span>PERSONALIDADE · QUALIDADE · VERSATILIDADE</span>
          <strong>Z</strong>
          <small>MAISON</small>
        </div>
        <div className="story-copy">
          <p className="eyebrow">O universo Zion</p>
          <h2>
            Mais que moda,
            <br />
            uma maneira de
            <br />
            <em>se expressar.</em>
          </h2>
          <p>
            Acreditamos em uma moda atemporal, com peças que valorizam a sua
            essência e acompanham cada momento da vida.
          </p>
          <Link href="/sobre" className="text-link">
            Conheça nossa história <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      {videos.length > 0 && (
        <section data-home-block="videos" className="section">
          <div className="section-top">
            <div>
              <p className="eyebrow">Textura. Movimento. Presença.</p>
              <h2>Zion in Motion</h2>
            </div>
            <span className="muted">Descubra os detalhes em movimento.</span>
          </div>
          <div className="motion-grid">
            {videos.map(
              (v) =>
                imageUrl(text(v.body, "video_url")) && (
                  <EditorialVideo
                    key={v.id}
                    src={imageUrl(text(v.body, "video_url"))}
                    poster={imageUrl(text(v.body, "poster_url"))}
                    title={v.title}
                    href={safeLink(text(v.body, "cta_href"))}
                  />
                ),
            )}
          </div>
        </section>
      )}
      {looks.length > 0 && (
        <section data-home-block="looks" className="section">
          <div className="section-top">
            <div>
              <p className="eyebrow">Combinações que inspiram</p>
              <h2>Shop the Look</h2>
            </div>
            <Link className="text-link" href="/looks">
              Todos os looks <ArrowRight size={16} />
            </Link>
          </div>
          <div className="look-grid">
            {looks.slice(0, 2).map((l) => (
              <Link className="look-card" href={`/looks/${l.slug}`} key={l.id}>
                {imageUrl(text(l.body, "image_url")) && (
                  <ResponsiveImage
                    src={imageUrl(text(l.body, "image_url"))}
                    alt={l.title}
                    loading="lazy"
                  />
                )}
                <h3>
                  {l.title} <ArrowUpRight />
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
      {sections.map((s) => (
        <section
          data-home-block="editorial"
          className="section editorial-section"
          key={s.id}
        >
          {imageUrl(text(s.body, "image_url")) && (
            <ResponsiveImage
              src={imageUrl(text(s.body, "image_url"))}
              alt={s.title}
              loading="lazy"
            />
          )}
          <div>
            <p className="eyebrow">{text(s.body, "subtitle")}</p>
            <h2>{s.title}</h2>
            <p>{text(s.body, "text")}</p>
            {text(s.body, "cta_label") && (
              <Link
                href={safeLink(text(s.body, "cta_href"))}
                className="text-link"
              >
                {text(s.body, "cta_label")}
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </section>
      ))}
      {instagram.length > 0 && (
        <section data-home-block="instagram" className="section">
          <div className="section-top">
            <h2>O olhar da Maison</h2>
            <a
              href="https://www.instagram.com/zionmaison_/"
              className="text-link"
              target="_blank"
              rel="noreferrer"
            >
              @zionmaison_ ↗
            </a>
          </div>
          <div className="instagram-grid">
            {instagram.map((c) => (
              <a
                key={c.id}
                href={safeLink(text(c.body, "cta_href"))}
                target="_blank"
                rel="noreferrer"
              >
                {imageUrl(text(c.body, "image_url")) && (
                  <ResponsiveImage
                    src={imageUrl(text(c.body, "image_url"))}
                    alt={c.title}
                    loading="lazy"
                  />
                )}
              </a>
            ))}
          </div>
        </section>
      )}
      <section data-home-block="closing" className="closing-note">
        <p className="eyebrow">ZION MAISON</p>
        <h2>
          O essencial é<br />
          <em>ser você.</em>
        </h2>
        <Link href="/catalogo" className="text-link">
          Encontre sua próxima escolha <ArrowRight size={17} />
        </Link>
      </section>
    </HomeOrder>
  );
}
function ArrowDown() {
  return <span aria-hidden="true">↓</span>;
}
