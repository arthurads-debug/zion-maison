"use client";
import { useState } from "react";
import Link from "next/link";
import { useSelection } from "../selection-provider";
import { money, isIllustrativeProduct, type Product } from "@/lib/domain";
export function LookSelection({ products }: { products: Product[] }) {
  const selection = useSelection();
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);
  return (
    <div className="look-selector">
      <p className="eyebrow">Cada detalhe, sua escolha</p>
      <h2>Componha seu look</h2>
      {products.map((p) => (
        <label key={p.id} style={{ marginTop: 20 }}>
          {p.name} · {money(p.promo_cents ?? p.price_cents)}
          <select
            value={chosen[p.id] || ""}
            onChange={(e) => {
              setChosen({ ...chosen, [p.id]: e.target.value });
              setAdded(false);
            }}
          >
            <option value="">Não incluir esta peça</option>
            {p.variants
              .filter((v) => v.active)
              .map((v) => (
                <option
                  value={v.id}
                  key={v.id}
                  disabled={isIllustrativeProduct(p) || v.stock === 0}
                >
                  {v.color} / {v.size}
                  {isIllustrativeProduct(p)
                    ? " — Ilustrativo"
                    : v.stock === 0
                      ? " — Esgotado"
                      : ""}
                </option>
              ))}
          </select>
        </label>
      ))}
      <button
        className="button full"
        style={{ marginTop: 25 }}
        disabled={!Object.values(chosen).some(Boolean)}
        onClick={() => {
          for (const variant of Object.values(chosen).filter(Boolean))
            selection.add(variant, 1);
          setAdded(true);
          window.dispatchEvent(
            new CustomEvent("zion-event", {
              detail: { type: "shop_the_look_click", data: {} },
            }),
          );
        }}
      >
        {added ? "Peças adicionadas" : "Adicionar peças selecionadas"} +
      </button>
      {added && (
        <Link href="/minha-selecao" className="text-link">
          Ver minha seleção →
        </Link>
      )}
      <p className="muted small-text" style={{ marginTop: 15 }}>
        Escolha o tamanho e a cor de cada peça. O estoque será conferido
        novamente antes do atendimento.
      </p>
    </div>
  );
}
