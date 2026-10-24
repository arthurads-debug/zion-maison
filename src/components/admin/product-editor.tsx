"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  GripVertical,
  Check,
  Circle,
  ArrowRight,
  X,
} from "lucide-react";
import {
  slugify,
  isIllustrativeProduct,
  type Product,
  type Taxonomy,
  type Variant,
} from "@/lib/domain";
import { adminRequest, errorMessage, useResource } from "./api";
import { MediaLibrary, type Asset } from "./media-library";
import { ProductCard } from "../shop/product-card";
import { ProductDetail } from "../shop/product-detail";
import { Dashboard } from "./dashboard";
type Photo = { asset_id: string; color: string | null; asset: Asset };
type EditableVariant = Partial<Variant> & {
  color: string;
  size: string;
  active: boolean;
};
export function ProductEditor({
  initial,
  initialTab = "information",
}: {
  initial: Product | null;
  initialTab?: string;
}) {
  const router = useRouter();
  const [product, setProduct] = useState({
    name: initial?.name || "",
    slug: initial?.slug || "",
    sku: initial?.sku || "",
    description: initial?.description || "",
    short_description: initial?.short_description || "",
    price: initial
      ? (initial.price_cents / 100).toFixed(2).replace(".", ",")
      : "",
    promo: initial?.promo_cents
      ? (initial.promo_cents / 100).toFixed(2).replace(".", ",")
      : "",
    status: initial?.status || "draft",
    featured: initial?.featured || false,
    sort_order: initial?.sort_order || 0,
    category_id: initial?.category_id || "",
    collection_id: initial?.collection_id || "",
    details: initial?.details || {},
  });
  const [variants, setVariants] = useState<EditableVariant[]>(
    initial?.variants || [],
  );
  const [photos, setPhotos] = useState<Photo[]>(
    (initial?.media || []).map((m) => ({
      asset_id: m.asset_id,
      color: m.color,
      asset: m.asset as unknown as Asset,
    })),
  );
  const [tab, setTab] = useState(initialTab);
  const [showLive, setShowLive] = useState(false);
  const [batchColors, setBatchColors] = useState("");
  const [batchSizes, setBatchSizes] = useState("P, M, G");
  const [combinationNotice, setCombinationNotice] = useState("");
  const steps = [
    ["information", "A peça"],
    ["media", "Fotos"],
    ["variants", "Cores e tamanhos"],
    ["publication", "Publicação"],
  ];
  const step = steps.findIndex(([key]) => key === tab);
  function generateVariants() {
    const split = (value: string) => [
      ...new Set(
        value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      ),
    ];
    const colors = split(batchColors),
      sizes = split(batchSizes);
    if (!colors.length || !sizes.length) {
      setCombinationNotice("Informe pelo menos uma cor e um tamanho.");
      return;
    }
    const key = (color: string, size: string) =>
      JSON.stringify([
        color.toLocaleLowerCase("pt-BR"),
        size.toLocaleLowerCase("pt-BR"),
      ]);
    const existing = new Set(
      variants.map((v) => key(v.color.trim(), v.size.trim())),
    );
    const added: EditableVariant[] = [];
    for (const color of colors)
      for (const size of sizes) {
        const entry = key(color, size);
        if (!existing.has(entry)) {
          added.push({ color, size, active: true, stock: 0, low_stock: 2 });
          existing.add(entry);
        }
      }
    if (variants.length + added.length > 100) {
      setCombinationNotice(
        "Você pode ter até 100 combinações por peça. Reduza as cores ou os tamanhos.",
      );
      return;
    }
    setVariants((all) => [...all, ...added]);
    setCombinationNotice(
      added.length
        ? `${added.length} combinações adicionadas. As opções existentes foram preservadas.`
        : "Essas combinações já estão cadastradas.",
    );
  }
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const library = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLDialogElement>(null);
  const dragged = useRef(0);
  const { rows: taxonomy } = useResource<Taxonomy>("taxonomy");
  const set = (field: string, value: unknown) =>
    setProduct((p) => ({ ...p, [field]: value }));
  function choose(asset: Asset) {
    if (photos.some((p) => p.asset_id === asset.id)) return;
    setPhotos((p) => [...p, { asset_id: asset.id, color: null, asset }]);
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length) return;
    setPhotos((all) => {
      const next = [...all];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }
  async function save() {
    if (!product.name.trim()) {
      setError("Dê um nome à peça antes de salvar.");
      setTab("information");
      return;
    }
    if (!product.slug.trim()) {
      setError("Confira o endereço da peça em Mais opções.");
      setTab("information");
      return;
    }
    const price = Number(product.price.replace(",", "."));
    if (!Number.isFinite(price) || price < 0 || !product.price.trim()) {
      setError("Informe um preço válido para a peça.");
      setTab("information");
      return;
    }
    if (
      product.promo &&
      (!Number.isFinite(Number(product.promo.replace(",", "."))) ||
        Number(product.promo.replace(",", ".")) < 0 ||
        Number(product.promo.replace(",", ".")) >= price)
    ) {
      setError("O preço promocional deve ser menor que o preço da peça.");
      setTab("information");
      return;
    }
    if (variants.some((v) => !v.color.trim() || !v.size.trim())) {
      setError(
        "Preencha a cor e o tamanho de cada opção, ou remova as linhas vazias.",
      );
      setTab("variants");
      return;
    }
    if (
      product.status === "published" &&
      (!photos.some((p) => p.asset.kind === "image") ||
        !variants.some((v) => v.active))
    ) {
      setError(
        "Para publicar, adicione uma foto e pelo menos uma opção de cor e tamanho ativa.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await adminRequest("products", {
        product: {
          ...product,
          id: initial?.id,
          version: initial?.version,
          sku: product.sku || null,
          category_id: product.category_id || null,
          collection_id: product.collection_id || null,
          price_cents: Math.round(
            Number(product.price.replace(",", ".")) * 100,
          ),
          promo_cents: product.promo
            ? Math.round(Number(product.promo.replace(",", ".")) * 100)
            : null,
        },
        variants: variants.map((v) => ({
          id: v.id,
          color: v.color,
          size: v.size,
          sku: v.sku || null,
          active: v.active,
          low_stock: v.low_stock ?? 2,
        })),
        media: photos.map((p) => ({ asset_id: p.asset_id, color: p.color })),
      });
      setSuccess(
        product.status === "published"
          ? "Produto salvo e publicado na loja."
          : "Rascunho salvo. Você pode continuar depois.",
      );
      router.replace(`/admin/produtos/${result.id}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const previewProduct = {
    ...initial,
    ...product,
    id: initial?.id || "preview",
    price_cents: Math.round(Number(product.price.replace(",", ".")) * 100) || 0,
    promo_cents: product.promo
      ? Math.round(Number(product.promo.replace(",", ".")) * 100)
      : null,
    version: initial?.version || 0,
    category_id: product.category_id || null,
    collection_id: product.collection_id || null,
    status: product.status,
    variants: variants.map((v, i) => ({
      ...v,
      id: v.id || `preview-${i}`,
      stock: v.stock || 0,
      version: v.version || 0,
      product_id: initial?.id || "preview",
      low_stock: v.low_stock || 2,
      sku: v.sku || null,
    })),
    media: photos.map((p, i) => ({
      id: p.asset_id,
      asset_id: p.asset_id,
      sort_order: i,
      color: p.color,
      asset: p.asset,
    })),
  } as Product;
  return (
    <>
      <Link href="/admin/produtos" className="text-link">
        <ArrowLeft size={15} />
        Voltar aos produtos
      </Link>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Cada detalhe da sua peça</p>
          <h1>{initial ? "Editar produto" : "Uma nova peça"}</h1>
          <p>Preencha os detalhes e acompanhe o resultado na prévia.</p>
        </div>
        <div className="heading-actions">
          <button
            className="button outline small"
            onClick={() => preview.current?.showModal()}
          >
            <Eye size={16} />
            Prévia
          </button>
          <button className="button small" disabled={busy} onClick={save}>
            <Save size={16} />
            {busy ? "Salvando…" : "Salvar produto"}
          </button>
        </div>
      </div>
      <button
        className="button outline live-preview-toggle"
        onClick={() => setShowLive(!showLive)}
      >
        {showLive ? "Continuar editando" : "Ver prévia ao vivo"}
        <Eye size={17} />
      </button>
      <div className={`product-workspace ${showLive ? "show-live" : ""}`}>
        <div className="product-workspace-form">
          <nav
            className="admin-tabs product-steps"
            aria-label="Edição de produto"
          >
            {steps.map(([key, label], index) => (
              <button
                key={key}
                className={tab === key ? "active" : ""}
                aria-current={tab === key ? "step" : undefined}
                onClick={() => setTab(key)}
              >
                <span>{index + 1}</span>
                {label}
              </button>
            ))}
          </nav>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="notice success" role="status">
              {success}
            </p>
          )}
          {tab === "information" && (
            <div className="editor-layout">
              <section className="admin-card form-grid">
                <h2 className="full-width">Informações essenciais</h2>
                <label className="full-width">
                  Nome da peça
                  <input
                    value={product.name}
                    maxLength={200}
                    onChange={(e) => {
                      set("name", e.target.value);
                      if (!initial) set("slug", slugify(e.target.value));
                    }}
                    placeholder="Ex.: Conjunto Alfaiataria"
                  />
                </label>
                <label>
                  Preço (R$)
                  <input
                    inputMode="decimal"
                    value={product.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="0,00"
                  />
                </label>
                <label>
                  Preço promocional (R$)
                  <input
                    inputMode="decimal"
                    value={product.promo}
                    onChange={(e) => set("promo", e.target.value)}
                    placeholder="Opcional"
                  />
                </label>
                <label className="full-width">
                  Descrição curta
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={product.short_description}
                    onChange={(e) => set("short_description", e.target.value)}
                  />
                </label>
                <label className="full-width">
                  Descrição completa
                  <textarea
                    rows={6}
                    maxLength={20000}
                    value={product.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </label>
                <details className="full-width">
                  <summary>Composição, conservação e medidas</summary>
                  {[
                    ["composition", "Composição"],
                    ["care", "Instruções de conservação"],
                    ["measurements", "Tabela de medidas"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <textarea
                        rows={3}
                        value={String(product.details[key] || "")}
                        onChange={(e) =>
                          set("details", {
                            ...product.details,
                            [key]: e.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                </details>
                <details className="full-width">
                  <summary>Mais opções: endereço, código e buscadores</summary>
                  <label>
                    Endereço da peça
                    <input
                      value={product.slug}
                      onChange={(e) => set("slug", e.target.value)}
                    />
                  </label>
                  <label>
                    Código interno (SKU)
                    <input
                      value={product.sku}
                      onChange={(e) => set("sku", e.target.value)}
                    />
                  </label>
                  <label>
                    Tags (separadas por vírgula)
                    <input
                      value={
                        Array.isArray(product.details.tags)
                          ? product.details.tags.join(", ")
                          : ""
                      }
                      onChange={(e) =>
                        set("details", {
                          ...product.details,
                          tags: e.target.value
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <label>
                    Título para buscadores
                    <input
                      value={String(product.details.seo_title || "")}
                      onChange={(e) =>
                        set("details", {
                          ...product.details,
                          seo_title: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Descrição para buscadores
                    <textarea
                      value={String(product.details.seo_description || "")}
                      onChange={(e) =>
                        set("details", {
                          ...product.details,
                          seo_description: e.target.value,
                        })
                      }
                    />
                  </label>
                </details>
              </section>
            </div>
          )}
          {tab === "publication" && (
            <aside className="admin-card publication-card">
              <h2>Vamos colocar na vitrine?</h2>
              <p className="muted">
                Escolha se a peça já pode aparecer para suas clientes ou salve
                como rascunho para continuar depois.
              </p>
              <label>
                Onde a peça aparece
                <select
                  value={product.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option value="draft">Rascunho — só você vê</option>
                  <option value="published">Publicado na loja</option>
                  <option value="archived">Arquivado</option>
                </select>
              </label>
              <label>
                Categoria
                <select
                  value={product.category_id}
                  onChange={(e) => set("category_id", e.target.value)}
                >
                  <option value="">Sem categoria</option>
                  {taxonomy
                    .filter((t) => t.kind === "category")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Coleção
                <select
                  value={product.collection_id}
                  onChange={(e) => set("collection_id", e.target.value)}
                >
                  <option value="">Sem coleção</option>
                  {taxonomy
                    .filter((t) => t.kind === "collection")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={product.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                />
                Destacar na página inicial
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isIllustrativeProduct(product)}
                  onChange={(event) => {
                    const tags = (
                      Array.isArray(product.details.tags)
                        ? product.details.tags
                        : []
                    ).filter(
                      (tag) =>
                        typeof tag === "string" &&
                        tag.trim().toLowerCase() !== "ilustrativo",
                    );
                    set("details", {
                      ...product.details,
                      tags: event.target.checked
                        ? [...tags, "ilustrativo"]
                        : tags,
                    });
                  }}
                />
                Produto ilustrativo (exemplo sem venda)
              </label>
              <p className="muted small-text">
                Para transformar um exemplo em peça real, substitua as fotos e
                os dados, desmarque “Produto ilustrativo” e ajuste as
                quantidades em Estoque.
              </p>
              <label>
                Ordem de exibição
                <input
                  type="number"
                  value={product.sort_order}
                  onChange={(e) => set("sort_order", Number(e.target.value))}
                />
              </label>
              <p className="muted small-text">
                Para publicar, inclua preço, variações e pelo menos uma imagem
                verificada. O estoque é ajustado separadamente.
              </p>
            </aside>
          )}
          {tab === "variants" && (
            <section className="admin-card">
              <div className="card-heading">
                <h2>Cores e tamanhos</h2>
                <button
                  className="button outline small"
                  onClick={() =>
                    setVariants([
                      ...variants,
                      {
                        color: "",
                        size: "",
                        active: true,
                        stock: 0,
                        low_stock: 2,
                      },
                    ])
                  }
                >
                  <Plus size={15} />
                  Adicionar variação
                </button>
              </div>
              <div className="variant-builder">
                <p>Crie as opções de uma vez</p>
                <span>Separe por vírgulas. Ex.: Areia, Preto e P, M, G.</span>
                <div>
                  <label>
                    Cores da peça
                    <input
                      value={batchColors}
                      onChange={(e) => setBatchColors(e.target.value)}
                      placeholder="Ex.: Areia, Preto"
                      maxLength={1000}
                    />
                  </label>
                  <label>
                    Tamanhos disponíveis
                    <input
                      value={batchSizes}
                      onChange={(e) => setBatchSizes(e.target.value)}
                      placeholder="P, M, G"
                      maxLength={300}
                    />
                  </label>
                </div>
                <button
                  className="button outline small"
                  onClick={generateVariants}
                >
                  <Plus size={16} />
                  Criar combinações
                </button>
                {combinationNotice && <p role="status">{combinationNotice}</p>}
              </div>
              <p className="notice">
                Novas variações começam com estoque zero. Após salvar, ajuste as
                quantidades em Estoque. Variações existentes podem ser
                desativadas para preservar o histórico.
              </p>
              {variants.map((v, i) => (
                <div className="variant-row" key={v.id || i}>
                  <label>
                    Cor
                    <input
                      value={v.color}
                      onChange={(e) =>
                        setVariants((all) =>
                          all.map((r, n) =>
                            n === i ? { ...r, color: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Tamanho
                    <input
                      value={v.size}
                      onChange={(e) =>
                        setVariants((all) =>
                          all.map((r, n) =>
                            n === i ? { ...r, size: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Código (opcional)
                    <input
                      value={v.sku || ""}
                      onChange={(e) =>
                        setVariants((all) =>
                          all.map((r, n) =>
                            n === i ? { ...r, sku: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </label>
                  <span>Estoque: {v.stock || 0}</span>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={v.active}
                      onChange={(e) =>
                        setVariants((all) =>
                          all.map((r, n) =>
                            n === i ? { ...r, active: e.target.checked } : r,
                          ),
                        )
                      }
                    />
                    Ativa
                  </label>
                  {!v.id && (
                    <button
                      className="icon-button"
                      aria-label="Remover variação"
                      onClick={() =>
                        setVariants((all) => all.filter((_, n) => n !== i))
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <Link href="/admin/estoque" className="text-link">
                Gerenciar estoque →
              </Link>
            </section>
          )}
          {tab === "media" && (
            <section className="admin-card">
              <div className="card-heading">
                <div>
                  <h2>O olhar sobre a peça</h2>
                  <p className="muted small-text">
                    A primeira fotografia será a capa. Arraste para reorganizar
                    ou use as setas.
                  </p>
                </div>
                <button
                  className="button outline small"
                  onClick={() => library.current?.showModal()}
                >
                  <Plus size={16} />
                  Selecionar ou enviar
                </button>
              </div>
              <div className="product-editor-media">
                {photos.map((p, i) => (
                  <article
                    draggable
                    onDragStart={() => {
                      dragged.current = i;
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => move(dragged.current, i)}
                    key={p.asset_id}
                  >
                    <div className="editor-photo">
                      {p.asset.kind === "image" ? (
                        <img src={p.asset.url} alt={p.asset.alt} />
                      ) : (
                        <video
                          src={p.asset.url}
                          poster={p.asset.poster_url || undefined}
                          muted
                          preload="metadata"
                        />
                      )}
                      {i === 0 && <span>Principal</span>}
                      <GripVertical size={17} />
                    </div>
                    <label>
                      Cor associada
                      <select
                        value={p.color || ""}
                        onChange={(e) =>
                          setPhotos((all) =>
                            all.map((r, n) =>
                              n === i
                                ? { ...r, color: e.target.value || null }
                                : r,
                            ),
                          )
                        }
                      >
                        <option value="">Todas as cores</option>
                        {[...new Set(variants.map((v) => v.color))]
                          .filter(Boolean)
                          .map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                      </select>
                    </label>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        aria-label="Mover foto antes"
                        disabled={i === 0}
                        onClick={() => move(i, i - 1)}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Mover foto depois"
                        disabled={i === photos.length - 1}
                        onClick={() => move(i, i + 1)}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Remover foto da peça"
                        onClick={() =>
                          setPhotos((all) => all.filter((_, n) => n !== i))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!photos.length && (
                <p className="table-empty">
                  Selecione fotografias da biblioteca ou envie arquivos novos.
                </p>
              )}
            </section>
          )}
          {tab === "performance" && initial && (
            <Dashboard performance productIds={initial.id} />
          )}
          {step >= 0 && (
            <div className="editor-step-footer">
              <span>Etapa {step + 1} de 4</span>
              {step > 0 && (
                <button
                  className="button outline small"
                  onClick={() => setTab(steps[step - 1][0])}
                >
                  Voltar
                </button>
              )}
              {step < 3 ? (
                <button
                  className="button small"
                  onClick={() => setTab(steps[step + 1][0])}
                >
                  Continuar <ArrowRight size={16} />
                </button>
              ) : (
                <button className="button small" onClick={save} disabled={busy}>
                  {busy ? "Salvando…" : "Salvar produto"}
                </button>
              )}
            </div>
          )}
          {initial && (
            <button
              className="text-link product-performance-link"
              onClick={() =>
                setTab(tab === "performance" ? "information" : "performance")
              }
            >
              {tab === "performance"
                ? "Voltar à edição"
                : "Consultar desempenho desta peça"}
            </button>
          )}
        </div>
        <aside
          className="live-product-preview"
          aria-label="Prévia da loja"
          role="region"
        >
          <div className="live-preview-heading">
            <span className="preview-status-dot" />
            <span>PRÉVIA AO VIVO</span>
            <span>Vitrine</span>
          </div>
          <div className="preview-store-brand">
            ZION <span>MAISON</span>
          </div>
          <div className="preview-product-content">
            <ProductCard
              product={{
                ...previewProduct,
                name: previewProduct.name || "O nome da sua peça",
              }}
              preview
            />
          </div>
          <p className="live-preview-note">
            Assim sua peça aparece na coleção. As alterações só ficam públicas
            depois de salvar como publicado.
          </p>
          <div className="product-readiness">
            <p>Antes de publicar</p>
            {[
              {
                label: "Nome e preço",
                done:
                  !!product.name.trim() &&
                  !!product.price.trim() &&
                  Number(product.price.replace(",", ".")) >= 0,
                tab: "information",
              },
              {
                label: "Fotografia da peça",
                done: photos.some((p) => p.asset.kind === "image"),
                tab: "media",
              },
              {
                label: "Cores e tamanhos",
                done: variants.some(
                  (v) => v.active && v.color.trim() && v.size.trim(),
                ),
                tab: "variants",
              },
            ].map((item) => (
              <button
                key={item.tab}
                onClick={() => {
                  setTab(item.tab);
                  setShowLive(false);
                }}
              >
                {item.done ? <Check size={16} /> : <Circle size={14} />}
                <span>{item.label}</span>
                <span>{item.done ? "Pronto" : "Adicionar"}</span>
              </button>
            ))}
            <p>
              Após salvar, ajuste as quantidades em{" "}
              <Link href="/admin/estoque">Estoque ↗</Link>. Peças sem estoque
              aparecem como esgotadas.
            </p>
          </div>
        </aside>
      </div>
      <dialog className="library-dialog" ref={library}>
        <div className="drawer-head">
          <h2>Escolha suas mídias</h2>
          <button
            className="icon-button"
            aria-label="Fechar biblioteca"
            onClick={() => library.current?.close()}
          >
            <X size={17} />
          </button>
        </div>
        <MediaLibrary embedded onSelect={choose} />
        <button className="button" onClick={() => library.current?.close()}>
          Concluir seleção ({photos.length})
        </button>
      </dialog>
      <dialog className="product-preview-dialog" ref={preview}>
        <div className="drawer-head">
          <p className="notice">
            Prévia da página do produto. O estoque é o último carregado. Compras
            e favoritos estão desativados nesta visualização.
          </p>
          <button
            className="button outline small"
            onClick={() => preview.current?.close()}
          >
            Fechar prévia
          </button>
        </div>
        <ProductDetail product={previewProduct} preview />
      </dialog>
    </>
  );
}
