import { useRef, useState } from "react";
import axios from "axios";
import { getApiErrorMessage } from "../../../shared/api/client";
import type { Task } from "../types";

export type ActionResult = "success" | "conflict" | "error";

export function useTaskActions(refresh: () => void) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const pendingRef = useRef(new Set<string>());
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const runAction = async (task: Task, action: () => Promise<void>, successMessage: string): Promise<ActionResult> => {
    if (pendingRef.current.has(task.id)) return "error";
    pendingRef.current = new Set(pendingRef.current).add(task.id);
    setPendingIds(pendingRef.current);
    setActionError(null);
    setActionMessage(null);
    try {
      await action();
      setActionMessage(successMessage);
      refresh();
      return "success";
    } catch (failure) {
      if (axios.isAxiosError(failure) && failure.response?.status === 409) {
        setActionError("A tarefa foi alterada em outra sessão. Aguarde a atualização e revise os dados antes de tentar novamente.");
        refresh();
        return "conflict";
      }
      setActionError(getApiErrorMessage(failure, "Falha ao atualizar a tarefa.", {
        notFound: "Tarefa não encontrada. Atualize a lista e tente novamente.",
      }));
      if (axios.isAxiosError(failure) && failure.response?.status === 404) refresh();
      return "error";
    } finally {
      const next = new Set(pendingRef.current);
      next.delete(task.id);
      pendingRef.current = next;
      setPendingIds(next);
    }
  };

  return { pendingIds, actionError, actionMessage, runAction };
}
