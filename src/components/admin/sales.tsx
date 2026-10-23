"use client";
import { PageControls } from "./page-controls";
import { useState } from "react";
import { useResource, adminRequest, errorMessage } from "./api";
import { money, type Variant, type Snapshot } from "@/lib/domain";
type Stock = Variant & { product: { name: string } };
type Sale = {
  id: string;
  items: Snapshot[];
  total_cents: number;
  note: string;
  created_at: string;
  reversed_at: string | null;
};
type Intent = {
  id: string;
  customer_name: string;
  items: Snapshot[];
  total_cents: number;
  created_at: string;
};
export function Sales() {
  const [stockPage, setStockPage] = useState(1),
    [salesPage, setSalesPage] = useState(1),
    [intentsPage, setIntentsPage] = useState(1);
  const [chosenStock, setChosenStock] = useState<Stock[]>([]);
  const {
    rows: stock,
    count: stockCount,
    reload: reloadStock,
  } = useResource<Stock>("stock", `page=${stockPage}`);
  const {
    rows: sales,
    count: salesCount,
    error,
    reload,
  } = useResource<Sale>("sales", `page=${salesPage}`);
  const { rows: intents, count: intentsCount } = useResource<Intent>(
    "intents",
    `page=${intentsPage}`,
  );
  const stockOptions = [
    ...stock,
    ...chosenStock.filter((v) => !stock.some((s) => s.id === v.id)),
  ];
  const [items, setItems] = useState<
    { variant_id: string; quantity: number }[]
  >([{ variant_id: "", quantity: 1 }]);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Do interesse ao encontro</p>
          <h1>Interesses e vendas</h1>
          <p>Separe oportunidades de compras realmente confirmadas.</p>
        </div>
      </div>
      <section className="admin-card">
        <h2>Registrar venda confirmada</h2>
        <p className="notice">
          Esta operação baixa o estoque de todas as peças em uma transação.
          Confirme o fechamento antes de registrar.
        </p>
        <PageControls
          page={stockPage}
          count={stockCount}
          change={setStockPage}
          label="Variações"
        />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              !confirm(
                "Confirmar esta venda e baixar o estoque das peças selecionadas?",
              )
            )
              return;
            setBusy(true);
            setMessage("");
            try {
              const d = new FormData(e.currentTarget);
              await adminRequest("sales", {
                key,
                items,
                note: String(d.get("note") || ""),
              });
              setMessage(
                "Venda confirmada, estoque atualizado e histórico registrado.",
              );
              setKey(crypto.randomUUID());
              setItems([{ variant_id: "", quantity: 1 }]);
              reload();
              reloadStock();
            } catch (e) {
              setMessage(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {items.map((item, i) => (
            <div className="sale-item-row" key={i}>
              <label>
                Peça e variação
                <select
                  value={item.variant_id}
                  required
                  onChange={(e) => {
                    const selected = stockOptions.find(
                      (v) => v.id === e.target.value,
                    );
                    if (selected)
                      setChosenStock((all) => [
                        ...all.filter((v) => v.id !== selected.id),
                        selected,
                      ]);
                    setItems((all) =>
                      all.map((v, n) =>
                        n === i ? { ...v, variant_id: e.target.value } : v,
                      ),
                    );
                  }}
                >
                  <option value="">Selecionar peça</option>
                  {stockOptions.map((v) => (
                    <option key={v.id} value={v.id} disabled={v.stock === 0}>
                      {v.product?.name} · {v.color} / {v.size} · {v.stock}{" "}
                      disponíveis
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantidade
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={item.quantity}
                  onChange={(e) =>
                    setItems((all) =>
                      all.map((v, n) =>
                        n === i
                          ? { ...v, quantity: Number(e.target.value) }
                          : v,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="text-link"
                disabled={items.length === 1}
                onClick={() => setItems((all) => all.filter((_, n) => n !== i))}
              >
                Remover
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-link"
            onClick={() =>
              setItems([...items, { variant_id: "", quantity: 1 }])
            }
          >
            + Incluir outra peça
          </button>
          <label style={{ margin: "20px 0" }}>
            Observação administrativa
            <textarea
              name="note"
              maxLength={2000}
              rows={2}
              placeholder="Referência do atendimento, sem dados sensíveis desnecessários"
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Registrando…" : "Confirmar venda e atualizar estoque"}
          </button>
        </form>
      </section>
      {(error || message) && (
        <p className="notice" role="status">
          {error || message}
        </p>
      )}
      <section className="admin-card">
        <h2>Vendas confirmadas</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Peças</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>
                    {new Date(s.created_at).toLocaleString("pt-BR", {
                      timeZone: "America/Belem",
                    })}
                  </td>
                  <td>
                    {s.items
                      .map(
                        (i) =>
                          `${i.quantity}× ${i.name} (${i.color}/${i.size})`,
                      )
                      .join("; ")}
                  </td>
                  <td>{money(s.total_cents)}</td>
                  <td>{s.reversed_at ? "Estornada" : "Confirmada"}</td>
                  <td>
                    {!s.reversed_at && (
                      <button
                        className="text-link"
                        onClick={async () => {
                          if (
                            !confirm(
                              "Estornar a venda e devolver as unidades ao estoque?",
                            )
                          )
                            return;
                          try {
                            await adminRequest("sales", {
                              action: "reverse",
                              id: s.id,
                            });
                            reload();
                            reloadStock();
                          } catch (e) {
                            setMessage(errorMessage(e));
                          }
                        }}
                      >
                        Estornar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sales.length && (
            <p className="table-empty">Nenhuma venda confirmada registrada.</p>
          )}
        </div>
      </section>
      <PageControls
        page={salesPage}
        count={salesCount}
        change={setSalesPage}
        label="Vendas"
      />
      <section className="admin-card">
        <h2>Intenções de atendimento</h2>
        <p className="muted small-text">
          Seleções preparadas no site. Envio de mensagem e fechamento não
          confirmados.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Nome informado</th>
                <th>Seleção</th>
                <th>Total estimado</th>
              </tr>
            </thead>
            <tbody>
              {intents.map((i) => (
                <tr key={i.id}>
                  <td>
                    {new Date(i.created_at).toLocaleString("pt-BR", {
                      timeZone: "America/Belem",
                    })}
                  </td>
                  <td>{i.customer_name}</td>
                  <td>
                    {i.items.map((p) => `${p.quantity}× ${p.name}`).join("; ")}
                  </td>
                  <td>{money(i.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!intents.length && (
            <p className="table-empty">Nenhuma intenção registrada.</p>
          )}
        </div>
      </section>
      <PageControls
        page={intentsPage}
        count={intentsCount}
        change={setIntentsPage}
        label="Interesses"
      />
    </>
  );
}
