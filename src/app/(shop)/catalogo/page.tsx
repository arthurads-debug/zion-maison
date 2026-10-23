import Link from "next/link";
import { getProducts, getTaxonomy } from "@/server/catalog";
import { ProductCard } from "@/components/shop/product-card";
import type { CatalogFilter } from "@/server/catalog";
export const metadata = { title: "Nossa coleção" };
export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const [{ products, count }, categories] = await Promise.all([
    getProducts(params as CatalogFilter),
    getTaxonomy("category"),
  ]);
  return (
    <div className="catalog-page">
      <div className="page-intro">
        <p className="eyebrow">A curadoria da Maison</p>
        <h1>
          {params.q
            ? `Resultados para “${params.q}”`
            : "Peças para a sua essência."}
        </h1>
        <p>Encontre a elegância nos detalhes, em cada escolha.</p>
      </div>
      <form className="catalog-filters" action="/catalogo">
        <label className="filter-search">
          Buscar
          <input
            name="q"
            placeholder="Nome, cor ou estilo"
            defaultValue={params.q}
          />
        </label>
        <label>
          Categoria
          <select name="category" defaultValue={params.category || ""}>
            <option value="">Todas as peças</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cor
          <input name="color" placeholder="Todas" defaultValue={params.color} />
        </label>
        <label>
          Tamanho
          <input name="size" placeholder="Todos" defaultValue={params.size} />
        </label>
        <label>
          De R$
          <input
            name="min"
            type="number"
            min="0"
            step="0.01"
            defaultValue={params.min}
          />
        </label>
        <label>
          Até R$
          <input
            name="max"
            type="number"
            min="0"
            step="0.01"
            defaultValue={params.max}
          />
        </label>
        <label>
          Ordenar
          <select name="sort" defaultValue={params.sort || "newest"}>
            <option value="newest">Mais recentes</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
            <option value="featured">Destaques</option>
            <option value="popular">Mais procuradas</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="available"
            value="true"
            defaultChecked={params.available === "true"}
          />
          Em estoque
        </label>
        <button className="button small">Filtrar</button>
        <Link href="/catalogo" className="text-link">
          Limpar
        </Link>
      </form>
      <div className="catalog-meta">
        <span>
          {count} {count === 1 ? "peça" : "peças"}
        </span>
        <span>Uma seleção feita para você</span>
      </div>
      {products.length ? (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard product={p} key={p.id} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-symbol">✧</span>
          <h2>Nenhuma peça encontrada</h2>
          <p>
            {params.q || params.category
              ? "Experimente outra busca ou ajuste os filtros."
              : "A coleção ainda não tem peças publicadas. Volte em breve para descobrir as novidades."}
          </p>
          {Object.keys(params).length > 0 && (
            <Link href="/catalogo" className="text-link">
              Ver toda a coleção →
            </Link>
          )}
        </div>
      )}
      {count > 24 && (
        <nav className="pagination" aria-label="Paginação">
          {Array.from({ length: Math.ceil(count / 24) }, (_, i) => (
            <Link
              aria-current={
                Number(params.page || 1) === i + 1 ? "page" : undefined
              }
              key={i}
              href={`/catalogo?${new URLSearchParams({ ...params, page: String(i + 1) })}`}
            >
              {i + 1}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
