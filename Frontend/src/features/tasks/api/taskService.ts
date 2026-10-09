import { api } from "../../../shared/api/client";
import type { Task, CreateTaskDTO, DueSummary, DueSummaryBounds, PagedTasks, Subtask, TaskSearch, UpdateTaskDTO } from "../types";
import { parseDueSummary, parsePagedTasks, parseSubtask, parseTask } from "./validate";

export const taskService = {
  searchTasks: async (search: TaskSearch): Promise<PagedTasks> => {
    const response = await api.get<unknown>("/Tasks/search", { params: search });
    return parsePagedTasks(response.data);
  },

  getTask: async (id: string): Promise<Task> => {
    const response = await api.get<unknown>(`/Tasks/${id}`);
    return parseTask(response.data);
  },

  getDueSummary: async (bounds: DueSummaryBounds): Promise<DueSummary> => {
    const response = await api.get<unknown>("/Tasks/due-summary", { params: bounds });
    return parseDueSummary(response.data);
  },

  createTask: async (task: CreateTaskDTO): Promise<Task> => {
    const response = await api.post<unknown>("/Tasks", task);
    return parseTask(response.data);
  },

  updateTask: async (id: string, rowVersion: string, task: UpdateTaskDTO): Promise<void> => {
    await api.put(`/Tasks/${id}`, task, { headers: { "If-Match": `"${rowVersion}"` } });
  },

  updateStatus: async (id: string, rowVersion: string, status: 0 | 1 | 2): Promise<void> => {
    await api.patch(`/Tasks/${id}/status`, status, {
      headers: { "Content-Type": "application/json", "If-Match": `"${rowVersion}"` },
    });
  },

  deleteTask: async (id: string, rowVersion: string): Promise<void> => {
    await api.delete(`/Tasks/${id}`, { headers: { "If-Match": `"${rowVersion}"` } });
  },

  getSubtasks: async (taskId: string): Promise<Subtask[]> => {
    const response = await api.get<unknown>(`/Tasks/${taskId}/subtasks`);
    if (!Array.isArray(response.data)) throw new Error("Resposta de subtarefas inválida.");
    return response.data.map(parseSubtask);
  },

  createSubtask: async (taskId: string, rowVersion: string, title: string): Promise<Subtask> => {
    const response = await api.post<unknown>(`/Tasks/${taskId}/subtasks`, { title }, {
      headers: { "If-Match": `"${rowVersion}"` },
    });
    return parseSubtask(response.data);
  },

  updateSubtask: async (taskId: string, subtaskId: string, rowVersion: string, changes: { title?: string; isCompleted?: boolean }): Promise<void> => {
    await api.patch(`/Tasks/${taskId}/subtasks/${subtaskId}`, changes, {
      headers: { "If-Match": `"${rowVersion}"` },
    });
  },

  deleteSubtask: async (taskId: string, subtaskId: string, rowVersion: string): Promise<void> => {
    await api.delete(`/Tasks/${taskId}/subtasks/${subtaskId}`, {
      headers: { "If-Match": `"${rowVersion}"` },
    });
  },
};
