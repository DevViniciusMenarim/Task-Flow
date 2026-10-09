import { count, date, object, parsePage, string } from "../../../shared/api/parse";
import type { DueSummary, PagedTasks, Subtask, Task } from "../types";

function rowVersion(value: unknown): string {
  const encoded = string(value, "tarefa");
  if (!/^[A-Za-z0-9+/]{11}=$/.test(encoded) || atob(encoded).length !== 8) {
    throw new Error("Resposta de tarefa inválida.");
  }
  return encoded;
}

export function parseTask(value: unknown): Task {
  const data = object(value, "tarefa");
  const status = count(data.status, "tarefa");
  const priority = count(data.priority, "tarefa");
  if (status > 2 || priority > 2) throw new Error("Resposta de tarefa inválida.");
  const dueDate = data.dueDate == null ? null : date(data.dueDate, "tarefa");
  return {
    id: string(data.id, "tarefa"),
    title: string(data.title, "tarefa"),
    description: string(data.description, "tarefa"),
    createdAt: date(data.createdAt, "tarefa"),
    dueDate,
    status,
    userId: string(data.userId, "tarefa"),
    userName: string(data.userName, "tarefa"),
    priority: priority as Task["priority"],
    rowVersion: rowVersion(data.rowVersion),
  };
}

export function parseSubtask(value: unknown): Subtask {
  const data = object(value, "subtarefa");
  if (typeof data.isCompleted !== "boolean") throw new Error("Resposta de subtarefa inválida.");
  return {
    id: string(data.id, "subtarefa"), taskId: string(data.taskId, "subtarefa"),
    title: string(data.title, "subtarefa"), isCompleted: data.isCompleted,
    createdAt: date(data.createdAt, "subtarefa"),
  };
}

export function parsePagedTasks(value: unknown): PagedTasks {
  return parsePage(value, "busca de tarefas", parseTask);
}

export function parseDueSummary(value: unknown): DueSummary {
  const data = object(value, "painel de prazos");
  return {
    overdue: count(data.overdue, "painel de prazos"),
    today: count(data.today, "painel de prazos"),
    week: count(data.week, "painel de prazos"),
  };
}
