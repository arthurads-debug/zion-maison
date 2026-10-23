"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useResource, adminRequest, errorMessage } from "./api";
import { slugify, type Product } from "@/lib/domain";
import { MediaLibrary, type Asset } from "./media-library";
type Row = {
  id: string;
  name?: string;
  title?: string;
  slug: string;
  kind: string;
  status?: string;
  published?: boolean;
  description?: string;
  image_url?: string;
  sort_order: number;
  body?: Record<string, unknown>;
  look_items?: { product_id: string; x: number | null; y: number | null }[];
};
const bodyFields = [
  ["subtitle", "Subtítulo"],
  ["text", "Texto"],
  ["image_url", "Fotografia principal (URL)"],
  ["mobile_image_url", "Fotografia mobile (URL)"],
  ["alt", "Descrição acessível da imagem"],
  ["video_url", "Vídeo otimizado (URL)"],
  ["poster_url", "Capa do vídeo (URL)"],
  ["cta_label", "Texto do botão"],
  ["cta_href", "Destino do botão"],
] as const;
export function ResourceEditor({
  resource,
  title,
  kind,
}: {
  resource: "content" | "taxonomy";
  title: string;
  kind?: string;
}) {
  const [page, setPage] = useState(1);
  const { rows, count, error, loading, reload } = useResource<Row>(
    resource,
    new URLSearchParams({
      page: String(page),
      ...(kind ? { kind } : {}),
    }).toString(),
  );
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]),
    [productPage, setProductPage] = useState(1),
    [productQuery, setProductQuery] = useState(""),
    [productCount, setProductCount] = useState(0);
  const associations = editing?.kind === "look" || editing?.kind === "video";
  useEffect(() => {
    if (!associations) return;
    const c = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `/api/catalog?q=${encodeURIComponent(productQuery)}&page=${productPage}`,
        { signal: c.signal },
      )
        .then(async (r) => {
          if (!r.ok) throw Error("Não foi possível carregar as peças.");
          const d = await r.json();
          setProducts(d.products);
          setProductCount(d.count);
        })
        .catch((e) => {
          if (e.name !== "AbortError") setMessage(errorMessage(e));
        });
    }, 200);
    return () => {
      c.abort();
      clearTimeout(timer);
    };
  }, [associations, productPage, productQuery]);
  const patch = (value: Partial<Row>) =>
    setEditing((old) => ({ ...old, ...value }));
  const body = (key: string, value: string) =>
    patch({ body: { ...editing?.body, [key]: value } });
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const payload =
        resource === "content"
          ? {
              ...editing,
              title: editing?.title,
              body: editing?.body || {},
              status: editing?.status || "draft",
            }
          : {
              ...editing,
              name: editing?.name,
              published: editing?.published || false,
            };
      await adminRequest(resource, payload);
      setEditing(null);
      reload();
      setMessage(
        "Conteúdo salvo. Itens publicados já estão disponíveis na loja.",
      );
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function useAsset(asset: Asset) {
    if (library === "taxonomy") patch({ image_url: asset.url });
    else if (library) body(library, asset.url);
    setLibrary(null);
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">A expressão da sua Maison</p>
          <h1>{title}</h1>
          <p>Organize, edite e publique diretamente na sua loja.</p>
        </div>
        <button
          className="button small"
          onClick={() =>
            setEditing({
              kind: kind || (resource === "content" ? "section" : "category"),
              title: "",
              name: "",
              slug: "",
              sort_order: 0,
              status: "draft",
              published: false,
              body: {},
              look_items: [],
            })
          }
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>
      {(error || message) && (
        <p className="notice" role="status">
          {error || message}
        </p>
      )}
      {editing && (
        <section className="admin-card">
          <div className="card-heading">
            <h2>{editing.id ? "Editar conteúdo" : "Novo conteúdo"}</h2>
            <button
              className="icon-button"
              aria-label="Fechar edição"
              onClick={() => setEditing(null)}
            >
              <X />
            </button>
          </div>
          <div className="form-grid">
            <label>
              Nome ou título
              <input
                value={editing.title || editing.name || ""}
                onChange={(e) =>
                  patch({
                    ...(resource === "content"
                      ? { title: e.target.value }
                      : { name: e.target.value }),
                    ...(!editing.id ? { slug: slugify(e.target.value) } : {}),
                  })
                }
              />
            </label>
            <label>
              Tipo
              <select
                value={editing.kind}
                onChange={(e) => patch({ kind: e.target.value })}
              >
                {(resource === "content"
                  ? [
                      ["hero", "Hero principal"],
                      ["section", "Seção da homepage"],
                      ["page", "Página institucional"],
                      ["look", "Shop the Look"],
                      ["video", "Zion in Motion"],
                      ["instagram", "Instagram editorial"],
                      ["campaign", "Campanha"],
                    ]
                  : [
                      ["category", "Categoria"],
                      ["collection", "Coleção"],
                    ]
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Endereço / identificador
              <input
                value={editing.slug || ""}
                onChange={(e) => patch({ slug: e.target.value })}
              />
            </label>
            <label>
              Ordem de exibição
              <input
                type="number"
                value={editing.sort_order || 0}
                onChange={(e) => patch({ sort_order: Number(e.target.value) })}
              />
            </label>
            {resource === "taxonomy" ? (
              <>
                <label className="full-width">
                  Descrição
                  <textarea
                    rows={3}
                    value={editing.description || ""}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </label>
                <label className="full-width">
                  Imagem
                  <input
                    value={editing.image_url || ""}
                    onChange={(e) => patch({ image_url: e.target.value })}
                  />
                  <button
                    className="text-link"
                    onClick={() => setLibrary("taxonomy")}
                  >
                    Escolher na biblioteca
                  </button>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editing.published || false}
                    onChange={(e) => patch({ published: e.target.checked })}
                  />
                  Publicado
                </label>
              </>
            ) : (
              <>
                <label>
                  Status
                  <select
                    value={editing.status || "draft"}
                    onChange={(e) => patch({ status: e.target.value })}
                  >
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </label>
                {bodyFields
                  .filter(
                    ([key]) =>
                      editing.kind === "video" ||
                      (key !== "video_url" && key !== "poster_url"),
                  )
                  .map(([key, label]) => (
                    <label
                      className={key === "text" ? "full-width" : ""}
                      key={key}
                    >
                      {label}
                      {key === "text" ? (
                        <textarea
                          rows={6}
                          value={String(editing.body?.[key] || "")}
                          onChange={(e) => body(key, e.target.value)}
                        />
                      ) : (
                        <input
                          value={String(editing.body?.[key] || "")}
                          onChange={(e) => body(key, e.target.value)}
                        />
                      )}
                      {[
                        "image_url",
                        "mobile_image_url",
                        "video_url",
                        "poster_url",
                      ].includes(key) && (
                        <button
                          className="text-link"
                          onClick={() => setLibrary(key)}
                        >
                          Escolher na biblioteca
                        </button>
                      )}
                    </label>
                  ))}
              </>
            )}
            {associations && (
              <div className="full-width">
                <label>
                  Buscar peças publicadas
                  <input
                    value={productQuery}
                    onChange={(e) => {
                      setProductQuery(e.target.value);
                      setProductPage(1);
                    }}
                  />
                </label>
                <div className="admin-pagination">
                  <button
                    type="button"
                    disabled={productPage === 1}
                    onClick={() => setProductPage((p) => p - 1)}
                  >
                    ← Anterior
                  </button>
                  <span>Peças · página {productPage}</span>
                  <button
                    type="button"
                    disabled={productPage * 24 >= productCount}
                    onClick={() => setProductPage((p) => p + 1)}
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            )}
            {editing.kind === "look" && (
              <div className="full-width">
                <h3>Peças deste look</h3>
                <p className="muted small-text">
                  Associe as peças e posicione os pontos em porcentagens da
                  fotografia.
                </p>
                {products.map((p) => {
                  const selected = editing.look_items?.find(
                    (i) => i.product_id === p.id,
                  );
                  return (
                    <div key={p.id} className="look-product-row">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={(e) =>
                            patch({
                              look_items: e.target.checked
                                ? [
                                    ...(editing.look_items || []),
                                    { product_id: p.id, x: null, y: null },
                                  ]
                                : (editing.look_items || []).filter(
                                    (i) => i.product_id !== p.id,
                                  ),
                            })
                          }
                        />
                        {p.name}
                      </label>
                      {selected && (
                        <>
                          <label>
                            X %
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={selected.x ?? ""}
                              onChange={(e) =>
                                patch({
                                  look_items: editing.look_items?.map((i) =>
                                    i.product_id === p.id
                                      ? {
                                          ...i,
                                          x:
                                            e.target.value === ""
                                              ? null
                                              : Number(e.target.value),
                                        }
                                      : i,
                                  ),
                                })
                              }
                            />
                          </label>
                          <label>
                            Y %
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={selected.y ?? ""}
                              onChange={(e) =>
                                patch({
                                  look_items: editing.look_items?.map((i) =>
                                    i.product_id === p.id
                                      ? {
                                          ...i,
                                          y:
                                            e.target.value === ""
                                              ? null
                                              : Number(e.target.value),
                                        }
                                      : i,
                                  ),
                                })
                              }
                            />
                          </label>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {editing.kind === "video" && (
              <p className="notice full-width">
                Reels da página inicial: use vídeo vertical em 9:16
                (recomendado: 1080 × 1920 px), com imagem de capa. A reprodução
                é em looping e começa sem som.
              </p>
            )}
            {editing.kind === "video" && (
              <label className="full-width">
                Abrir produto ou look
                <select
                  value={String(editing.body?.cta_href || "")}
                  onChange={(e) => body("cta_href", e.target.value)}
                >
                  <option value="">Escolher destino</option>
                  {Boolean(editing.body?.cta_href) &&
                    !products.some(
                      (p) => `/produto/${p.slug}` === editing.body?.cta_href,
                    ) && (
                      <option value={String(editing.body?.cta_href)}>
                        Destino atual: {String(editing.body?.cta_href)}
                      </option>
                    )}
                  {products.map((p) => (
                    <option key={p.id} value={`/produto/${p.slug}`}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {editing.body?.image_url &&
          typeof editing.body.image_url === "string" &&
          /^https?:/.test(editing.body.image_url) ? (
            <details>
              <summary>Prévia da imagem</summary>
              <img
                src={editing.body.image_url}
                alt={editing.title || ""}
                style={{ maxHeight: 400 }}
              />
            </details>
          ) : null}
          <button
            className="button"
            style={{ marginTop: 25 }}
            disabled={busy}
            onClick={save}
          >
            {busy ? "Salvando…" : "Salvar conteúdo"}
          </button>
        </section>
      )}
      <section className="admin-card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Conteúdo</th>
                <th>Tipo</th>
                <th>Ordem</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.title || row.name}
                    <small className="table-subtitle">/{row.slug}</small>
                  </td>
                  <td>{row.kind}</td>
                  <td>{row.sort_order}</td>
                  <td>
                    <span
                      className={`status-pill ${row.status || (row.published ? "published" : "draft")}`}
                    >
                      {row.status === "published" || row.published
                        ? "Publicado"
                        : "Rascunho / arquivado"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        aria-label="Editar conteúdo"
                        onClick={() => {
                          setEditing(row);
                          setMessage("");
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Excluir conteúdo"
                        onClick={async () => {
                          if (
                            !confirm(
                              "Excluir este conteúdo? Esta ação não pode ser desfeita.",
                            )
                          )
                            return;
                          try {
                            await adminRequest(
                              resource,
                              { id: row.id },
                              "DELETE",
                            );
                            reload();
                          } catch (e) {
                            setMessage(errorMessage(e));
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="table-empty">
            {loading
              ? "Carregando…"
              : "Ainda não há conteúdo cadastrado nesta área."}
          </p>
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
      {library && (
        <div className="inline-library admin-card">
          <div className="card-heading">
            <h2>Escolher mídia</h2>
            <button
              className="icon-button"
              aria-label="Fechar biblioteca"
              onClick={() => setLibrary(null)}
            >
              <X />
            </button>
          </div>
          <MediaLibrary embedded onSelect={useAsset} />
        </div>
      )}
    </>
  );
}
