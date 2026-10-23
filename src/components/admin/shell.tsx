"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Shirt,
  Boxes,
  Images,
  PenLine,
  ChartNoAxesCombined,
  Users,
  Settings,
  Plug,
  History,
  ShoppingBag,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  Layers,
  Video,
} from "lucide-react";
import { Wordmark } from "../shop/header";
import { allowed } from "@/lib/domain";
import type { AdminProfile } from "@/server/auth";
const items = [
  ["Visão geral", "/admin", "reports.read", LayoutDashboard],
  ["Produtos", "/admin/produtos", "products.read", Shirt],
  ["Estoque", "/admin/estoque", "stock.read", Boxes],
  ["Mídia", "/admin/midia", "products.write", Images],
  ["Categorias e coleções", "/admin/categorias", "content.read", Layers],
  ["Conteúdo da loja", "/admin/conteudo", "content.read", PenLine],
  ["Looks", "/admin/looks", "content.read", Shirt],
  ["Zion in Motion", "/admin/videos", "content.read", Video],
  ["Interesses e vendas", "/admin/vendas", "stock.write", ShoppingBag],
  ["Relatórios", "/admin/relatorios", "reports.read", ChartNoAxesCombined],
  ["Equipe", "/admin/equipe", "team.write", Users],
  ["Integrações", "/admin/integracoes", "integrations.write", Plug],
  ["Configurações", "/admin/configuracoes", "settings.write", Settings],
  ["Histórico", "/admin/historico", "history.read", History],
] as const;
export function AdminShell({
  profile,
  children,
}: {
  profile: AdminProfile;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <div className="admin-logo">
          <Link href="/admin">
            <Wordmark />
          </Link>
          <button
            className="icon-button mobile-only"
            aria-label="Fechar navegação"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="admin-nav-label">Seu espaço de gestão</p>
        <nav aria-label="Administração">
          {items
            .filter(
              ([, , perm]) =>
                allowed(profile, perm) ||
                (perm.endsWith(".read") &&
                  allowed(profile, perm.replace(".read", ".write"))) ||
                (perm === "products.write" &&
                  allowed(profile, "content.write")),
            )
            .map(([name, href, , Icon]) => (
              <Link
                key={href}
                href={href}
                className={
                  path === href ||
                  (href !== "/admin" && path.startsWith(href + "/"))
                    ? "active"
                    : ""
                }
                onClick={() => setOpen(false)}
              >
                <Icon size={17} strokeWidth={1.5} />
                <span>{name}</span>
              </Link>
            ))}
        </nav>
        <div className="sidebar-footer">
          <Link href="/" target="_blank">
            Visitar loja <ArrowUpRight size={16} />
          </Link>
          <div>
            <span className="avatar">{profile.display_name.slice(0, 1)}</span>
            <p>
              {profile.display_name}
              <small>
                {profile.role === "owner" ? "Proprietária" : "Funcionário"}
              </small>
            </p>
            <button
              className="icon-button"
              aria-label="Sair"
              onClick={async () => {
                const r = await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "logout" }),
                });
                if (r.ok) {
                  router.push("/admin/login");
                  router.refresh();
                } else
                  setError(
                    "Não foi possível encerrar a sessão. Tente novamente.",
                  );
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
        </div>
      </aside>
      {open && (
        <button
          className="admin-overlay"
          aria-label="Fechar navegação"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="icon-button mobile-only"
            aria-label="Abrir navegação administrativa"
            onClick={() => setOpen(true)}
          >
            <Menu size={21} />
          </button>
          <span>
            Zion Maison <span className="topbar-divider">/</span> Administração
          </span>
          <Link href="/" target="_blank">
            Abrir vitrine <ArrowUpRight size={14} />
          </Link>
        </header>
        <main id="conteudo" className="admin-content">
          {children}
        </main>
        <footer className="admin-footer">
          ZION MAISON <span>Cada detalhe faz parte da sua história.</span>
        </footer>
      </div>
    </div>
  );
}
