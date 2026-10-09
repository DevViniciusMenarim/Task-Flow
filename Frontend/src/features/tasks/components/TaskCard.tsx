import { useEffect, useRef, useState } from "react";
import type { ActionResult } from "../hooks/useTaskActions";
import { taskService } from "../api/taskService";
import type { Task, UpdateTaskDTO } from "../types";
import { SubtaskList } from "./SubtaskList";
import { TaskEditForm } from "./TaskEditForm";
import { TaskBadges } from "./TaskBadges";
import { TaskMeta } from "./TaskMeta";

interface TaskCardProps {
  task: Task;
  actionPending: boolean;
  pending: boolean;
  runAction: (task: Task, action: () => Promise<void>, message: string) => Promise<ActionResult>;
  onChecklistChanged: () => void;
  onDeleted?: () => void;
}

export function TaskCard({ task, actionPending, pending, runAction, onChecklistChanged, onDeleted }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [editConflict, setEditConflict] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistPending, setChecklistPending] = useState(false);
  const checklistPendingRef = useRef(false);
  const editTriggerRef = useRef<HTMLButtonElement>(null);
  const editTitleRef = useRef<HTMLInputElement>(null);
  const editRowVersionRef = useRef(task.rowVersion);
  const hasOpenedEditRef = useRef(false);

  useEffect(() => {
    if (editing) {
      hasOpenedEditRef.current = true;
      editTitleRef.current?.focus();
    } else if (hasOpenedEditRef.current && !pending && !checklistPending) {
      editTriggerRef.current?.focus();
    }
  }, [editing, pending, checklistPending]);
  const busy = pending || checklistPending;
  const onChecklistPendingChange = (value: boolean) => {
    checklistPendingRef.current = value;
    setChecklistPending(value);
  };
  const updateStatus = (status: 0 | 1 | 2, message: string) => {
    if (pending || checklistPendingRef.current) return;
    void runAction(task, () => taskService.updateStatus(task.id, task.rowVersion, status), message);
  };
  const remove = () => {
    if (pending || checklistPendingRef.current) return;
    if (window.confirm(`Excluir a tarefa “${task.title}”?`)) {
      void runAction(task, () => taskService.deleteTask(task.id, task.rowVersion), "Tarefa excluída.").then((outcome) => {
        if (outcome === "success") onDeleted?.();
      });
    }
  };
  const save = async (changes: UpdateTaskDTO) => {
    if (!editing || editConflict || pending || checklistPendingRef.current) return;
    const outcome = await runAction(task, () => taskService.updateTask(task.id, editRowVersionRef.current, changes), "Tarefa atualizada.");
    if (outcome === "success") setEditing(false);
    if (outcome === "conflict") setEditConflict(true);
  };

  return (
    <article className={`panel task-card${task.status === 2 ? " task-card-complete" : ""}${task.priority === 2 ? " task-card-high" : ""}`}>
      <TaskBadges task={task} />
      <h2>{task.title}</h2>
      {editing ? (
        <TaskEditForm task={task} saving={actionPending} blocked={busy} conflict={editConflict} titleInputRef={editTitleRef} onCancel={() => { setEditing(false); setEditConflict(false); }} onSave={save} />
      ) : (
        <>
          <p>{task.description}</p>
          <div className="task-card-footer">
            <TaskMeta task={task} />
            <div className="task-actions">
              <button ref={editTriggerRef} type="button" className="button-secondary" disabled={busy} aria-label={`Editar tarefa ${task.title}`} onClick={() => { editRowVersionRef.current = task.rowVersion; setEditConflict(false); setEditing(true); }}>Editar</button>
              {task.status !== 0 && <button type="button" disabled={busy} aria-label={`Reabrir tarefa ${task.title}`} onClick={() => updateStatus(0, "Tarefa reaberta.")}>Reabrir</button>}
              {task.status === 0 && <button type="button" disabled={busy} aria-label={`Iniciar tarefa ${task.title}`} onClick={() => updateStatus(1, "Tarefa iniciada.")}>Iniciar</button>}
              {task.status !== 2 && <button type="button" className="button-success" disabled={busy} aria-label={`Concluir tarefa ${task.title}`} onClick={() => updateStatus(2, "Tarefa concluída.")}>Concluir</button>}
              <button type="button" className="button-danger" disabled={busy} aria-label={`Excluir tarefa ${task.title}`} onClick={remove}>Excluir</button>
            </div>
          </div>
          <button type="button" className="button-link" disabled={busy} aria-label={`${checklistOpen ? "Ocultar" : "Abrir"} checklist de ${task.title}`} aria-expanded={checklistOpen} aria-controls={`checklist-${task.id}`} onClick={() => setChecklistOpen((open) => !open)}>{checklistOpen ? "Ocultar checklist" : "Abrir checklist"}</button>
          <div id={`checklist-${task.id}`} hidden={!checklistOpen}>
            {checklistOpen && <SubtaskList taskId={task.id} taskTitle={task.title} taskRowVersion={task.rowVersion} disabled={pending} onChange={onChecklistChanged} onPendingChange={onChecklistPendingChange} />}
          </div>
        </>
      )}
    </article>
  );
}
