"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useSyncExternalStore } from "react";
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
  ["Início", "/admin", "home", LayoutDashboard],
  ["Produtos", "/admin/produtos", "products.read", Shirt],
  ["Estoque", "/admin/estoque", "stock.read", Boxes],
  ["Fotos e arquivos", "/admin/midia", "products.write", Images],
  ["Categorias e coleções", "/admin/categorias", "content.read", Layers],
  ["Conteúdo da loja", "/admin/conteudo", "content.read", PenLine],
  ["Looks", "/admin/looks", "content.read", Shirt],
  ["Vídeos da loja", "/admin/videos", "content.read", Video],
  ["Atendimentos e vendas", "/admin/vendas", "stock.write", ShoppingBag],
  ["Relatórios", "/admin/relatorios", "reports.read", ChartNoAxesCombined],
  ["Equipe", "/admin/equipe", "team.write", Users],
  ["Integrações", "/admin/integracoes", "integrations.write", Plug],
  ["Configurações", "/admin/configuracoes", "settings.write", Settings],
  ["Histórico", "/admin/historico", "history.read", History],
] as const;
const mobileQuery = "(max-width: 750px)";
function subscribeViewport(callback: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function mobileSnapshot() {
  return window.matchMedia(mobileQuery).matches;
}
function serverSnapshot() {
  return false;
}
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
  const mobile = useSyncExternalStore(
    subscribeViewport,
    mobileSnapshot,
    serverSnapshot,
  );
  const sidebar = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobile || !open) return;
    const returnFocus = opener.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closer.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), summary",
        ) || [],
      ).filter((element) => element.getClientRects().length);
      const first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyboard);
      returnFocus?.focus();
    };
  }, [mobile, open]);

  return (
    <div className="admin-shell">
      <aside
        ref={sidebar}
        id="admin-navigation"
        className={`admin-sidebar ${open ? "is-open" : ""}`}
        inert={mobile && !open}
        role={mobile && open ? "dialog" : undefined}
        aria-modal={mobile && open ? true : undefined}
        aria-label="Menu do painel"
      >
        <div className="admin-logo">
          <Link href="/admin">
            <Wordmark />
          </Link>
          <button
            className="icon-button mobile-only"
            ref={closer}
            aria-label="Fechar navegação"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="admin-nav-label">ATELIER DIGITAL</p>
        <nav aria-label="Administração">
          {[
            {
              title: "Seu dia a dia",
              paths: [
                "/admin",
                "/admin/produtos",
                "/admin/estoque",
                "/admin/vendas",
              ],
              primary: true,
            },
            {
              title: "Sua vitrine",
              paths: [
                "/admin/conteudo",
                "/admin/categorias",
                "/admin/midia",
                "/admin/looks",
                "/admin/videos",
              ],
              primary: false,
            },
            {
              title: "Configurações e gestão",
              paths: [
                "/admin/relatorios",
                "/admin/equipe",
                "/admin/configuracoes",
                "/admin/integracoes",
                "/admin/historico",
              ],
              primary: false,
            },
          ].map((group) => {
            const visible = items.filter(
              ([, href, permission]) =>
                group.paths.includes(href) &&
                (permission === "home" ||
                  allowed(profile, permission) ||
                  (permission.endsWith(".read") &&
                    allowed(profile, permission.replace(".read", ".write"))) ||
                  (group.paths.includes(href) &&
                    permission === "products.write" &&
                    allowed(profile, "content.write"))),
            );
            if (!visible.length) return null;
            const links = visible.map(([name, href, , Icon]) => {
              const active =
                path === href ||
                (href !== "/admin" && path.startsWith(href + "/"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={active ? "active" : ""}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={19} strokeWidth={1.6} />
                  <span>{name}</span>
                </Link>
              );
            });
            return group.primary ? (
              <div className="admin-nav-group" key={group.title}>
                <p>{group.title}</p>
                {links}
              </div>
            ) : (
              <details
                className="admin-nav-group"
                key={`${group.title}-${path}`}
                open={group.paths.some(
                  (href) => path === href || path.startsWith(href + "/"),
                )}
              >
                <summary>{group.title}</summary>
                {links}
              </details>
            );
          })}
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
          aria-label="Fechar menu pela área externa"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="icon-button mobile-only"
            ref={opener}
            aria-label="Abrir navegação administrativa"
            aria-expanded={open}
            aria-controls="admin-navigation"
            onClick={() => setOpen(true)}
          >
            <Menu size={21} />
          </button>
          <span>
            Sua Maison <span className="topbar-divider">/</span>{" "}
            {items.find(([, href]) => href === path)?.[0] ||
              "Produtos e conteúdo"}
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
