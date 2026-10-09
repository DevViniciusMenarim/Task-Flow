import { useEffect, useId, useRef, useState } from "react";
import { usePagedUsers } from "../hooks/usePagedUsers";
import { userService } from "../api/userService";
import { RetryButton } from "../../../shared/ui/RetryButton";

interface UserPickerProps {
  label: string;
  value: string;
  selectedName?: string;
  onChange: (id: string) => void;
  emptyLabel: string;
  reloadKey?: number;
  required?: boolean;
}

export function UserPicker({ label, value, selectedName, onChange, emptyLabel, reloadKey = 0, required = false }: UserPickerProps) {
  const id = useId();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedNames, setSelectedNames] = useState<Record<string, string>>({});
  const selectedRequestId = useRef(0);
  const { result, lastResult, loading, error } = usePagedUsers(
    q, page, JSON.stringify([reloadKey, retryKey]), setPage, "Falha ao buscar responsáveis.",
  );

  const paginationResult = result ?? lastResult;
  const totalPages = Math.max(1, paginationResult?.totalPages ?? 1);
  const showPagination = totalPages > 1;
  const unavailable = loading || Boolean(error);

  useEffect(() => {
    const id = ++selectedRequestId.current;
    if (value && !result?.items.some((user) => user.id === value) && !selectedName && !selectedNames[value]) {
      void userService.getUser(value).then((user) => {
        if (id === selectedRequestId.current) setSelectedNames((names) => ({ ...names, [value]: user.name }));
      }).catch(() => { /* Preserve the selected id if its user was removed. */ });
    }
    return () => { selectedRequestId.current += 1; };
  }, [value, selectedName, selectedNames, result]);

  const selectedIsInPage = result?.items.some((user) => user.id === value) ?? false;
  const selectedLabel = result?.items.find((user) => user.id === value)?.name ?? selectedName ?? selectedNames[value] ?? `Responsável ${value.slice(0, 8)}…`;
  return (
    <div className="form-field user-picker">
      <label htmlFor={`${id}-search`}>Buscar {label.toLowerCase()}</label>
      <input id={`${id}-search`} type="search" maxLength={150} value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} />
      <label htmlFor={`${id}-select`}>{label}</label>
      <select id={`${id}-select`} required={required} value={value} onChange={(event) => {
        const selected = result?.items.find((user) => user.id === event.target.value);
        if (selected) setSelectedNames((names) => ({ ...names, [selected.id]: selected.name }));
        onChange(event.target.value);
      }}>
        <option value="">{emptyLabel}</option>
        {value && !selectedIsInPage && <option value={value}>{selectedLabel}</option>}
        {result?.items.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
      </select>
      {loading && <small role="status">Buscando responsáveis...</small>}
      {error && <><small role="alert">{error}</small><RetryButton onClick={() => setRetryKey((value) => value + 1)} /></>}
      {showPagination && (
        <div className="user-picker-pages">
          <button type="button" className="button-secondary" aria-disabled={unavailable || page <= 1} onClick={() => { if (!unavailable && page > 1) setPage(page - 1); }} aria-label={`Página anterior de ${label.toLowerCase()}`}>Anterior</button>
          <span>Página {page} de {totalPages}</span>
          <button type="button" className="button-secondary" aria-disabled={unavailable || page >= totalPages} onClick={() => { if (!unavailable && page < totalPages) setPage(page + 1); }} aria-label={`Próxima página de ${label.toLowerCase()}`}>Próxima</button>
        </div>
      )}
    </div>
  );
}
