import { object, parsePage, string } from "../../../shared/api/parse";
import type { PagedUsers, User } from "../types";

export function parseUser(value: unknown): User {
  const data = object(value, "usuário");
  return { id: string(data.id, "usuário"), name: string(data.name, "usuário"), email: string(data.email, "usuário") };
}

export function parsePagedUsers(value: unknown): PagedUsers {
  return parsePage(value, "busca de usuários", parseUser);
}
