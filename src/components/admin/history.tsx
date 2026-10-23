"use client";
import { useState } from "react";
import { useResource } from "./api";
type Audit = {
  id: number;
  actor_id: string | null;
  entity: string;
  entity_id: string | null;
  operation: string;
  fields: string[];
  created_at: string;
};
export function History() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const [actor, setActor] = useState("");
  const { rows, count, error } = useResource<Audit>(
    "history",
    new URLSearchParams({ page: String(page), entity, actor }).toString(),
  );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Transparência em cada ação</p>
          <h1>Histórico de atividades</h1>
          <p>Operações registradas pelo banco, sem exposição de segredos.</p>
        </div>
      </div>
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          setEntity(String(d.get("entity") || ""));
          setActor(String(d.get("actor") || ""));
          setPage(1);
        }}
      >
        <label>
          Área
          <select name="entity">
            <option value="">Todas</option>
            {[
              "products",
              "variants",
              "content_entries",
              "media_assets",
              "admin_profiles",
              "integrations",
              "sales",
              "site_settings",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Identificador do usuário
          <input name="actor" placeholder="Opcional" />
        </label>
        <button className="button small">Filtrar</button>
      </form>
      {error && <p className="notice error">{error}</p>}
      <section className="admin-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Horário</th>
                <th>Usuário</th>
                <th>Área</th>
                <th>Operação</th>
                <th>Campos alterados</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    {new Date(a.created_at).toLocaleString("pt-BR", {
                      timeZone: "America/Belem",
                    })}
                  </td>
                  <td>
                    <code>{a.actor_id?.slice(0, 8) || "Sistema"}</code>
                  </td>
                  <td>{a.entity}</td>
                  <td>{a.operation}</td>
                  <td>{a.fields.join(", ") || "Alteração registrada"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="table-empty">Nenhuma atividade neste filtro.</p>
          )}
        </div>
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
