"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSelection } from "../selection-provider";
import type { Product } from "@/lib/domain";
import { ProductCard } from "./product-card";
export function Favorites() {
  const { favorites } = useSelection();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const ids = favorites.join(",");
  useEffect(() => {
    if (!ids) return;
    const c = new AbortController();
    fetch(`/api/catalog?ids=${encodeURIComponent(ids)}`, { signal: c.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        const pages = Math.ceil(d.count / 24);
        const remaining = await Promise.all(
          Array.from({ length: Math.max(0, pages - 1) }, async (_, i) => {
            const response = await fetch(
              `/api/catalog?ids=${encodeURIComponent(ids)}&page=${i + 2}`,
              { signal: c.signal },
            );
            if (!response.ok)
              throw new Error("Não foi possível carregar todos os favoritos.");
            return (await response.json()).products as Product[];
          }),
        );
        setProducts([...d.products, ...remaining.flat()]);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [ids]);
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {favorites.length > 0 ? (
        <div className="product-grid">
          {products
            .filter((p) => favorites.includes(p.id))
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Suas peças favoritas, reunidas aqui.</h2>
          <p>Toque no coração de uma peça para guardar sua inspiração.</p>
          <Link href="/catalogo" className="button">
            Explorar coleção →
          </Link>
        </div>
      )}
    </>
  );
}
