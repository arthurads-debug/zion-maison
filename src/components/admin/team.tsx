"use client";
import { PageControls } from "./page-controls";
import { useState } from "react";
import { useResource, adminRequest, errorMessage } from "./api";
import type { AdminProfile } from "@/server/auth";
import { permissionOptions } from "@/lib/domain";
const labels: Record<string, string> = {
  "products.read": "Consultar produtos",
  "products.write": "Gerenciar produtos",
  "stock.read": "Consultar estoque",
  "stock.write": "Ajustar estoque e confirmar vendas",
  "content.read": "Consultar conteúdo",
  "content.write": "Editar conteúdo, mídia e coleções",
  "reports.read": "Consultar interesses e relatórios",
};
export function Team() {
  const [page, setPage] = useState(1);
  const { rows, count, error, reload } = useResource<AdminProfile>(
    "team",
    `page=${page}`,
  );
  const [editing, setEditing] = useState<
    (Partial<AdminProfile> & { email?: string }) | null
  >(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">As pessoas por trás da Maison</p>
          <h1>Equipe e permissões</h1>
          <p>Conceda apenas o acesso necessário para cada função.</p>
        </div>
        <button
          className="button small"
          onClick={() =>
            setEditing({
              display_name: "",
              email: "",
              permissions: [],
              active: true,
            })
          }
        >
          Convidar funcionário +
        </button>
      </div>
      {(message || error) && (
        <p className="notice" role="status">
          {message || error}
        </p>
      )}
      {editing && (
        <section className="admin-card">
          <h2>{editing.user_id ? "Editar acesso" : "Novo convite"}</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setMessage("");
              try {
                await adminRequest("team", {
                  user_id: editing.user_id,
                  display_name: editing.display_name,
                  email: editing.email,
                  permissions: editing.permissions || [],
                  active: editing.active,
                });
                setEditing(null);
                reload();
                setMessage(
                  "Acesso salvo. Novos convites dependem da entrega de e-mail configurada no Supabase.",
                );
              } catch (e) {
                setMessage(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-grid">
              <label>
                Nome
                <input
                  required
                  value={editing.display_name || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, display_name: e.target.value })
                  }
                />
              </label>
              {!editing.user_id && (
                <label>
                  E-mail
                  <input
                    required
                    type="email"
                    value={editing.email || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, email: e.target.value })
                    }
                  />
                </label>
              )}
              <fieldset className="permission-fieldset full-width">
                <legend>Permissões</legend>
                {permissionOptions.map((p) => (
                  <label className="checkbox-label" key={p}>
                    <input
                      type="checkbox"
                      checked={editing.permissions?.includes(p) || false}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          permissions: e.target.checked
                            ? [...(editing.permissions || []), p]
                            : (editing.permissions || []).filter(
                                (v) => v !== p,
                              ),
                        })
                      }
                    />
                    {labels[p]}
                  </label>
                ))}
              </fieldset>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editing.active ?? true}
                  onChange={(e) =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
                />
                Acesso ativo
              </label>
            </div>
            <div className="heading-actions">
              <button className="button" disabled={busy}>
                {busy ? "Salvando…" : "Salvar acesso"}
              </button>
              <button
                type="button"
                className="button outline"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="admin-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Função</th>
                <th>Status</th>
                <th>Permissões</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.user_id}>
                  <td>{p.display_name}</td>
                  <td>{p.role === "owner" ? "Proprietária" : "Funcionário"}</td>
                  <td>{p.active ? "Ativo" : "Desativado"}</td>
                  <td>
                    {p.role === "owner"
                      ? "Gestão completa"
                      : p.permissions.map((v) => labels[v] || v).join(", ") ||
                        "Nenhuma"}
                  </td>
                  <td>
                    {p.role !== "owner" && (
                      <button
                        className="text-link"
                        onClick={() => setEditing(p)}
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="notice">
        Funcionários não podem alterar permissões, criar administradores ou
        configurar integrações. A última proprietária ativa é preservada pelo
        banco.
      </p>
      <PageControls page={page} count={count} change={setPage} label="Equipe" />
    </>
  );
}
