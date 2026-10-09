interface PaginationProps {
  label: string;
  page: number;
  totalPages: number;
  unavailable: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ label, page, totalPages, unavailable, onPageChange }: PaginationProps) {
  return (
    <nav className="pagination" aria-label={label}>
      <button type="button" className="button-secondary" aria-disabled={unavailable || page <= 1} onClick={() => { if (!unavailable && page > 1) onPageChange(page - 1); }}>Anterior</button>
      <span>Página {page} de {totalPages}</span>
      <button type="button" className="button-secondary" aria-disabled={unavailable || page >= totalPages} onClick={() => { if (!unavailable && page < totalPages) onPageChange(page + 1); }}>Próxima</button>
    </nav>
  );
}
