import { useLocation } from "react-router";
import { AppLink } from "../../../shared/ui/AppLink";
import type { Task } from "../types";
import { TaskBadges } from "./TaskBadges";
import { TaskMeta } from "./TaskMeta";

export function TaskPreview({ task }: { task: Task }) {
  const from = useLocation().search;
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  const to = `/tarefas/${task.id}${params.size ? `?${params}` : ""}`;

  return (
    <article className={`panel task-preview${task.status === 2 ? " task-preview-complete" : ""}`}>
      <div className="task-preview-main">
        <TaskBadges task={task} />
        <h2><AppLink to={to}>{task.title}</AppLink></h2>
        <p>{task.description}</p>
        <TaskMeta task={task} />
      </div>
      <AppLink className="section-link" to={to} aria-label={`Abrir tarefa ${task.title}`}>Abrir tarefa <span aria-hidden="true">→</span></AppLink>
    </article>
  );
}


