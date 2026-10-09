import { useCallback, useState } from "react";
import { useTaskResults } from "../hooks/useTaskData";
import { useTaskQuery } from "../hooks/useTaskQuery";
import { PageHeading } from "../../../shared/ui/PageHeading";
import { Pagination } from "../../../shared/ui/Pagination";
import { TaskFilters } from "./TaskFilters";
import { TaskPreview } from "./TaskPreview";
import { TaskCreateLink } from "./TaskCreateLink";
import { RetryButton } from "../../../shared/ui/RetryButton";

export function TaskList() {
  const { query, applyFilters, goPage, correctPage } = useTaskQuery();
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  const { result, lastResult, loading, error } = useTaskResults(query, refreshKey, correctPage);
  const paginationResult = result ?? lastResult;
  const totalPages = Math.max(1, paginationResult?.totalPages ?? 1);
  const showPagination = Boolean(paginationResult?.items.length);
  const unavailable = loading || Boolean(error);

  return (
    <div className="list-panel">
      <PageHeading
        eyebrow="Área de trabalho"
        title="Tarefas"
        description="Acompanhe o trabalho da equipe e encontre tarefas por estado, responsável ou prazo."
        action={<TaskCreateLink />}
      />
      <TaskFilters key={JSON.stringify(query.filters)} filters={query.filters} onApply={applyFilters} />
      {loading && <p className="loading-state" role="status">Carregando tarefas...</p>}
      {error && <div className="load-error" role="alert"><p>{error}</p><RetryButton onClick={refresh} /></div>}
      {!loading && !error && result?.items.length === 0 && <div className="panel empty-state"><span className="empty-state-icon" aria-hidden="true">+</span><h2>Nenhuma tarefa encontrada.</h2><p>Crie uma tarefa ou ajuste os filtros.</p><TaskCreateLink /></div>}
      {!error && result && result.items.length > 0 && (
        <>
          <p className="result-count" role="status">{result.totalCount} {result.totalCount === 1 ? "tarefa encontrada" : "tarefas encontradas"}</p>
          <div className="task-list">{result.items.map((task) => <TaskPreview key={task.id} task={task} />)}</div>
        </>
      )}
      {showPagination && <Pagination label="Páginas de tarefas" page={query.page} totalPages={totalPages} unavailable={unavailable} onPageChange={goPage} />}
    </div>
  );
}
