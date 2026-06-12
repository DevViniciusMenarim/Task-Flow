import { api } from './api';
import type { User, CreateUserDTO } from '../types';

export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/Users');
    return response.data;
  },

  createUser: async (user: CreateUserDTO): Promise<User> => {
    const response = await api.post<User>('/Users', user);
    return response.data;
  }
};