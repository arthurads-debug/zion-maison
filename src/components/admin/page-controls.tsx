export function PageControls({
  page,
  count,
  change,
  label = "Página",
}: {
  page: number;
  count: number;
  change: (page: number) => void;
  label?: string;
}) {
  return (
    <nav className="admin-pagination" aria-label={label}>
      <button
        type="button"
        disabled={page === 1}
        onClick={() => change(page - 1)}
      >
        ← Anterior
      </button>
      <span>
        {label} {page}
      </span>
      <button
        type="button"
        disabled={page * 25 >= count}
        onClick={() => change(page + 1)}
      >
        Próxima →
      </button>
    </nav>
  );
}
