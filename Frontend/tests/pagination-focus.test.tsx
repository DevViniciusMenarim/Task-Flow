import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../src/app/App";
import { UserPicker } from "../src/features/people/components/UserPicker";
import { taskService } from "../src/features/tasks/api/taskService";
import { userService } from "../src/features/people/api/userService";
import type { PagedTasks, Task } from "../src/features/tasks/types";
import type { PagedUsers, User } from "../src/features/people/types";

vi.mock("../src/features/tasks/api/taskService", () => ({ taskService: {
  searchTasks: vi.fn(), getTask: vi.fn(), getDueSummary: vi.fn(), createTask: vi.fn(),
  updateTask: vi.fn(), updateStatus: vi.fn(), deleteTask: vi.fn(), getSubtasks: vi.fn(),
  createSubtask: vi.fn(), updateSubtask: vi.fn(), deleteSubtask: vi.fn(),
} }));
vi.mock("../src/features/people/api/userService", () => ({ userService: {
  searchUsers: vi.fn(), getUser: vi.fn(), createUser: vi.fn(),
} }));

const user: User = { id: "11111111-1111-1111-1111-111111111111", name: "Ana Lima", email: "ana@example.com" };
const otherUser: User = { id: "33333333-3333-3333-3333-333333333333", name: "Bruno Silva", email: "bruno@example.com" };
const task: Task = {
  id: "22222222-2222-2222-2222-222222222222", title: "Revisar relatório", description: "Conferir números",
  createdAt: "2026-10-02T12:00:00Z", dueDate: null, status: 0, userId: user.id,
  userName: user.name, priority: 1, rowVersion: "AQIDBAUGBwg=",
};
function tasks(page: number): PagedTasks {
  return { items: [task], page, pageSize: 10, totalCount: 11, totalPages: 2 };
}
function people(page: number): PagedUsers {
  return { items: [page === 1 ? user : otherUser], page, pageSize: 20, totalCount: 21, totalPages: 2 };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, "", "/");
  vi.mocked(taskService.searchTasks).mockResolvedValue(tasks(1));
  vi.mocked(userService.searchUsers).mockResolvedValue(people(1));
  vi.mocked(userService.createUser).mockResolvedValue(otherUser);
});
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

test("paginação de tarefas mantém o botão focado durante a nova página", async () => {
  window.history.replaceState(null, "", "/tarefas");
  const second = deferred<PagedTasks>();
  vi.mocked(taskService.searchTasks).mockImplementation(async (search) => search.page === 2 ? second.promise : tasks(1));
  render(<App />);
  const interaction = userEvent.setup();
  const next = await screen.findByRole("button", { name: "Próxima" });
  await interaction.click(next);
  await waitFor(() => expect(taskService.searchTasks).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));
  expect(screen.getByText("Carregando tarefas...")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Próxima" })).toBe(next);
  expect(document.activeElement).toBe(next);
  expect(next.getAttribute("aria-disabled")).toBe("true");
  await interaction.click(next);
  expect(taskService.searchTasks).toHaveBeenCalledTimes(2);
  await act(async () => { second.resolve(tasks(2)); await second.promise; });
  await waitFor(() => expect(screen.queryByText("Carregando tarefas...")).toBeNull());
  expect(document.activeElement).toBe(next);
});

test("nova busca não reutiliza paginação da consulta anterior", async () => {
  window.history.replaceState(null, "", "/tarefas");
  const filtered = deferred<PagedTasks>();
  vi.mocked(taskService.searchTasks).mockImplementation(async (search) => search.q === "nova" ? filtered.promise : tasks(1));
  render(<App />);
  const interaction = userEvent.setup();
  await screen.findByRole("navigation", { name: "Páginas de tarefas" });
  await interaction.type(screen.getByRole("searchbox", { name: "Buscar por título ou descrição" }), "nova");
  await interaction.click(screen.getByRole("button", { name: "Buscar" }));
  await waitFor(() => expect(taskService.searchTasks).toHaveBeenCalledWith(expect.objectContaining({ q: "nova" })));
  expect(screen.queryByRole("navigation", { name: "Páginas de tarefas" })).toBeNull();
  await act(async () => { filtered.resolve({ ...tasks(1), totalCount: 1, totalPages: 1 }); await filtered.promise; });
  expect(await screen.findByRole("navigation", { name: "Páginas de tarefas" })).toBeTruthy();
});

test("nova busca de pessoas e do seletor não mostram paginação antiga", async () => {
  window.history.replaceState(null, "", "/pessoas");
  const filtered = deferred<PagedUsers>();
  vi.mocked(userService.searchUsers).mockImplementation(async (q) => q === "Bruno" ? filtered.promise : people(1));
  const view = render(<App />);
  const interaction = userEvent.setup();
  await screen.findByRole("navigation", { name: "Páginas de pessoas" });
  await interaction.type(screen.getByRole("searchbox", { name: "Buscar por nome ou e-mail" }), "Bruno");
  await interaction.click(screen.getByRole("button", { name: "Buscar" }));
  await waitFor(() => expect(userService.searchUsers).toHaveBeenCalledWith("Bruno", 1));
  expect(screen.queryByRole("navigation", { name: "Páginas de pessoas" })).toBeNull();
  await act(async () => { filtered.resolve({ ...people(1), totalCount: 1, totalPages: 1 }); await filtered.promise; });
  view.unmount();

  const pickerResult = deferred<PagedUsers>();
  vi.mocked(userService.searchUsers).mockImplementation(async (q) => q === "Bruno" ? pickerResult.promise : people(1));
  render(<UserPicker label="Responsável" value="" onChange={() => {}} emptyLabel="Selecione" />);
  await screen.findByRole("button", { name: "Próxima página de responsável" });
  await interaction.type(screen.getByRole("searchbox", { name: "Buscar responsável" }), "Bruno");
  await waitFor(() => expect(userService.searchUsers).toHaveBeenCalledWith("Bruno", 1));
  expect(screen.queryByRole("button", { name: "Próxima página de responsável" })).toBeNull();
  await act(async () => { pickerResult.resolve({ ...people(1), totalCount: 1, totalPages: 1 }); await pickerResult.promise; });
});
