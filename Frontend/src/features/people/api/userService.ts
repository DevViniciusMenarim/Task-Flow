import { api } from "../../../shared/api/client";
import type { User, CreateUserDTO, PagedUsers } from "../types";
import { parsePagedUsers, parseUser } from "./validate";

export const userService = {
  searchUsers: async (q: string, page: number, pageSize = 20): Promise<PagedUsers> => {
    const response = await api.get<unknown>("/Users/search", { params: { q, page, pageSize } });
    return parsePagedUsers(response.data);
  },

  getUser: async (id: string): Promise<User> => {
    const response = await api.get<unknown>(`/Users/${id}`);
    return parseUser(response.data);
  },

  createUser: async (user: CreateUserDTO): Promise<User> => {
    const response = await api.post<unknown>("/Users", user);
    return parseUser(response.data);
  },
};
