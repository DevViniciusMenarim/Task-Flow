import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { getApiErrorMessage } from "../../../shared/api/client";
import { taskService } from "../api/taskService";
import type { CreateTaskDTO } from "../types";
import type { User } from "../../people/types";
import { toIsoDueDate } from "../../../shared/utils/dates";
import { UserPicker } from "../../people/components/UserPicker";
import { UserDialog } from "../../people/components/UserDialog";

export function TaskForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState("");
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<0 | 1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userReloadKey, setUserReloadKey] = useState(0);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const userDialogTrigger = useRef<HTMLButtonElement>(null);
  const dialogWasOpen = useRef(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (dialogWasOpen.current && !userDialogOpen) userDialogTrigger.current?.focus();
    dialogWasOpen.current = userDialogOpen;
  }, [userDialogOpen]);

  const userCreated = (user: User) => {
    setCreatedUser(user);
    setUserId(user.id);
    setUserReloadKey((value) => value + 1);
    setUserDialogOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!userId) {
      setError("Selecione um responsável para a tarefa.");
      return;
    }

    const parsedDueDate = toIsoDueDate(dueDate);
    if (dueDate && !parsedDueDate) {
      setError("Informe um prazo válido.");
      return;
    }
    const newTask: CreateTaskDTO = {
      title: title.trim(),
      description: description.trim(),
      userId,
      dueDate: parsedDueDate,
      priority,
    };
    if (!newTask.title || !newTask.description) {
      setError("Informe título e descrição.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const created = await taskService.createTask(newTask);
      navigate(`/tarefas/${created.id}`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Falha ao criar tarefa.", {
        notFound: "Responsável não encontrado. Atualize a lista de pessoas.",
      }));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
    <form className="panel form-panel task-create-form" aria-label="Criar tarefa" onSubmit={handleSubmit}>
      <div className="form-intro"><h2>Dados da tarefa</h2></div>
      <div className="form-grid">
        <div className="form-field field-full">
          <label htmlFor="task-title">Título da tarefa</label>
          <input
            id="task-title"
            required
            type="text"
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <UserPicker label="Responsável" value={userId} selectedName={createdUser?.id === userId ? createdUser.name : undefined} onChange={setUserId} emptyLabel="Selecione um responsável..." reloadKey={userReloadKey} required />
        <div className="form-field field-full">
          <label htmlFor="task-description">Descrição</label>
          <textarea
            id="task-description"
            required
            value={description}
            maxLength={1000}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="task-due-date">Prazo (opcional)</label>
          <input
            id="task-due-date"
            type="datetime-local"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="task-priority">Prioridade</label>
          <select id="task-priority" value={priority} onChange={(event) => setPriority(Number(event.target.value) as 0 | 1 | 2)}>
            <option value={0}>Baixa</option>
            <option value={1}>Normal</option>
            <option value={2}>Alta</option>
          </select>
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-footer"><button ref={userDialogTrigger} className="button-secondary" type="button" onClick={() => setUserDialogOpen(true)}>Cadastrar pessoa</button><button type="submit" className="button-primary" disabled={submitting || !userId}>
        {submitting ? "Criando..." : "Criar tarefa"}
      </button></div>
    </form>
    {userDialogOpen && <UserDialog onClose={() => setUserDialogOpen(false)} onCreated={userCreated} />}
    </>
  );
}


