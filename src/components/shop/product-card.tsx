"use client";
import { ResponsiveImage } from "@/components/responsive-image";

import Link from "next/link";
import { useSelection } from "@/components/selection-provider";
import { firstImage, money, type Product } from "@/lib/domain";
import { Heart, ArrowUpRight } from "./icons";
export function ProductCard({ product }: { product: Product }) {
  const { favorites, toggleFavorite } = useSelection();
  const image = firstImage(product);
  const colors = [
    ...new Set(
      product.variants
        .filter((v) => v.active && v.stock > 0)
        .map((v) => v.color),
    ),
  ];
  return (
    <article className="product-card">
      <div className="product-picture">
        <Link
          href={`/produto/${product.slug}`}
          aria-label={`Ver ${product.name}`}
        >
          {image?.url ? (
            <ResponsiveImage
              src={image.url}
              alt={image.alt || product.name}
              loading="lazy"
            />
          ) : (
            <div className="media-empty">
              <span>Z</span>
              <small>Imagem em preparação</small>
            </div>
          )}
        </Link>
        <button
          className={`favorite-button ${favorites.includes(product.id) ? "selected" : ""}`}
          aria-label={`${favorites.includes(product.id) ? "Remover dos" : "Salvar nos"} favoritos: ${product.name}`}
          aria-pressed={favorites.includes(product.id)}
          onClick={() => toggleFavorite(product.id)}
        >
          <Heart
            size={20}
            fill={favorites.includes(product.id) ? "currentColor" : "none"}
          />
        </button>
        {product.promo_cents !== null && (
          <span className="product-badge">Seleção especial</span>
        )}
      </div>
      <div className="product-caption">
        <Link href={`/produto/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <ArrowUpRight size={16} />
      </div>
      <p className="product-price">
        {product.promo_cents !== null && (
          <del>{money(product.price_cents)}</del>
        )}{" "}
        {money(product.promo_cents ?? product.price_cents)}
      </p>
      <p className="product-colors">
        {colors.length ? colors.join(" · ") : "Esgotado"}
      </p>
    </article>
  );
}
