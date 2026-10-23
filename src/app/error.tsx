"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="conteudo" className="empty-state">
      <p className="eyebrow">Zion Maison</p>
      <h1>Um breve intervalo.</h1>
      <p>
        Não foi possível carregar esta página. Tente novamente em instantes.
      </p>
      <button className="button" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
