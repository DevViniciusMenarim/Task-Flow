import axios from "axios";

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, ""),
});

interface ErrorMessages {
  badRequest?: string;
  notFound?: string;
  conflict?: string;
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
  messages: ErrorMessages = {},
): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return "Não foi possível conectar à API. Tente novamente.";

  switch (error.response.status) {
    case 400:
      return messages.badRequest ?? "Dados inválidos. Confira os campos e tente novamente.";
    case 404:
      return messages.notFound ?? "Registro não encontrado. Atualize a lista e tente novamente.";
    case 409:
      return messages.conflict ?? "A operação entrou em conflito com os dados atuais.";
    default:
      return fallback;
  }
}
