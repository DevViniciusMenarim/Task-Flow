import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { getApiErrorMessage } from "../../../shared/api/client";
import { taskService } from "../api/taskService";
import type { Subtask } from "../types";
import { RetryButton } from "../../../shared/ui/RetryButton";

interface SubtaskListProps {
  taskId: string;
  taskTitle: string;
  taskRowVersion: string;
  disabled: boolean;
  onChange: () => void;
  onPendingChange: (pending: boolean) => void;
}

export function SubtaskList({ taskId, taskTitle, taskRowVersion, disabled, onChange, onPendingChange }: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editConflict, setEditConflict] = useState(false);
  const editRowVersionRef = useRef(taskRowVersion);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const pendingIdsRef = useRef(new Set<string>());
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const data = await taskService.getSubtasks(taskId);
      if (id === requestId.current) setSubtasks(data);
    } catch (requestError) {
      if (id === requestId.current) setError(getApiErrorMessage(requestError, "Falha ao carregar subtarefas."));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    const id = ++requestId.current;
    void taskService.getSubtasks(taskId).then((data) => {
      if (id === requestId.current) setSubtasks(data);
    }).catch((requestError: unknown) => {
      if (id === requestId.current) setError(getApiErrorMessage(requestError, "Falha ao carregar subtarefas."));
    }).finally(() => {
      if (id === requestId.current) setLoading(false);
    });
    return () => { requestId.current += 1; };
  }, [taskId]);

  const mutate = async (key: string, action: () => Promise<unknown>) => {
    if (disabled || loading || pendingIdsRef.current.size > 0) return;
    pendingIdsRef.current = new Set(pendingIdsRef.current).add(key);
    setPendingIds(new Set(pendingIdsRef.current));
    onPendingChange(true);
    setActionError(null);
    try {
      await action();
      onChange();
      setLoading(true);
      setError(null);
      await load();
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 409) {
        setActionError("A tarefa ou checklist mudou em outra sessão. Atualize e revise os dados antes de tentar novamente.");
        if (key === editingId) setEditConflict(true);
        onChange();
        setLoading(true);
        setError(null);
        await load();
      } else {
        setActionError(getApiErrorMessage(requestError, "Falha ao atualizar subtarefa.", {
          notFound: "Tarefa ou subtarefa não encontrada. Atualize a checklist.",
        }));
      }
    } finally {
      const next = new Set(pendingIdsRef.current);
      next.delete(key);
      pendingIdsRef.current = next;
      setPendingIds(next);
      onPendingChange(false);
    }
  };

  const completed = subtasks.filter((item) => item.isCompleted).length;
  const busy = disabled || loading || pendingIds.size > 0;

  return (
    <section className="subtasks" aria-label={`Checklist de ${taskTitle}`}>
      <h4>Checklist</h4>
      {!loading && !error && <p className="subtask-progress">{completed} de {subtasks.length} concluídas</p>}
      {!loading && !error && <progress value={completed} max={Math.max(1, subtasks.length)} aria-label={`Progresso da checklist de ${taskTitle}`} />}
      {loading && <p role="status">Carregando subtarefas...</p>}
      {error && <div className="load-error" role="alert"><p>{error}</p><RetryButton onClick={() => { setLoading(true); setError(null); void load(); }} /></div>}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {!loading && !error && subtasks.length === 0 && <p>Nenhuma subtarefa nesta checklist.</p>}
      {!loading && !error && subtasks.length > 0 && (
        <ul className="subtask-list">
          {subtasks.map((item) => (
            <li key={item.id} className="subtask-item">
              {editingId === item.id ? (
                <form onSubmit={(event) => {
                  event.preventDefault();
                  if (editConflict) return;
                  const clean = editTitle.trim();
                  if (!clean) { setActionError("Informe o título da subtarefa."); return; }
                  void mutate(item.id, async () => {
                    await taskService.updateSubtask(taskId, item.id, editRowVersionRef.current, { title: clean });
                    setEditingId(null);
                    setEditConflict(false);
                  });
                }}>
                  <label htmlFor={`subtask-edit-${item.id}`}>Editar subtarefa</label>
                  <input id={`subtask-edit-${item.id}`} maxLength={200} required value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                  {editConflict && <p className="form-error" role="status">Seu rascunho não foi salvo. Copie o que desejar antes de cancelar e reabra a edição para revisar a checklist atualizada.</p>}
                  <button type="submit" disabled={busy || editConflict}>Salvar</button>
                  <button type="button" className="button-secondary" disabled={busy} onClick={() => { setEditingId(null); setEditConflict(false); }}>Cancelar</button>
                </form>
              ) : (
                <>
                  <label className="subtask-check">
                    <input type="checkbox" checked={item.isCompleted} disabled={busy} onChange={() => { void mutate(item.id, () => taskService.updateSubtask(taskId, item.id, taskRowVersion, { isCompleted: !item.isCompleted })); }} />
                    <span>{item.title}</span>
                  </label>
                  <div className="subtask-actions">
                    <button type="button" className="button-secondary" disabled={busy} aria-label={`Editar subtarefa ${item.title}`} onClick={() => { editRowVersionRef.current = taskRowVersion; setEditingId(item.id); setEditTitle(item.title); setEditConflict(false); }}>Editar</button>
                    <button type="button" className="button-danger" disabled={busy} aria-label={`Excluir subtarefa ${item.title}`} onClick={() => {
                      if (window.confirm(`Excluir a subtarefa “${item.title}”?`)) void mutate(item.id, () => taskService.deleteSubtask(taskId, item.id, taskRowVersion));
                    }}>Excluir</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <form className="subtask-add" onSubmit={(event) => {
        event.preventDefault();
        const clean = title.trim();
        if (!clean) { setActionError("Informe o título da subtarefa."); return; }
        void mutate("create", async () => {
          await taskService.createSubtask(taskId, taskRowVersion, clean);
          setTitle("");
        });
      }}>
        <label htmlFor={`subtask-new-${taskId}`}>Nova subtarefa</label>
        <input id={`subtask-new-${taskId}`} value={title} required maxLength={200} onChange={(event) => setTitle(event.target.value)} />
        <button type="submit" disabled={busy}>{pendingIds.has("create") ? "Adicionando..." : "Adicionar"}</button>
      </form>
    </section>
  );
}
