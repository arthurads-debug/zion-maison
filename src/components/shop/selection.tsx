"use client";
import { ResponsiveImage } from "@/components/responsive-image";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSelection } from "@/components/selection-provider";
import { firstImage, money, type Product, type Snapshot } from "@/lib/domain";
import { ArrowRight, Minus, Plus, X, ShoppingBag } from "./icons";
export function Cart({ compact = false }: { compact?: boolean }) {
  const selection = useSelection();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(false);
  const [prepared, setPrepared] = useState<{
    id: string;
    url: string;
    message: string;
    items: Snapshot[];
    total_cents: number;
  } | null>(null);
  function trackOpen() {
    window.dispatchEvent(
      new CustomEvent("zion-event", {
        detail: {
          type: "whatsapp_click",
          data: { intent: true, intent_id: prepared?.id },
        },
      }),
    );
  }
  const ids = selection.lines.map((l) => l.variant_id).join(",");
  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    fetch(`/api/catalog?variants=${encodeURIComponent(ids)}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setProducts(d.products);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [ids]);
  const resolved = selection.lines.map((line) => {
    const product = products.find((p) =>
      p.variants.some((v) => v.id === line.variant_id),
    );
    return {
      line,
      product,
      variant: product?.variants.find((v) => v.id === line.variant_id),
    };
  });
  const total = resolved.reduce(
    (s, { line, product }) =>
      s +
      (product
        ? (product.promo_cents ?? product.price_cents) * line.quantity
        : 0),
    0,
  );
  async function prepare() {
    setError("");
    setBusy(true);
    setPrepared(null);
    try {
      const response = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: crypto.randomUUID(),
          name: name || selection.name,
          items: selection.lines,
          source: location.pathname,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (remember) selection.remember(name || selection.name);
      else selection.remember("");
      setPrepared(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível preparar sua mensagem.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!selection.lines.length)
    return (
      <div className="empty-state">
        <ShoppingBag size={30} strokeWidth={1} />
        <h2>Sua seleção começa com uma descoberta.</h2>
        <p>
          Encontre peças que fazem sentido para você e reúna suas escolhas aqui.
        </p>
        <Link href="/catalogo" className="button">
          Explorar coleção <ArrowRight size={16} />
        </Link>
      </div>
    );
  return (
    <div className={`selection-layout ${compact ? "compact" : ""}`}>
      <div className="selection-items">
        {resolved.map(({ line, product, variant }) => {
          const image = product && firstImage(product);
          return (
            <article key={line.variant_id} className="selection-item">
              {image?.url ? (
                <ResponsiveImage src={image.url} alt={product!.name} />
              ) : (
                <div className="selection-image-empty">Z</div>
              )}
              <div>
                <Link href={product ? `/produto/${product.slug}` : "/catalogo"}>
                  <h3>{product?.name || "Verificando peça…"}</h3>
                </Link>
                <p>
                  {variant
                    ? `${variant.color} / ${variant.size}`
                    : "Disponibilidade a confirmar"}
                </p>
                <strong>
                  {product
                    ? money(product.promo_cents ?? product.price_cents)
                    : "—"}
                </strong>
                {variant && line.quantity > variant.stock && (
                  <p className="error-text">
                    Estoque disponível: {variant.stock}. Ajuste a quantidade.
                  </p>
                )}
                <div className="quantity">
                  <button
                    aria-label="Diminuir quantidade"
                    onClick={() => {
                      selection.quantity(line.variant_id, line.quantity - 1);
                      setPrepared(null);
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    aria-label={`Quantidade de ${product?.name || "peça"}`}
                    type="number"
                    min="1"
                    max={variant?.stock || 99}
                    value={line.quantity}
                    onChange={(e) => {
                      selection.quantity(
                        line.variant_id,
                        Number(e.target.value),
                      );
                      setPrepared(null);
                    }}
                  />
                  <button
                    aria-label="Aumentar quantidade"
                    onClick={() => {
                      selection.quantity(line.variant_id, line.quantity + 1);
                      setPrepared(null);
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <button
                className="icon-button"
                aria-label={`Remover ${product?.name || "peça"}`}
                onClick={() => {
                  selection.remove(line.variant_id);
                  setPrepared(null);
                }}
              >
                <X size={17} />
              </button>
            </article>
          );
        })}
      </div>
      <aside className="selection-summary">
        <p className="eyebrow">Um passo mais perto</p>
        <h2>
          Suas escolhas.
          <br />
          Nosso cuidado.
        </h2>
        <div className="total-row">
          <span>Total estimado</span>
          <strong>{money(total)}</strong>
        </div>
        <p className="muted">
          Disponibilidade, entrega e pagamento serão confirmados no atendimento.
          Sua seleção não reserva estoque.
        </p>
        <label>
          Como podemos chamar você?
          <input
            maxLength={120}
            value={name || selection.name}
            onChange={(e) => {
              setName(e.target.value);
              if (selection.name) selection.remember("");
              setPrepared(null);
            }}
            placeholder="Seu nome"
            autoComplete="given-name"
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Lembrar meu nome neste dispositivo
        </label>
        {selection.name && (
          <button
            className="text-link"
            onClick={() => {
              selection.remember("");
              setName("");
            }}
          >
            Esquecer meu nome
          </button>
        )}
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <button
          className="button full"
          disabled={busy || !(name || selection.name).trim()}
          onClick={prepare}
        >
          {busy ? "Conferindo sua seleção…" : "Preparar atendimento"}
          <ArrowRight size={16} />
        </button>
        {prepared && (
          <div className="prepared-message">
            <p role="status">
              Seleção conferida. Total atual: {money(prepared.total_cents)}.
            </p>
            {prepared.url.length < 7000 ? (
              <a
                className="button full"
                href={prepared.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackOpen}
              >
                Continuar no WhatsApp <ArrowRight size={16} />
              </a>
            ) : (
              <>
                <p>
                  Sua mensagem é longa. Copie o texto completo e envie no
                  atendimento.
                </p>
                <textarea readOnly value={prepared.message} />
                <button
                  className="button"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(prepared.message)
                      .catch(() =>
                        setError("Selecione e copie o texto manualmente."),
                      )
                  }
                >
                  Copiar mensagem
                </button>
                <a
                  className="text-link"
                  href={prepared.url.split("?")[0]}
                  onClick={trackOpen}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir WhatsApp
                </a>
              </>
            )}
            <details>
              <summary>Conferir mensagem</summary>
              <pre>{prepared.message}</pre>
            </details>
            <small>
              A abertura do WhatsApp não confirma o envio da mensagem.
            </small>
          </div>
        )}
      </aside>
    </div>
  );
}
