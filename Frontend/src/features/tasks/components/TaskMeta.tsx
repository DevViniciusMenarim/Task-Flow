import { formatDueDate } from "../../../shared/utils/dates";
import type { Task } from "../types";

export function TaskMeta({ task }: { task: Task }) {
  return (
    <div className="task-meta">
      <span><strong>Responsável:</strong> {task.userName}</span>
      <span><strong>Prazo:</strong> {task.dueDate ? <time dateTime={task.dueDate}>{formatDueDate(task.dueDate)}</time> : "Sem prazo"}</span>
    </div>
  );
}
