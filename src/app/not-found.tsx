import Link from "next/link";
export default function NotFound() {
  return (
    <main id="conteudo" className="empty-state">
      <p className="eyebrow">ZION MAISON · 404</p>
      <h1>Uma nova direção.</h1>
      <p>Esta página ou peça não está disponível.</p>
      <Link href="/catalogo" className="button">
        Voltar à coleção →
      </Link>
    </main>
  );
}
