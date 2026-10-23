"use client";
import { homeBlocks, homeBlockLabels } from "@/lib/home-blocks";
import { useEffect, useState } from "react";
import { adminRequest, errorMessage } from "./api";
import type { Settings } from "@/lib/domain";
import { MediaLibrary } from "./media-library";
export function SettingsEditor() {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState<"logo_url" | "icon_url" | null>(null);
  useEffect(() => {
    adminRequest("settings")
      .then((d) => setSettings(d.data.data))
      .catch((e) => setMessage(errorMessage(e)));
  }, []);
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Sua marca em cada detalhe</p>
          <h1>Configurações da loja</h1>
          <p>Identidade, atendimento e informações comerciais.</p>
        </div>
      </div>
      <section className="admin-card">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              await adminRequest("settings", settings);
              setMessage("Configurações salvas e disponíveis na loja.");
            } catch (e) {
              setMessage(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            {[
              ["name", "Nome da loja"],
              ["announcement", "Aviso institucional"],
              ["whatsapp", "WhatsApp internacional (somente números)"],
              ["instagram", "Instagram oficial"],
              ["email", "E-mail de contato"],
              ["address", "Endereço comercial"],
              ["business_id", "CNPJ / identificação comercial"],
              ["logo_url", "Logotipo original (URL)"],
              ["icon_url", "Ícone (URL)"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={String(settings[key as keyof Settings] || "")}
                  onChange={(e) =>
                    setSettings({ ...settings, [key]: e.target.value })
                  }
                />
                {["logo_url", "icon_url"].includes(key) && (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setLibrary(key as "logo_url" | "icon_url")}
                  >
                    Escolher arquivo na biblioteca
                  </button>
                )}
              </label>
            ))}
            <label className="full-width">
              Texto institucional
              <textarea
                rows={5}
                value={settings.about || ""}
                onChange={(e) =>
                  setSettings({ ...settings, about: e.target.value })
                }
              />
            </label>
            <label className="full-width">
              Mensagem padrão de contato
              <textarea
                rows={3}
                value={settings.default_message || ""}
                onChange={(e) =>
                  setSettings({ ...settings, default_message: e.target.value })
                }
              />
            </label>
          </div>
          <fieldset>
            <legend>Ordem das seções na página inicial</legend>
            <ol>
              {(settings.home_order || [...homeBlocks]).map(
                (block, index, list) => (
                  <li key={block}>
                    {homeBlockLabels[block]}{" "}
                    <button
                      type="button"
                      className="text-link"
                      disabled={index === 0}
                      aria-label={`Subir ${homeBlockLabels[block]}`}
                      onClick={() => {
                        const order = [...list];
                        [order[index - 1], order[index]] = [
                          order[index],
                          order[index - 1],
                        ];
                        setSettings({ ...settings, home_order: order });
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-link"
                      disabled={index === list.length - 1}
                      aria-label={`Descer ${homeBlockLabels[block]}`}
                      onClick={() => {
                        const order = [...list];
                        [order[index + 1], order[index]] = [
                          order[index],
                          order[index + 1],
                        ];
                        setSettings({ ...settings, home_order: order });
                      }}
                    >
                      ↓
                    </button>
                  </li>
                ),
              )}
            </ol>
          </fieldset>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Salvando…" : "Salvar configurações"}
          </button>
        </form>
      </section>
      {library && (
        <section className="admin-card">
          <button className="text-link" onClick={() => setLibrary(null)}>
            Fechar biblioteca
          </button>
          <MediaLibrary
            embedded
            onSelect={(a) => {
              setSettings({ ...settings, [library]: a.url });
              setLibrary(null);
            }}
          />
        </section>
      )}
    </>
  );
}
