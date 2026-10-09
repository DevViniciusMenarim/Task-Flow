import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { TaskCard } from "../components/TaskCard";
import { useTaskActions } from "../hooks/useTaskActions";
import { readTaskQuery, taskQuerySearch } from "../hooks/useTaskQuery";
import { AppLink } from "../../../shared/ui/AppLink";
import { PageHeading } from "../../../shared/ui/PageHeading";
import { RetryButton } from "../../../shared/ui/RetryButton";
import { useLocation, useNavigate } from "react-router";
import { getApiErrorMessage } from "../../../shared/api/client";
import { taskService } from "../api/taskService";
import type { Task } from "../types";

const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [outcome, setOutcome] = useState<{ key: string; taskId: string; task: Task | null; error: string | null } | null>(null);
  const requestId = useRef(0);
  const key = `${taskId}:${refreshKey}`;
  const refresh = () => setRefreshKey((value) => value + 1);
  const { pendingIds, actionError, actionMessage, runAction } = useTaskActions(refresh);
  const from = new URLSearchParams(location.search).get("from") ?? "";
  const backPath = `/tarefas${taskQuerySearch(readTaskQuery(from))}`;

  useEffect(() => {
    if (!guid.test(taskId)) return;
    const id = ++requestId.current;
    void taskService.getTask(taskId).then((task) => {
      if (id === requestId.current) setOutcome({ key, taskId, task, error: null });
    }).catch((failure: unknown) => {
      if (id !== requestId.current) return;
      const error = axios.isAxiosError(failure) && failure.response?.status === 404
        ? "Tarefa não encontrada. Ela pode ter sido excluída."
        : getApiErrorMessage(failure, "Falha ao carregar tarefa.");
      const notFound = axios.isAxiosError(failure) && failure.response?.status === 404;
      setOutcome((previous) => ({ key, taskId, task: notFound || previous?.taskId !== taskId ? null : previous.task, error }));
    });
    return () => { requestId.current += 1; };
  }, [taskId, key]);

  const current = outcome?.key === key ? outcome : null;
  const task = outcome?.taskId === taskId ? outcome.task : null;
  const loading = !current;

  return (
    <div className="narrow-page detail-page">
      <AppLink className="back-link" to={backPath}>← Voltar às tarefas</AppLink>
      <PageHeading eyebrow="Acompanhamento" title="Detalhes da tarefa" description="Consulte o andamento, edite os dados e marque etapas concluídas." />
      {!guid.test(taskId) && <div className="load-error" role="alert"><p>Endereço de tarefa inválido.</p></div>}
      {guid.test(taskId) && loading && <p className="loading-state" role="status">Carregando tarefa...</p>}
      {current?.error && <div className="load-error" role="alert"><p>{current.error}</p>{task && <p>As ações ficam bloqueadas até a tarefa ser atualizada.</p>}<RetryButton onClick={refresh} /></div>}
      {actionError && !current?.error && <p className="form-error" role="alert">{actionError}</p>}
      {actionMessage && <p className="form-message" role="status">{actionMessage}</p>}
      {task && <TaskCard task={task} actionPending={pendingIds.has(task.id)} pending={pendingIds.has(task.id) || loading || !!current?.error} runAction={runAction} onChecklistChanged={refresh} onDeleted={() => navigate(backPath)} />}
      {current?.error && !task && <AppLink className="button-secondary" to={backPath}>Ver lista de tarefas</AppLink>}
    </div>
  );
}



