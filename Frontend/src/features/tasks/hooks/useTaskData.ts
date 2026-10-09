import { useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage } from "../../../shared/api/client";
import { taskService } from "../api/taskService";
import type { DueSummary, DueSummaryBounds, PagedTasks } from "../types";
import { buildTaskSearch, type TaskQuery } from "./useTaskQuery";

export function localDueBounds(now = new Date()): DueSummaryBounds {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  return {
    start: new Date(year, month, day).toISOString(),
    tomorrow: new Date(year, month, day + 1).toISOString(),
    afterNextWeek: new Date(year, month, day + 8).toISOString(),
  };
}

export function useTaskResults(query: TaskQuery, refreshKey: number, onInvalidPage: (page: number) => void) {
  const [outcome, setOutcome] = useState<{ key: string; queryKey: string; result: PagedTasks | null; error: string | null } | null>(null);
  const [lastResult, setLastResult] = useState<{ scopeKey: string; result: PagedTasks } | null>(null);
  const requestId = useRef(0);
  const search = useMemo(() => buildTaskSearch(query), [query]);
  const scopeKey = JSON.stringify(query.filters);
  const queryKey = JSON.stringify(search);
  const key = JSON.stringify([queryKey, refreshKey]);

  useEffect(() => {
    const id = ++requestId.current;
    void taskService.searchTasks(search).then((data) => {
      if (id !== requestId.current) return;
      const correctedPage = data.totalPages === 0 ? 1 : Math.min(query.page, data.totalPages);
      if (query.page !== correctedPage) {
        onInvalidPage(correctedPage);
        return;
      }
      setOutcome({ key, queryKey, result: data, error: null });
      setLastResult({ scopeKey, result: data });
    }).catch((failure: unknown) => {
      if (id !== requestId.current) return;
      setOutcome({ key, queryKey, result: null, error: getApiErrorMessage(failure, "Falha ao carregar tarefas.") });
    });
    return () => { requestId.current += 1; };
  }, [search, query.page, queryKey, key, scopeKey, onInvalidPage]);

  const current = outcome?.key === key ? outcome : null;
  const display = current ?? (outcome?.queryKey === queryKey ? outcome : null);
  return { result: display?.result ?? null, lastResult: lastResult?.scopeKey === scopeKey ? lastResult.result : null, loading: !current, error: current?.error ?? null };
}

export function useDueSummary(refreshKey: number) {
  const [summary, setSummary] = useState<DueSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date();
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => { setClockTick((value) => value + 1); schedule(); }, Math.max(1, nextDay.getTime() - now.getTime() + 100));
    };
    const onVisible = () => { if (document.visibilityState === "visible") setClockTick((value) => value + 1); };
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    void taskService.getDueSummary(localDueBounds()).then((data) => {
      if (id !== requestId.current) return;
      setSummary(data);
      setError(null);
    }).catch((failure: unknown) => {
      if (id !== requestId.current) return;
      setSummary(null);
      setError(getApiErrorMessage(failure, "Falha ao carregar o painel de prazos."));
    });
    return () => { requestId.current += 1; };
  }, [refreshKey, clockTick]);

  return { summary, error };
}
