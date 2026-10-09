import type { Task } from "../types";

const statusNames = ["Pendente", "Em andamento", "Concluída"];
const priorityNames = ["Baixa", "Normal", "Alta"];

export function TaskBadges({ task }: { task: Task }) {
  return (
    <div className="task-badges">
      <span className={`status-badge status-${task.status}`}>{statusNames[task.status] ?? "Desconhecido"}</span>
      <span className={`priority-badge priority-${task.priority}`}>Prioridade {(priorityNames[task.priority] ?? "Normal").toLowerCase()}</span>
    </div>
  );
}
