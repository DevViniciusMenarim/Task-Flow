import { api } from "./api";
import type { Task, CreateTaskDTO } from "../types";

export const taskService = {
  getAllTasks: async (): Promise<Task[]> => {
    const response = await api.get<Task[]>("/Tasks");
    return response.data;
  },

  createTask: async (task: CreateTaskDTO): Promise<Task> => {
    const response = await api.post<Task>("/Tasks", task);
    return response.data;
  },

  updateStatus: async (id: string, status: number): Promise<void> => {
    await api.patch(`/Tasks/${id}/status`, status, {
      headers: { "Content-Type": "application/json" },
    });
  },

  deleteTask: async (id: string): Promise<void> => {
    await api.delete(`/Tasks/${id}`);
  },
};
