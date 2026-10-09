import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import type { TaskSearch } from "../types";
import { localDayAfter, localDayStart } from "../../../shared/utils/dates";

export interface TaskFilters {
  q: string;
  status: string;
  userId: string;
  priority: string;
  dueFrom: string;
  dueTo: string;
  sort: TaskSearch["sort"];
}

export interface TaskQuery {
  filters: TaskFilters;
  page: number;
}

export const emptyFilters: TaskFilters = {
  q: "", status: "", userId: "", priority: "", dueFrom: "", dueTo: "", sort: "createdDesc",
};

const keys = ["q", "status", "userId", "priority", "dueFrom", "dueTo", "sort", "page"];
const sorts: TaskSearch["sort"][] = ["createdDesc", "dueAsc", "dueDesc", "priorityDesc"];
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readTaskQuery(search: string): TaskQuery {
  const params = new URLSearchParams(search);
  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";
  const dueFrom = params.get("dueFrom") ?? "";
  const dueTo = params.get("dueTo") ?? "";
  const sort = params.get("sort") as TaskSearch["sort"] | null;
  const rawPage = params.get("page") ?? "1";
  const page = /^[1-9]\d*$/.test(rawPage) && Number(rawPage) <= 1_000_000 ? Number(rawPage) : 1;
  const cleanFrom = dueFrom && localDayStart(dueFrom) ? dueFrom : "";
  const cleanTo = dueTo && localDayAfter(dueTo) ? dueTo : "";
  return {
    filters: {
      q: (params.get("q") ?? "").trim().slice(0, 200),
      status: ["0", "1", "2"].includes(status) ? status : "",
      userId: guid.test(params.get("userId") ?? "") ? (params.get("userId") ?? "") : "",
      priority: ["0", "1", "2"].includes(priority) ? priority : "",
      dueFrom: cleanFrom,
      dueTo: cleanFrom && cleanTo && cleanFrom > cleanTo ? "" : cleanTo,
      sort: sort && sorts.includes(sort) ? sort : "createdDesc",
    },
    page,
  };
}

export function taskQuerySearch(query: TaskQuery, currentSearch = ""): string {
  const params = new URLSearchParams(currentSearch);
  for (const key of keys) params.delete(key);
  const { filters, page } = query;
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.dueFrom) params.set("dueFrom", filters.dueFrom);
  if (filters.dueTo) params.set("dueTo", filters.dueTo);
  if (filters.sort !== "createdDesc") params.set("sort", filters.sort);
  if (page !== 1) params.set("page", String(page));
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export function buildTaskSearch(query: TaskQuery): TaskSearch {
  const { filters, page } = query;
  return {
    q: filters.q || undefined,
    status: filters.status === "" ? undefined : Number(filters.status),
    userId: filters.userId || undefined,
    priority: filters.priority === "" ? undefined : Number(filters.priority),
    dueFrom: filters.dueFrom ? localDayStart(filters.dueFrom) ?? undefined : undefined,
    dueBefore: filters.dueTo ? localDayAfter(filters.dueTo) ?? undefined : undefined,
    sort: filters.sort, page, pageSize: 10,
  };
}

export function useTaskQuery() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => readTaskQuery(location.search), [location.search]);

  useEffect(() => {
    const canonical = taskQuerySearch(query, location.search);
    if (canonical !== location.search) {
      void navigate({ pathname: location.pathname, search: canonical, hash: location.hash }, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, query, navigate]);

  const updateQuery = useCallback((next: TaskQuery, replace = false) => {
    const search = taskQuerySearch(next, location.search);
    if (search !== location.search) {
      void navigate({ pathname: location.pathname, search, hash: location.hash }, { replace });
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  const applyFilters = useCallback((filters: TaskFilters) => updateQuery({ filters, page: 1 }), [updateQuery]);
  const goPage = useCallback((page: number) => updateQuery({ ...query, page }), [query, updateQuery]);
  const correctPage = useCallback((page: number) => updateQuery({ ...query, page }, true), [query, updateQuery]);
  return { query, applyFilters, goPage, correctPage };
}

