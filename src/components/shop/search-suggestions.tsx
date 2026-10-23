"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { type Product, money } from "@/lib/domain";
export function SearchSuggestions({ close }: { close: () => void }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState("");
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState("Buscando…");
      fetch(`/api/catalog?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then(async (r) => {
          if (!r.ok) throw Error();
          const data = await r.json();
          setProducts(data.products.slice(0, 5));
          setState(data.products.length ? "" : "Nenhuma peça encontrada.");
        })
        .catch((e) => {
          if (e.name !== "AbortError")
            setState("Não foi possível buscar agora. Tente no catálogo.");
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  return (
    <>
      <form action="/catalogo" className="search-form" onSubmit={close}>
        <input
          name="q"
          aria-label="Pesquisar produtos"
          placeholder="O que você procura?"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setProducts([]);
            setState("");
          }}
        />
        <button className="text-link">Buscar →</button>
      </form>
      <div aria-live="polite">
        {query.trim().length >= 2 && (
          <>
            <p className="muted">{state}</p>
            {products.map((p) => (
              <p key={p.id}>
                <Link href={`/produto/${p.slug}`} onClick={close}>
                  {p.name} — {money(p.promo_cents ?? p.price_cents)}
                </Link>
              </p>
            ))}
          </>
        )}
      </div>
    </>
  );
}
