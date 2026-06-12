export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  dueDate?: string;
  status: number;
}

export interface CreateUserDTO {
  name: string;
  email: string;
}

export interface CreateTaskDTO {
  title: string;
  description: string;
  userId: string;
  dueDate?: string;
}
