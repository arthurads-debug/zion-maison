"use client";
import { ResponsiveImage } from "@/components/responsive-image";

import { useState, useRef } from "react";
import Link from "next/link";
import { useSelection } from "@/components/selection-provider";
import { money, isIllustrativeProduct, type Product } from "@/lib/domain";
import { Heart, ArrowRight, Plus, Minus, X, ZoomIn } from "./icons";
import { EditorialVideo } from "./editorial-video";
export function ProductDetail({
  product,
  preview = false,
}: {
  product: Product;
  preview?: boolean;
}) {
  const selection = useSelection();
  const illustrative = isIllustrativeProduct(product);
  const colors = [
    ...new Set(product.variants.filter((v) => v.active).map((v) => v.color)),
  ];
  const [selectedColor, setColor] = useState(colors[0] || "");
  const color = colors.includes(selectedColor)
    ? selectedColor
    : colors[0] || "";
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const zoom = useRef<HTMLDialogElement>(null);
  const [zoomSrc, setZoomSrc] = useState("");
  const variants = product.variants.filter(
    (v) => v.active && v.color === color,
  );
  const variant = variants.find((v) => v.size === size);
  const media = product.media
    .filter((m) => !m.color || m.color === color)
    .sort((a, b) => a.sort_order - b.sort_order);
  const favorite = selection.favorites.includes(product.id);
  function add() {
    if (preview || illustrative || !variant || !variant.stock) return;
    const existing =
      selection.lines.find((l) => l.variant_id === variant.id)?.quantity || 0;
    if (existing + quantity > variant.stock) {
      setAdded(false);
      return;
    }
    selection.add(variant.id, quantity);
    setAdded(true);
    window.dispatchEvent(
      new CustomEvent("zion-event", {
        detail: {
          type: "add_to_cart",
          product_id: product.id,
          variant_id: variant.id,
          data: { quantity },
        },
      }),
    );
  }
  return (
    <div className="product-detail">
      <div className="product-gallery">
        {media.length ? (
          media.map((m) =>
            m.asset.kind === "image" && m.asset.url ? (
              <button
                className="gallery-image"
                key={m.id}
                aria-label={`Ampliar ${m.asset.alt || product.name}`}
                onClick={() => {
                  setZoomSrc(m.asset.url!);
                  zoom.current?.showModal();
                }}
              >
                <ResponsiveImage
                  src={m.asset.url}
                  alt={m.asset.alt || product.name}
                />
                <ZoomIn size={20} />
              </button>
            ) : m.asset.url ? (
              <EditorialVideo
                key={m.id}
                src={m.asset.url}
                poster={m.asset.poster_url || ""}
                title={product.name}
                href="#comprar"
              />
            ) : null,
          )
        ) : (
          <div className="media-empty product-placeholder">
            <span>Z</span>
            <small>Fotografias em preparação</small>
          </div>
        )}
      </div>
      <div className="product-information" id="comprar">
        <p className="eyebrow">ZION MAISON / {product.sku || "COLEÇÃO"}</p>
        <h1>{product.name}</h1>
        <p className="detail-price">
          {product.promo_cents !== null && (
            <del>{money(product.price_cents)}</del>
          )}{" "}
          {money(product.promo_cents ?? product.price_cents)}
        </p>
        <p className="muted">{product.short_description}</p>
        <fieldset>
          <legend>
            Cor <strong>{color}</strong>
          </legend>
          <div className="choice-options">
            {colors.map((c) => (
              <button
                key={c}
                className={color === c ? "active" : ""}
                aria-pressed={color === c}
                onClick={() => {
                  setColor(c);
                  setSize("");
                  setAdded(false);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>
            Tamanho <a href="#medidas">Guia de medidas ↗</a>
          </legend>
          <div className="choice-options">
            {variants.map((v) => (
              <button
                key={v.id}
                disabled={!illustrative && v.stock === 0}
                className={size === v.size ? "active" : ""}
                aria-pressed={size === v.size}
                onClick={() => {
                  setSize(v.size);
                  setQuantity(1);
                  setAdded(false);
                  if (!preview && !illustrative)
                    window.dispatchEvent(
                      new CustomEvent("zion-event", {
                        detail: {
                          type: "select_variant",
                          product_id: product.id,
                          variant_id: v.id,
                          data: { color: v.color, size: v.size },
                        },
                      }),
                    );
                }}
              >
                {v.size}
                {!illustrative && v.stock === 0 && (
                  <span className="sr-only"> Esgotado</span>
                )}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="stock-description">
          {illustrative
            ? "Modelo ilustrativo · sem venda ou reserva"
            : variant
              ? variant.stock > 0
                ? "Disponível para consulta"
                : "Esgotado nesta variação"
              : "Selecione cor e tamanho para continuar."}
        </p>
        <div className="quantity">
          <button
            aria-label="Diminuir quantidade"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Minus size={16} />
          </button>
          <span>{quantity}</span>
          <button
            aria-label="Aumentar quantidade"
            onClick={() =>
              setQuantity(Math.min(variant?.stock || 1, quantity + 1))
            }
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          className="button full"
          disabled={
            preview || illustrative || !variant || variant.stock < quantity
          }
          onClick={add}
        >
          {illustrative
            ? "Peça ilustrativa"
            : added
              ? "Adicionado à sua seleção"
              : "Adicionar à minha seleção"}
          <Plus size={17} />
        </button>
        {illustrative && (
          <p className="illustrative-product-note">
            Imagem e valor de exemplo. Esta peça pode ser personalizada no
            painel e não está disponível para compra.
          </p>
        )}
        {added ? (
          <Link className="button outline full" href="/minha-selecao">
            Consultar pelo WhatsApp <ArrowRight size={16} />
          </Link>
        ) : (
          <p className="muted small-text">
            {illustrative
              ? "Explore cores e tamanhos para conhecer a apresentação da loja."
              : "Adicione sua escolha para preparar a consulta pelo WhatsApp."}
          </p>
        )}
        <button
          className="text-link favorite-detail"
          disabled={preview}
          onClick={() => {
            if (!preview) selection.toggleFavorite(product.id);
          }}
          aria-pressed={favorite}
        >
          <Heart size={17} fill={favorite ? "currentColor" : "none"} />
          {favorite ? "Salvo nos favoritos" : "Salvar nos favoritos"}
        </button>
        <div className="product-accordions">
          <details open>
            <summary>Sobre a peça</summary>
            <p>{product.description || "Detalhes em preparação."}</p>
          </details>
          {[
            ["composition", "Composição"],
            ["care", "Como cuidar"],
            ["measurements", "Guia de medidas"],
          ].map(([key, label]) => (
            <details
              key={key}
              id={key === "measurements" ? "medidas" : undefined}
            >
              <summary>{label}</summary>
              <p>
                {String(
                  product.details[key] ||
                    "Consulte nossa equipe para mais informações.",
                )}
              </p>
            </details>
          ))}
          <details>
            <summary>Entrega e atendimento</summary>
            <p>
              As condições de entrega e pagamento são confirmadas diretamente
              com a Zion Maison.
            </p>
            <Link href="/entregas" className="text-link">
              Informações de entrega
            </Link>
          </details>
        </div>
      </div>
      <dialog ref={zoom} className="zoom-dialog">
        <button
          className="icon-button"
          aria-label="Fechar ampliação"
          onClick={() => zoom.current?.close()}
        >
          <X />
        </button>
        {zoomSrc && <ResponsiveImage src={zoomSrc} alt={product.name} />}
      </dialog>
    </div>
  );
}
