import { afterEach, expect, test, vi } from "vitest";
import { api } from "../src/shared/api/client";
import { taskService } from "../src/features/tasks/api/taskService";
import { userService } from "../src/features/people/api/userService";
import { parsePagedTasks, parseSubtask, parseTask } from "../src/features/tasks/api/validate";
import { parsePagedUsers } from "../src/features/people/api/validate";
import type { Task } from "../src/features/tasks/types";
import { toIsoDueDate } from "../src/shared/utils/dates";

const task: Task = {
  id: "22222222-2222-2222-2222-222222222222", title: "Revisar relatório", description: "Conferir números",
  createdAt: "2026-10-02T12:00:00Z", dueDate: null, status: 0,
  userId: "11111111-1111-1111-1111-111111111111", userName: "Ana Lima", priority: 1,
  rowVersion: "AQIDBAUGBwg=",
};
afterEach(() => vi.restoreAllMocks());

test("contrato de tarefa valida campos internos e versão Base64 de oito bytes", () => {
  expect(parseTask(task)).toEqual(task);
  expect(() => parseTask({ ...task, userName: null })).toThrow("Resposta de tarefa inválida.");
  expect(() => parseTask({ ...task, rowVersion: "AQIDBA==" })).toThrow("Resposta de tarefa inválida.");
  expect(() => parseTask({ ...task, status: 99 })).toThrow("Resposta de tarefa inválida.");
  expect(() => parseTask({ ...task, dueDate: "invalida" })).toThrow("Resposta de tarefa inválida.");
});

test("listas rejeitam itens internos e metadados inválidos", () => {
  const page = { items: [task], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 };
  expect(parsePagedTasks(page).items[0]).toEqual(task);
  expect(() => parsePagedTasks({ ...page, items: [{ id: task.id }] })).toThrow();
  expect(() => parsePagedTasks({ ...page, totalCount: -1 })).toThrow();
  expect(() => parsePagedUsers({ ...page, items: [{ id: "1", name: "Ana" }] })).toThrow();
  expect(() => parseSubtask({ id: "1", taskId: task.id, title: "Item", isCompleted: "false", createdAt: task.createdAt })).toThrow();
});

test("serviços rejeitam payloads malformados na fronteira HTTP", async () => {
  vi.spyOn(api, "get").mockResolvedValue({ data: { items: [{ ...task, rowVersion: "invalid" }], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 } });
  await expect(taskService.searchTasks({ page: 1, pageSize: 10, sort: "createdDesc" })).rejects.toThrow();
  vi.mocked(api.get).mockResolvedValueOnce({ data: { items: [{ id: "1" }], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 } });
  await expect(userService.searchUsers("", 1)).rejects.toThrow();
});

test("escritas enviam a versão entre aspas no If-Match", async () => {
  const post = vi.spyOn(api, "post").mockResolvedValue({ data: {
    id: "55555555-5555-5555-5555-555555555555", taskId: task.id,
    title: "Etapa", isCompleted: false, createdAt: task.createdAt,
  } });
  const put = vi.spyOn(api, "put").mockResolvedValue({ data: null });
  const patch = vi.spyOn(api, "patch").mockResolvedValue({ data: null });
  const remove = vi.spyOn(api, "delete").mockResolvedValue({ data: null });
  await taskService.updateTask(task.id, task.rowVersion, {
    title: task.title, description: task.description, dueDate: null, userId: task.userId, priority: 1,
  });
  await taskService.updateStatus(task.id, task.rowVersion, 2);
  await taskService.deleteTask(task.id, task.rowVersion);
  await taskService.createSubtask(task.id, task.rowVersion, "Etapa");
  await taskService.updateSubtask(task.id, "55555555-5555-5555-5555-555555555555", task.rowVersion, { isCompleted: true });
  await taskService.deleteSubtask(task.id, "55555555-5555-5555-5555-555555555555", task.rowVersion);
  expect(put).toHaveBeenCalledWith(`/Tasks/${task.id}`, expect.anything(), { headers: { "If-Match": `"${task.rowVersion}"` } });
  expect(patch).toHaveBeenCalledWith(`/Tasks/${task.id}/status`, 2, { headers: { "Content-Type": "application/json", "If-Match": `"${task.rowVersion}"` } });
  expect(remove).toHaveBeenCalledWith(`/Tasks/${task.id}`, { headers: { "If-Match": `"${task.rowVersion}"` } });
  expect(post).toHaveBeenCalledWith(`/Tasks/${task.id}/subtasks`, { title: "Etapa" }, { headers: { "If-Match": `"${task.rowVersion}"` } });
  expect(patch).toHaveBeenCalledWith(`/Tasks/${task.id}/subtasks/55555555-5555-5555-5555-555555555555`, { isCompleted: true }, { headers: { "If-Match": `"${task.rowVersion}"` } });
  expect(remove).toHaveBeenCalledWith(`/Tasks/${task.id}/subtasks/55555555-5555-5555-5555-555555555555`, { headers: { "If-Match": `"${task.rowVersion}"` } });
});

test("painel e busca de usuários usam endpoints agregados e paginados", async () => {
  const get = vi.spyOn(api, "get")
    .mockResolvedValueOnce({ data: { overdue: 1, today: 2, week: 3 } })
    .mockResolvedValueOnce({ data: { items: [{ id: task.userId, name: task.userName, email: "ana@example.com" }], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 } });
  const bounds = { start: "2026-10-02T00:00:00Z", tomorrow: "2026-10-03T00:00:00Z", afterNextWeek: "2026-10-10T00:00:00Z" };
  expect(await taskService.getDueSummary(bounds)).toEqual({ overdue: 1, today: 2, week: 3 });
  expect((await userService.searchUsers("Ana", 1)).items).toHaveLength(1);
  expect(get).toHaveBeenNthCalledWith(1, "/Tasks/due-summary", { params: bounds });
  expect(get).toHaveBeenNthCalledWith(2, "/Users/search", { params: { q: "Ana", page: 1, pageSize: 20 } });
});

test("prazo local rejeita dia inexistente e hora omitida pelo horário de verão", () => {
  const previousTimezone = process.env.TZ;
  try {
    process.env.TZ = "America/New_York";
    expect(toIsoDueDate("2026-02-31T10:00")).toBeNull();
    expect(toIsoDueDate("2026-03-08T02:30")).toBeNull();
    expect(toIsoDueDate("2026-03-08T03:30")).toBe("2026-03-08T07:30:00.000Z");
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});
