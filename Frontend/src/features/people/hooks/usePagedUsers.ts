import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { getApiErrorMessage } from "../../../shared/api/client";
import { userService } from "../api/userService";
import type { PagedUsers } from "../types";

interface Outcome {
  key: string;
  result: PagedUsers | null;
  error: string | null;
}

export function usePagedUsers(
  query: string,
  page: number,
  refreshKey: number | string,
  setPage: Dispatch<SetStateAction<number>>,
  fallbackError: string,
) {
  const normalizedQuery = query.trim();
  const key = JSON.stringify([normalizedQuery, page, refreshKey]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [lastResult, setLastResult] = useState<{ query: string; result: PagedUsers } | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    void userService.searchUsers(normalizedQuery, page).then((data) => {
      if (id !== requestId.current) return;
      const lastPage = Math.max(1, data.totalPages);
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setOutcome({ key, result: data, error: null });
      setLastResult({ query: normalizedQuery, result: data });
    }).catch((failure: unknown) => {
      if (id !== requestId.current) return;
      setOutcome({ key, result: null, error: getApiErrorMessage(failure, fallbackError) });
    });
    return () => { requestId.current += 1; };
  }, [key, normalizedQuery, page, setPage, fallbackError]);

  const current = outcome?.key === key ? outcome : null;
  return { result: current?.result ?? null, lastResult: lastResult?.query === normalizedQuery ? lastResult.result : null, loading: !current, error: current?.error ?? null };
}
