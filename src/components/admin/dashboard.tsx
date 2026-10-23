"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Users,
  Eye,
  MessageCircle,
  ShoppingBag,
  Shirt,
  Download,
} from "lucide-react";
import { money } from "@/lib/domain";
import type { Report } from "@/lib/report";
export function Dashboard({
  performance = false,
  productIds = "",
}: {
  performance?: boolean;
  productIds?: string;
}) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [params, setParams] = useState(
    `period=30${productIds ? `&products=${productIds}` : ""}`,
  );
  const [loadedParams, setLoadedParams] = useState("");
  const busy = params !== loadedParams;
  useEffect(() => {
    const c = new AbortController();
    fetch(`/api/admin/report?${params}`, { signal: c.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setReport(d);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoadedParams(params);
      });
    return () => c.abort();
  }, [params]);
  const metrics = report?.metrics;
  const cards = [
    ["Visitantes estimados", report?.visitors, Users],
    ["Visualizações de produtos", metrics?.product_views, Eye],
    ["Cliques no WhatsApp", metrics?.whatsapp_clicks, MessageCircle],
    ["Carrinhos iniciados", metrics?.carts, ShoppingBag],
  ] as const;
  const max = Math.max(1, ...(report?.series || []).map((s) => s.views));
  return (
    <>
      {!!report?.archive?.length && (
        <section className="admin-card">
          <h2>Arquivo agregado</h2>
          <p>
            Totais anteriores a 90 dias, sem identificadores, mantidos por 13
            meses. As métricas detalhadas abaixo usam somente eventos ainda
            retidos. O arquivo não permite deduplicar visitantes nem filtrar
            produtos.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Páginas</th>
                  <th>Produtos</th>
                  <th>WhatsApp</th>
                  <th>Interesses</th>
                </tr>
              </thead>
              <tbody>
                {report.archive.map((a) => (
                  <tr key={a.day}>
                    <td>{a.day}</td>
                    <td>{a.page_views}</td>
                    <td>{a.product_views}</td>
                    <td>{a.whatsapp_clicks}</td>
                    <td>{a.intents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">
            {performance
              ? "Conheça o interesse pelas suas peças"
              : "Sua Maison em perspectiva"}
          </p>
          <h1>{performance ? "Desempenho e relatórios" : "Visão geral"}</h1>
          <p>Acompanhe o que aproxima as clientes da sua marca.</p>
        </div>
        <a
          href={`/api/admin/report?${params}&format=csv`}
          className="button outline small"
        >
          <Download size={15} />
          Exportar CSV
        </a>
      </div>
      <form
        className="report-filters"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          setParams(
            new URLSearchParams(
              Object.fromEntries(d) as Record<string, string>,
            ).toString(),
          );
        }}
      >
        <label>
          Período
          <select name="period" defaultValue="30">
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="month">Este mês</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
        <label>
          De
          <input type="date" name="from" />
        </label>
        <label>
          Até
          <input type="date" name="to" />
        </label>
        {performance && (
          <label className="compare-filter">
            Produtos para comparar (IDs separados por vírgula)
            <input
              name="products"
              defaultValue={productIds}
              placeholder="Deixe vazio para todos"
            />
          </label>
        )}
        <button className="button small" disabled={busy}>
          {busy ? "Atualizando…" : "Aplicar"}
        </button>
      </form>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <div className="analytics-coverage">
        Estatísticas comportamentais refletem visitas com consentimento.
        Visitantes são estimativas. Cliques no WhatsApp não são mensagens ou
        vendas.
      </div>
      <div className="metric-grid">
        {cards.map(([label, value, Icon]) => (
          <article className="metric-card" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={17} strokeWidth={1.5} />
            </div>
            <strong>{value ?? "—"}</strong>
            <small>
              {report ? "No período selecionado" : "Carregando dados reais"}
            </small>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="admin-card chart-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Descoberta e intenção</p>
              <h2>O movimento da sua loja</h2>
            </div>
            <span className="chart-legend">
              ● Visualizações <i>● WhatsApp</i>
            </span>
          </div>
          {report?.series.length ? (
            <div
              className="bar-chart"
              role="img"
              aria-label="Visualizações e cliques por dia"
            >
              {report.series.map((s) => (
                <div
                  className="chart-column"
                  key={s.day}
                  title={`${s.day}: ${s.views} visualizações, ${s.clicks} cliques`}
                >
                  <div>
                    <span
                      style={{
                        height: `${Math.max(1, (s.views / max) * 100)}%`,
                      }}
                    />
                    <i
                      style={{
                        height: `${Math.max(1, (s.clicks / max) * 100)}%`,
                      }}
                    />
                  </div>
                  <small>
                    {s.day.slice(8)}/{s.day.slice(5, 7)}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <div className="chart-empty">
              <Eye size={26} strokeWidth={1} />
              <p>A história dos seus dados começa com as primeiras visitas.</p>
              <small>Nenhum evento registrado neste período.</small>
            </div>
          )}
        </section>
        <section className="admin-card inventory-summary">
          <p className="eyebrow">O cuidado com as peças</p>
          <h2>Estoque em dia</h2>
          {[
            ["Produtos ativos", report?.inventory.active],
            ["Variações com estoque baixo", report?.inventory.low],
            ["Variações esgotadas", report?.inventory.out],
          ].map(([label, value]) => (
            <div className="inventory-row" key={label}>
              <span>{label}</span>
              <strong>{value ?? "—"}</strong>
            </div>
          ))}
          <Link href="/admin/estoque" className="text-link">
            Gerenciar estoque <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <div className="secondary-metrics">
        {[
          ["Sessões", metrics?.sessions],
          ["Páginas vistas", metrics?.page_views],
          ["Favoritos adicionados", metrics?.favorites],
          ["Intenções registradas", metrics?.intents],
          [
            "Taxa para WhatsApp",
            metrics
              ? `${metrics.product_sessions ? ((100 * metrics.converted_sessions) / metrics.product_sessions).toFixed(1) : "0"}%`
              : "—",
          ],
          ["Vendas confirmadas", report?.sales.count],
          ["Valor confirmado", report ? money(report.sales.total_cents) : "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value ?? "—"}</strong>
          </div>
        ))}
      </div>
      <section className="admin-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Peças que despertam interesse</p>
            <h2>Produtos em destaque</h2>
          </div>
          <Shirt size={20} strokeWidth={1} />
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Visualizações</th>
                <th>Únicas estimadas</th>
                <th>WhatsApp</th>
                <th>Carrinho</th>
                <th>Favoritos</th>
                <th>Desempenho</th>
              </tr>
            </thead>
            <tbody>
              {report?.products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.views}</td>
                  <td>{p.unique_views}</td>
                  <td>{p.clicks}</td>
                  <td>{p.cart}</td>
                  <td>{p.favorites}</td>
                  <td>
                    <Link
                      className="text-link"
                      href={`/admin/produtos/${p.id}?tab=performance`}
                    >
                      Analisar ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!report?.products.length && (
            <p className="table-empty">
              Os produtos mais acessados aparecerão aqui quando houver eventos.
            </p>
          )}
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="admin-card">
          <h2>Origens e campanhas</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Origem</th>
                  <th>Campanha</th>
                  <th>Sessões</th>
                  <th>WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {report?.sources.map((s, i) => (
                  <tr key={i}>
                    <td>{s.source}</td>
                    <td>{s.campaign || "—"}</td>
                    <td>{s.sessions}</td>
                    <td>{s.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!report?.sources.length && (
              <p className="table-empty">
                Sem atribuição registrada no período.
              </p>
            )}
          </div>
        </section>
        <section className="admin-card">
          <h2>Cores e tamanhos</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cor</th>
                  <th>Tamanho</th>
                  <th>Seleções</th>
                </tr>
              </thead>
              <tbody>
                {report?.choices.map((c, i) => (
                  <tr key={i}>
                    <td>{c.color || "—"}</td>
                    <td>{c.size || "—"}</td>
                    <td>{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!report?.choices.length && (
              <p className="table-empty">
                Sem seleções de variação registradas.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
