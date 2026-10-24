"use client";
import { ResponsiveImage } from "@/components/responsive-image";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSelection } from "@/components/selection-provider";
import { firstImage, money, type Product } from "@/lib/domain";
import { Heart, ArrowUpRight } from "./icons";
export function ProductCard({
  product,
  preview = false,
}: {
  product: Product;
  preview?: boolean;
}) {
  const { favorites, toggleFavorite } = useSelection();
  const image = firstImage(product);
  const alternate =
    !preview &&
    product.media
      .filter(
        (m) =>
          m.asset.kind === "image" && m.asset.url && m.asset.url !== image?.url,
      )
      .sort((a, b) => a.sort_order - b.sort_order)[0]?.asset;
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
        <PresentationLink
          preview={preview}
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
          {alternate && (
            <ResponsiveImage
              className="product-alternate"
              src={alternate.url!}
              alt=""
              loading="lazy"
            />
          )}
        </PresentationLink>
        <button
          className={`favorite-button ${!preview && favorites.includes(product.id) ? "selected" : ""}`}
          aria-label={`${!preview && favorites.includes(product.id) ? "Remover dos" : "Salvar nos"} favoritos: ${product.name}`}
          aria-pressed={!preview && favorites.includes(product.id)}
          disabled={preview}
          onClick={() => {
            if (!preview) toggleFavorite(product.id);
          }}
        >
          <Heart
            size={20}
            fill={
              !preview && favorites.includes(product.id)
                ? "currentColor"
                : "none"
            }
          />
        </button>
        {product.promo_cents !== null && (
          <span className="product-badge">Seleção especial</span>
        )}
      </div>
      <div className="product-caption">
        <PresentationLink preview={preview} href={`/produto/${product.slug}`}>
          <h3>{product.name}</h3>
        </PresentationLink>
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

function PresentationLink({
  preview,
  href,
  children,
  ...props
}: {
  preview: boolean;
  href: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return preview ? (
    <div className="preview-card-link" {...props}>
      {children}
    </div>
  ) : (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}
