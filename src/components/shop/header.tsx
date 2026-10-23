"use client";
import { ResponsiveImage } from "@/components/responsive-image";

import Link from "next/link";
import { useRef } from "react";
import { useSelection } from "@/components/selection-provider";
import { Search, ShoppingBag, Heart, Menu, X, ArrowRight } from "./icons";
import type { Settings } from "@/lib/domain";
import { Cart } from "./selection";
import { SearchSuggestions } from "./search-suggestions";
const links = [
  ["Novidades", "/catalogo?sort=newest"],
  ["Vestidos", "/catalogo?category=vestidos"],
  ["Conjuntos", "/catalogo?category=conjuntos"],
  ["Alfaiataria", "/catalogo?category=alfaiataria"],
  ["Coleções", "/colecoes"],
  ["Shop the Look", "/looks"],
];
export function Wordmark({ settings }: { settings?: Settings }) {
  return settings?.logo_url ? (
    <ResponsiveImage
      className="brand-image"
      src={settings.logo_url}
      alt={settings.name}
    />
  ) : (
    <span className="wordmark">
      ZION<span>MAISON</span>
    </span>
  );
}
export function Header({ settings }: { settings: Settings }) {
  const menu = useRef<HTMLDialogElement>(null);
  const cart = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLDialogElement>(null);
  const { lines } = useSelection();
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return (
    <>
      <div className="announcement">
        <span>◇</span>
        {settings.announcement}
        <span>◇</span>
      </div>
      <header className="site-header">
        <button
          className="icon-button mobile-only"
          aria-label="Abrir menu"
          onClick={() => menu.current?.showModal()}
        >
          <Menu size={21} />
        </button>
        <Link href="/" className="brand" aria-label="Zion Maison — início">
          <Wordmark settings={settings} />
        </Link>
        <nav className="desktop-nav" aria-label="Navegação principal">
          {links.map(([label, url]) => (
            <Link key={label} href={url}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <button
            className="icon-button"
            aria-label="Pesquisar"
            onClick={() => search.current?.showModal()}
          >
            <Search size={21} />
          </button>
          <Link
            className="icon-button favorite-header"
            href="/favoritos"
            aria-label="Favoritos"
          >
            <Heart size={21} />
          </Link>
          <button
            className="icon-button bag"
            aria-label={`Abrir minha seleção (${count})`}
            onClick={() => cart.current?.showModal()}
          >
            <ShoppingBag size={21} />
            <span>{count}</span>
          </button>
        </div>
      </header>
      <dialog ref={menu} className="drawer menu-drawer">
        <div className="drawer-head">
          <Wordmark />
          <button
            className="icon-button"
            aria-label="Fechar menu"
            onClick={() => menu.current?.close()}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Menu mobile">
          {links.map(([label, url], i) => (
            <Link onClick={() => menu.current?.close()} key={label} href={url}>
              <small>0{i + 1}</small>
              {label}
              <ArrowRight size={18} />
            </Link>
          ))}
        </nav>
        <Link
          href="/sobre"
          onClick={() => menu.current?.close()}
          className="text-link"
        >
          O universo Zion Maison
        </Link>
      </dialog>
      <dialog ref={search} className="search-dialog">
        <div className="drawer-head">
          <p className="eyebrow">Encontre sua próxima escolha</p>
          <button
            className="icon-button"
            aria-label="Fechar pesquisa"
            onClick={() => search.current?.close()}
          >
            <X />
          </button>
        </div>
        <SearchSuggestions close={() => search.current?.close()} />
        <p className="muted">Busque por peça, cor, coleção ou estilo.</p>
      </dialog>
      <dialog ref={cart} className="drawer cart-drawer">
        <div className="drawer-head">
          <p className="eyebrow">Sua seleção</p>
          <button
            className="icon-button"
            aria-label="Fechar seleção"
            onClick={() => cart.current?.close()}
          >
            <X />
          </button>
        </div>
        <Cart compact />
      </dialog>
      <nav className="mobile-bottom" aria-label="Navegação rápida">
        <Link href="/">Início</Link>
        <Link href="/catalogo">Coleção</Link>
        <Link href="/favoritos">
          <Heart size={17} />
          Favoritos
        </Link>
        <button onClick={() => cart.current?.showModal()}>
          <ShoppingBag size={17} />
          Seleção {count > 0 && `(${count})`}
        </button>
      </nav>
    </>
  );
}
