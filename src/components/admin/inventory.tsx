"use client";
import { useState } from "react";
import Link from "next/link";
import { useResource, adminRequest, errorMessage } from "./api";
import type { Variant } from "@/lib/domain";
type Stock = Variant & { product: { name: string; slug: string } };
export function Inventory() {
  const [page, setPage] = useState(1);
  const { rows, count, error, reload } = useResource<Stock>(
    "stock",
    `page=${page}`,
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Disponibilidade com cuidado</p>
          <h1>Estoque</h1>
          <p>Quantidades por cor e tamanho, com histórico de cada ajuste.</p>
        </div>
        <Link href="/admin/vendas" className="button small">
          Registrar venda confirmada →
        </Link>
      </div>
      {(error || message) && (
        <p className="notice" role="status">
          {error || message}
        </p>
      )}
      <p className="notice">
        Cliques no WhatsApp não baixam estoque. Registre a venda somente após
        confirmar o fechamento.
      </p>
      <section className="admin-card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Peça</th>
                <th>Cor / tamanho</th>
                <th>Disponível</th>
                <th>Alerta mínimo</th>
                <th>Ajustar estoque</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={`${v.id}-${v.version}`}>
                  <td>
                    {v.product?.name || "Produto"}
                    <small className="table-subtitle">
                      {v.sku || "Sem SKU"}
                    </small>
                  </td>
                  <td>
                    {v.color} / {v.size}
                  </td>
                  <td>
                    <span
                      className={`status-pill ${v.stock === 0 ? "archived" : v.stock <= v.low_stock ? "draft" : "published"}`}
                    >
                      {v.stock === 0 ? "Esgotado" : `${v.stock} unidades`}
                    </span>
                  </td>
                  <td>{v.low_stock}</td>
                  <td>
                    <form
                      className="stock-adjustment"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const data = new FormData(e.currentTarget);
                        setBusy(v.id);
                        setMessage("");
                        try {
                          await adminRequest("stock", {
                            variant_id: v.id,
                            quantity: Number(data.get("quantity")),
                            low_stock: Number(data.get("low_stock")),
                            version: v.version,
                            reason: data.get("reason"),
                          });
                          setMessage(
                            "Estoque atualizado e alteração registrada.",
                          );
                          reload();
                        } catch (e) {
                          setMessage(errorMessage(e));
                        } finally {
                          setBusy("");
                        }
                      }}
                    >
                      <label>
                        Quantidade
                        <input
                          name="quantity"
                          type="number"
                          min="0"
                          max="100000"
                          defaultValue={v.stock}
                          required
                        />
                      </label>
                      <label>
                        Mínimo
                        <input
                          name="low_stock"
                          type="number"
                          min="0"
                          defaultValue={v.low_stock}
                          required
                        />
                      </label>
                      <label>
                        Motivo
                        <input
                          name="reason"
                          placeholder="Ex.: reposição"
                          required
                          maxLength={500}
                        />
                      </label>
                      <button
                        className="button outline small"
                        disabled={busy === v.id}
                      >
                        {busy === v.id ? "Salvando…" : "Salvar"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="table-empty">
            Cadastre produtos e variações para controlar o estoque.
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
    </>
  );
}
