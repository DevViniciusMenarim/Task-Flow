import { useState } from "react";
import { emptyFilters, type TaskFilters as FilterValues } from "../hooks/useTaskQuery";
import { localDayAfter, localDayStart } from "../../../shared/utils/dates";
import { UserPicker } from "../../people/components/UserPicker";

interface TaskFiltersProps {
  filters: FilterValues;
  onApply: (filters: FilterValues) => void;
}

function hasAdvancedFilters(filters: FilterValues) {
  return Boolean(filters.status || filters.userId || filters.priority || filters.dueFrom || filters.dueTo || filters.sort !== "createdDesc");
}

export function TaskFilters({ filters, onApply }: TaskFiltersProps) {
  const [draft, setDraft] = useState(filters);
  const [expanded, setExpanded] = useState(() => hasAdvancedFilters(filters));
  const [error, setError] = useState<string | null>(null);
  const active = Boolean(filters.q || hasAdvancedFilters(filters));

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    if ((draft.dueFrom && !localDayStart(draft.dueFrom)) || (draft.dueTo && !localDayAfter(draft.dueTo))) {
      setError("Informe datas válidas para o prazo.");
      return;
    }
    if (draft.dueFrom && draft.dueTo && draft.dueFrom > draft.dueTo) {
      setError("O prazo inicial deve ser anterior ou igual ao prazo final.");
      return;
    }
    setError(null);
    onApply({ ...draft, q: draft.q.trim() });
  };

  const clear = () => {
    setDraft(emptyFilters);
    setError(null);
    onApply({ ...emptyFilters });
  };

  return (
    <form className="panel search-panel task-filters" onSubmit={apply} aria-label="Buscar e filtrar tarefas">
      <div className="search-panel-heading">
        <h2>Encontre sua próxima tarefa</h2>
        {active && <span className="filter-active-label">Filtros ativos</span>}
      </div>
      <div className="filter-search-row">
        <div className="form-field"><label htmlFor="filter-query">Buscar por título ou descrição</label><input id="filter-query" type="search" maxLength={200} placeholder="Digite o que procura" value={draft.q} onChange={(event) => setDraft({ ...draft, q: event.target.value })} /></div>
        <button type="submit">{expanded ? "Aplicar filtros" : "Buscar"}</button>
        <button type="button" className="button-secondary filter-toggle" aria-expanded={expanded} aria-controls={expanded ? "task-advanced-filters" : undefined} onClick={() => setExpanded((value) => !value)}>{expanded ? "Ocultar filtros" : "Mais filtros"}</button>
      </div>
      {expanded && <div id="task-advanced-filters" className="advanced-filters form-grid">
        <div className="form-field"><label htmlFor="filter-status">Estado</label><select id="filter-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">Todos</option><option value="0">Pendente</option><option value="1">Em andamento</option><option value="2">Concluída</option></select></div>
        <div className="form-field"><label htmlFor="filter-priority">Prioridade</label><select id="filter-priority" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option value="">Todas</option><option value="0">Baixa</option><option value="1">Normal</option><option value="2">Alta</option></select></div>
        <UserPicker label="Responsável" value={draft.userId} onChange={(userId) => setDraft((current) => ({ ...current, userId }))} emptyLabel="Todos os responsáveis" />
        <div className="form-field"><label htmlFor="filter-due-from">Prazo a partir de</label><input id="filter-due-from" type="date" value={draft.dueFrom} onChange={(event) => setDraft({ ...draft, dueFrom: event.target.value })} /></div>
        <div className="form-field"><label htmlFor="filter-due-to">Prazo até</label><input id="filter-due-to" type="date" value={draft.dueTo} onChange={(event) => setDraft({ ...draft, dueTo: event.target.value })} /></div>
        <div className="form-field field-full"><label htmlFor="filter-sort">Ordenar por</label><select id="filter-sort" value={draft.sort} onChange={(event) => setDraft({ ...draft, sort: event.target.value as FilterValues["sort"] })}><option value="createdDesc">Mais recentes</option><option value="dueAsc">Prazo mais próximo</option><option value="dueDesc">Prazo mais distante</option><option value="priorityDesc">Maior prioridade</option></select></div>
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {(expanded || active) && <div className="filter-actions"><button type="button" className="button-secondary" onClick={clear}>Limpar filtros</button></div>}
    </form>
  );
}
