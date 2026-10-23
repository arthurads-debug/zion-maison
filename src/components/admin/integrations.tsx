"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { adminRequest, errorMessage } from "./api";
import { CheckCircle2, ShieldCheck, PlugZap } from "lucide-react";
const providers = [
  [
    "meta",
    "Meta Pixel e CAPI",
    "Eventos de marketing, mediante consentimento.",
  ],
  ["analytics", "Google Analytics 4", "Campanhas e navegação com privacidade."],
  ["pushcut", "Pushcut", "Notificações sobre visitas, interesses e estoque."],
  ["whatsapp", "WhatsApp", "Atendimento por link e preparação da API oficial."],
];
export function IntegrationsIndex() {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Conexões com propósito</p>
          <h1>Integrações</h1>
          <p>
            Ative cada serviço quando suas credenciais estiverem disponíveis.
          </p>
        </div>
        <ShieldCheck size={28} strokeWidth={1} />
      </div>
      <div className="integration-grid">
        {providers.map(([key, title, description]) => (
          <Link
            className="admin-card integration-tile"
            href={`/admin/integracoes/${key}`}
            key={key}
          >
            <PlugZap size={25} strokeWidth={1} />
            <h2>{title}</h2>
            <p>{description}</p>
            <span className="text-link">Configurar →</span>
          </Link>
        ))}
      </div>
    </>
  );
}
type Data = {
  enabled: boolean;
  config: Record<string, unknown>;
  has_secret: boolean;
  status: string;
  last_test_at: string | null;
  logs?: {
    id: string;
    state: string;
    attempts: number;
    last_code: number | null;
    last_error: string | null;
    created_at: string;
  }[];
};
const availableEvents = [
  ["site_visited", "Nova sessão"],
  ["whatsapp_intent_created", "Seleção preparada"],
  ["whatsapp_click", "WhatsApp aberto"],
  ["whatsapp_message_received", "Mensagem recebida (API oficial)"],
  ["product_low_stock", "Estoque baixo"],
  ["product_out_of_stock", "Peça esgotada"],
  ["new_product_published", "Produto publicado"],
];
export function IntegrationEditor({ provider }: { provider: string }) {
  const [data, setData] = useState<Data>({
    enabled: false,
    config: {},
    has_secret: false,
    status: "not_configured",
    last_test_at: null,
  });
  const [secret, setSecret] = useState("");
  const [remove, setRemove] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const title = providers.find((p) => p[0] === provider)?.[1] || provider;
  useEffect(() => {
    adminRequest(`integrations/${provider}`)
      .then(setData)
      .catch((e) => setMessage(errorMessage(e)));
  }, [provider, reload]);
  const config = (key: string, value: unknown) =>
    setData((d) => ({ ...d, config: { ...d.config, [key]: value } }));
  async function action(type: "save" | "test") {
    setBusy(true);
    setMessage("");
    try {
      const result = await adminRequest(
        `integrations/${provider}`,
        type === "test"
          ? { action: "test" }
          : {
              enabled: data.enabled,
              config: data.config,
              secret: secret || undefined,
              remove_secret: remove,
            },
      );
      setMessage(
        result.message ||
          "Configuração salva. Credenciais permanecem protegidas no servidor.",
      );
      setSecret("");
      setRemove(false);
      setReload((v) => v + 1);
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="text-link" href="/admin/integracoes">
        ← Todas as integrações
      </Link>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Conexão segura</p>
          <h1>{title}</h1>
          <p>
            Status: <strong>{data.status}</strong>
            {data.last_test_at &&
              ` · Teste em ${new Date(data.last_test_at).toLocaleString("pt-BR")}`}
          </p>
        </div>
        <CheckCircle2 size={25} strokeWidth={1} />
      </div>
      <section className="admin-card">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.enabled}
            disabled={provider === "whatsapp"}
            onChange={(e) => setData({ ...data, enabled: e.target.checked })}
          />
          Ativar integração
        </label>
        {provider === "whatsapp" ? (
          <p className="notice">
            Aguardando integração oficial para mensagens recebidas. Configure o
            número do atendimento em Configurações da loja. Os links wa.me
            funcionam sem API; eles não confirmam envio de mensagem.
          </p>
        ) : provider === "meta" ? (
          <div className="form-grid">
            <label>
              Pixel ID
              <input
                inputMode="numeric"
                value={String(data.config.pixel_id || "")}
                onChange={(e) => config("pixel_id", e.target.value)}
              />
            </label>
            <label>
              Código de teste CAPI (preparação)
              <input
                value={String(data.config.test_code || "")}
                onChange={(e) => config("test_code", e.target.value)}
              />
            </label>
            <p className="notice full-width">
              Pixel depende de consentimento de marketing. A camada CAPI está
              preparada, sem envio automático ativado. Nunca enviamos Purchase
              após clique no WhatsApp.
            </p>
          </div>
        ) : provider === "analytics" ? (
          <label style={{ marginTop: 25 }}>
            GA4 Measurement ID
            <input
              placeholder="G-XXXXXXXXXX"
              value={String(data.config.measurement_id || "")}
              onChange={(e) => config("measurement_id", e.target.value)}
            />
          </label>
        ) : (
          <>
            <div className="form-grid" style={{ marginTop: 25 }}>
              <label>
                Modo de notificação
                <select
                  value={String(data.config.mode || "individual")}
                  onChange={(e) => config("mode", e.target.value)}
                >
                  <option value="individual">Individual por evento</option>
                  <option value="summary">Resumo por intervalo</option>
                </select>
              </label>
              <label>
                Intervalo do resumo (minutos)
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={Number(data.config.interval_minutes) || 15}
                  onChange={(e) =>
                    config("interval_minutes", Number(e.target.value))
                  }
                />
              </label>
              <label>
                Limite por hora
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={Number(data.config.rate_per_hour) || 30}
                  onChange={(e) =>
                    config("rate_per_hour", Number(e.target.value))
                  }
                />
              </label>
              <label>
                Título padrão
                <input
                  value={String(data.config.title || "")}
                  onChange={(e) => config("title", e.target.value)}
                />
              </label>
              <label className="full-width">
                Mensagem padrão
                <textarea
                  value={String(data.config.text || "")}
                  onChange={(e) => config("text", e.target.value)}
                />
              </label>
            </div>
            <fieldset className="permission-fieldset">
              <legend>Eventos habilitados</legend>
              {availableEvents.map(([key, label]) => (
                <label className="checkbox-label" key={key}>
                  <input
                    type="checkbox"
                    checked={
                      Array.isArray(data.config.events) &&
                      data.config.events.includes(key)
                    }
                    onChange={(e) =>
                      config(
                        "events",
                        e.target.checked
                          ? [
                              ...(Array.isArray(data.config.events)
                                ? data.config.events
                                : []),
                              key,
                            ]
                          : (Array.isArray(data.config.events)
                              ? data.config.events
                              : []
                            ).filter((v) => v !== key),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <p className="notice">
              Notificações exigem o executor agendado. Configure o scheduler
              conforme a documentação. A loja continua funcionando se o Pushcut
              falhar.
            </p>
          </>
        )}
        {["pushcut", "meta"].includes(provider) && (
          <>
            <label>
              {provider === "pushcut"
                ? "Endpoint secreto Pushcut"
                : "Token CAPI (armazenamento para integração futura)"}
              <input
                type="password"
                value={secret}
                autoComplete="new-password"
                placeholder={
                  data.has_secret
                    ? "•••••••• — já cadastrado, deixe vazio para manter"
                    : "Cole a credencial aqui"
                }
                onChange={(e) => setSecret(e.target.value)}
              />
            </label>
            {data.has_secret && (
              <label className="checkbox-label" style={{ marginTop: 14 }}>
                <input
                  type="checkbox"
                  checked={remove}
                  onChange={(e) => setRemove(e.target.checked)}
                />
                Remover credencial salva
              </label>
            )}
          </>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <div className="heading-actions" style={{ marginTop: 25 }}>
          <button
            className="button"
            disabled={busy}
            onClick={() => action("save")}
          >
            {busy ? "Aguarde…" : "Salvar configuração"}
          </button>
          <button
            className="button outline"
            disabled={busy}
            onClick={() => action("test")}
          >
            Testar configuração salva
          </button>
        </div>
      </section>
      {provider === "pushcut" && (
        <section className="admin-card">
          <h2>Histórico de notificações</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Horário</th>
                  <th>Status</th>
                  <th>Tentativas</th>
                  <th>Resposta</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {data.logs?.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                    <td>{log.state}</td>
                    <td>{log.attempts}</td>
                    <td>{log.last_code || log.last_error || "—"}</td>
                    <td>
                      {log.state === "failed" && (
                        <button
                          className="text-link"
                          onClick={async () => {
                            if (
                              !confirm(
                                "Reprocessar esta notificação? O fornecedor pode ter recebido uma tentativa anterior.",
                              )
                            )
                              return;
                            try {
                              await adminRequest(`integrations/${provider}`, {
                                action: "retry",
                                id: log.id,
                              });
                              setReload((v) => v + 1);
                            } catch (e) {
                              setMessage(errorMessage(e));
                            }
                          }}
                        >
                          Reprocessar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.logs?.length && (
              <p className="table-empty">Nenhuma entrega registrada.</p>
            )}
          </div>
        </section>
      )}
    </>
  );
}
