import { useRef, useState } from "react";
import type { Task, UpdateTaskDTO } from "../types";
import { toDateTimeLocal, toIsoDueDate } from "../../../shared/utils/dates";
import { UserPicker } from "../../people/components/UserPicker";

interface TaskEditFormProps {
  task: Task;
  saving: boolean;
  blocked: boolean;
  conflict: boolean;
  titleInputRef: React.Ref<HTMLInputElement>;
  onSave: (changes: UpdateTaskDTO) => Promise<void>;
  onCancel: () => void;
}

export function TaskEditForm({ task, saving, blocked, conflict, titleInputRef, onSave, onCancel }: TaskEditFormProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(toDateTimeLocal(task.dueDate));
  const [userId, setUserId] = useState(task.userId);
  const [priority, setPriority] = useState<0 | 1 | 2>(task.priority ?? 1);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const prefix = `edit-${task.id}`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current || blocked || conflict) return;
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const isoDueDate = toIsoDueDate(dueDate);
    if (!trimmedTitle || !trimmedDescription) {
      setError("Informe título e descrição.");
      return;
    }
    if (!userId) {
      setError("Selecione um responsável.");
      return;
    }
    if (dueDate && !isoDueDate) {
      setError("Informe um prazo válido.");
      return;
    }
    setError(null);
    submittingRef.current = true;
    try {
      await onSave({ title: trimmedTitle, description: trimmedDescription, dueDate: isoDueDate, userId, priority });
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <form className="task-edit form-grid" onSubmit={(event) => { void submit(event); }} aria-label={`Editar tarefa ${task.title}`}>
      <div className="form-field">
        <label htmlFor={`${prefix}-title`}>Título</label>
        <input ref={titleInputRef} id={`${prefix}-title`} required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <UserPicker label="Responsável" value={userId} selectedName={userId === task.userId ? task.userName : undefined} onChange={setUserId} emptyLabel="Selecione um responsável..." required />
      <div className="form-field">
        <label htmlFor={`${prefix}-description`}>Descrição</label>
        <textarea id={`${prefix}-description`} required maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <div className="form-field">
        <label htmlFor={`${prefix}-due`}>Prazo</label>
        <input id={`${prefix}-due`} type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      </div>
      <div className="form-field">
        <label htmlFor={`${prefix}-priority`}>Prioridade</label>
        <select id={`${prefix}-priority`} value={priority} onChange={(event) => setPriority(Number(event.target.value) as 0 | 1 | 2)}>
          <option value={0}>Baixa</option>
          <option value={1}>Normal</option>
          <option value={2}>Alta</option>
        </select>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {conflict && <p className="form-error" role="status">Seu rascunho não foi salvo. Copie o que desejar antes de cancelar e reabra a edição para revisar a tarefa atualizada.</p>}
      <div className="task-edit-actions">
        <button type="submit" disabled={blocked || conflict}>{saving ? "Salvando..." : "Salvar alterações"}</button>
        <button type="button" className="button-secondary" disabled={blocked} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
