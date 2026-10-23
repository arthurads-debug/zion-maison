"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Copy, Archive, ArrowUpRight } from "lucide-react";
import { useResource, adminRequest, errorMessage } from "./api";
import { firstImage, money, type Product } from "@/lib/domain";
export function Products() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const { rows, count, error, loading, reload } = useResource<Product>(
    "products",
    new URLSearchParams({ page: String(page), q: query, status }).toString(),
  );
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  async function duplicate(p: Product) {
    setBusy(p.id);
    setNotice("");
    try {
      const data = await adminRequest("products", {
        product: {
          ...p,
          id: undefined,
          version: undefined,
          name: `${p.name} — cópia`,
          slug: `${p.slug}-copia-${crypto.randomUUID().slice(0, 6)}`,
          sku: null,
          status: "draft",
        },
        variants: p.variants.map((v) => ({ ...v, id: undefined, sku: null })),
        media: p.media.map((m) => ({ asset_id: m.asset_id, color: m.color })),
      });
      setNotice("Cópia criada como rascunho, com estoque inicial zero.");
      void data;
      reload();
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">O coração da sua curadoria</p>
          <h1>Produtos</h1>
          <p>Cadastre e cuide de cada peça da Maison.</p>
        </div>
        <Link href="/admin/produtos/novo" className="button small">
          <Plus size={17} />
          Adicionar produto
        </Link>
      </div>
      <div className="admin-toolbar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(String(new FormData(e.currentTarget).get("q") || ""));
            setPage(1);
          }}
        >
          <Search size={17} />
          <input
            name="q"
            aria-label="Buscar produtos"
            placeholder="Buscar nome ou SKU"
          />
          <button className="button outline small">Buscar</button>
        </form>
        <select
          aria-label="Filtrar por status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          <option value="published">Publicados</option>
          <option value="draft">Rascunhos</option>
          <option value="archived">Arquivados</option>
        </select>
        <span>{count} peças</span>
      </div>
      {(error || notice) && (
        <p role="status" className="notice">
          {error || notice}
        </p>
      )}
      <section className="admin-card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      className="table-product"
                      href={`/admin/produtos/${p.id}`}
                    >
                      {firstImage(p)?.url ? (
                        <img src={firstImage(p)!.url!} alt="" />
                      ) : (
                        <span className="table-image-empty">Z</span>
                      )}
                      <span>
                        {p.name}
                        <small>{p.variants.length} variações</small>
                      </span>
                    </Link>
                  </td>
                  <td>{p.sku || "—"}</td>
                  <td>{money(p.promo_cents ?? p.price_cents)}</td>
                  <td>{p.variants.reduce((s, v) => s + v.stock, 0)}</td>
                  <td>
                    <span className={`status-pill ${p.status}`}>
                      {p.status === "published"
                        ? "Publicado"
                        : p.status === "draft"
                          ? "Rascunho"
                          : "Arquivado"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link
                        className="icon-button"
                        href={`/admin/produtos/${p.id}`}
                        aria-label={`Editar ${p.name}`}
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                      <button
                        className="icon-button"
                        disabled={busy === p.id}
                        aria-label={`Duplicar ${p.name}`}
                        onClick={() => duplicate(p)}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Arquivar ${p.name}`}
                        onClick={async () => {
                          if (
                            !confirm(
                              `Arquivar “${p.name}”? A peça deixará de aparecer na loja.`,
                            )
                          )
                            return;
                          try {
                            await adminRequest(
                              "products",
                              { id: p.id },
                              "DELETE",
                            );
                            reload();
                          } catch (e) {
                            setNotice(errorMessage(e));
                          }
                        }}
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="table-empty">
            {loading
              ? "Carregando catálogo…"
              : "Nenhuma peça cadastrada. Adicione seu primeiro produto para começar."}
          </div>
        )}
      </section>
      <div className="admin-pagination">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          ← Anterior
        </button>
        <span>Página {page}</span>
        <button disabled={page * 25 >= count} onClick={() => setPage(page + 1)}>
          Próxima →
        </button>
      </div>
    </>
  );
}
