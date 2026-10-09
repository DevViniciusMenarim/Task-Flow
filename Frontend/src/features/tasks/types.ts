export interface Task {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  dueDate?: string | null;
  status: number;
  userId: string;
  userName: string;
  priority: 0 | 1 | 2;
  rowVersion: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface TaskSearch {
  q?: string;
  status?: number;
  userId?: string;
  priority?: number;
  dueFrom?: string;
  dueBefore?: string;
  activeOnly?: boolean;
  page: number;
  pageSize: number;
  sort: "createdDesc" | "dueAsc" | "dueDesc" | "priorityDesc";
}

export interface PagedTasks {
  items: Task[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface DueSummary {
  overdue: number;
  today: number;
  week: number;
}

export interface DueSummaryBounds {
  start: string;
  tomorrow: string;
  afterNextWeek: string;
}

export interface CreateTaskDTO {
  title: string;
  description: string;
  userId: string;
  dueDate?: string | null;
  priority?: 0 | 1 | 2;
}

export interface UpdateTaskDTO {
  title: string;
  description: string;
  dueDate: string | null;
  userId: string;
  priority: 0 | 1 | 2;
}
