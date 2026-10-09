import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../src/app/App";
import { taskService } from "../src/features/tasks/api/taskService";
import { TaskDetailPage } from "../src/features/tasks/pages/TaskDetailPage";
import { userService } from "../src/features/people/api/userService";
import type { DueSummary, PagedTasks, Subtask, Task } from "../src/features/tasks/types";
import type { PagedUsers, User } from "../src/features/people/types";

vi.mock("../src/features/tasks/api/taskService", () => ({ taskService: {
  searchTasks: vi.fn(), getTask: vi.fn(), getDueSummary: vi.fn(), createTask: vi.fn(), updateTask: vi.fn(),
  updateStatus: vi.fn(), deleteTask: vi.fn(), getSubtasks: vi.fn(), createSubtask: vi.fn(),
  updateSubtask: vi.fn(), deleteSubtask: vi.fn(),
} }));
vi.mock("../src/features/people/api/userService", () => ({ userService: {
  searchUsers: vi.fn(), getUser: vi.fn(), createUser: vi.fn(),
} }));

const user: User = { id: "11111111-1111-1111-1111-111111111111", name: "Ana Lima", email: "ana@example.com" };
const otherUser: User = { id: "33333333-3333-3333-3333-333333333333", name: "Bruno Silva", email: "bruno@example.com" };
const task: Task = {
  id: "22222222-2222-2222-2222-222222222222", title: "Revisar relatório", description: "Conferir números",
  createdAt: "2026-10-02T12:00:00Z", dueDate: null, status: 0, userId: user.id, userName: user.name,
  priority: 1, rowVersion: "AQIDBAUGBwg=",
};

function taskPage(items: Task[], extra: Partial<PagedTasks> = {}): PagedTasks {
  return { items, page: 1, pageSize: 10, totalCount: items.length, totalPages: items.length ? 1 : 0, ...extra };
}
function userPage(items: User[], extra: Partial<PagedUsers> = {}): PagedUsers {
  return { items, page: 1, pageSize: 20, totalCount: items.length, totalPages: items.length ? 1 : 0, ...extra };
}
function goTo(path: string) { window.history.replaceState(null, "", path); }
function axiosError(status: number) { return Object.assign(new Error("Request failed"), { isAxiosError: true, response: { status } }); }
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetAllMocks();
  goTo("/");
  vi.mocked(taskService.searchTasks).mockResolvedValue(taskPage([]));
  vi.mocked(taskService.getTask).mockResolvedValue(task);
  vi.mocked(taskService.getDueSummary).mockResolvedValue({ overdue: 1, today: 2, week: 3 } satisfies DueSummary);
  vi.mocked(taskService.createTask).mockResolvedValue(task);
  vi.mocked(taskService.getSubtasks).mockResolvedValue([]);
  vi.mocked(userService.searchUsers).mockResolvedValue(userPage([user]));
  vi.mocked(userService.getUser).mockImplementation(async (id) => id === otherUser.id ? otherUser : user);
  vi.mocked(userService.createUser).mockResolvedValue(otherUser);
});
afterEach(() => { cleanup(); vi.useRealTimers(); goTo("/"); });

test("resumo mostra indicadores e atalho para tarefas, com título da página", async () => {
  render(<App />);
  expect(await screen.findByText("Atrasadas")).toBeTruthy();
  expect(screen.getByText("1").textContent).toBe("1");
  expect(screen.getByRole("link", { name: /Ver tarefas/ }).getAttribute("href")).toBe("/tarefas");
  expect(taskService.searchTasks).not.toHaveBeenCalled();
  expect(userService.searchUsers).not.toHaveBeenCalled();
  expect(document.title).toBe("Resumo | Task Flow");
});

test("URL antiga da raiz migra filtros para tarefas e preserva a consulta", async () => {
  goTo(`/?q=relat%C3%B3rio&status=0&userId=${user.id}&sort=priorityDesc&page=2`);
  vi.mocked(taskService.searchTasks).mockResolvedValue(taskPage([task], { page: 2, totalCount: 11, totalPages: 2 }));
  render(<App />);
  await screen.findByRole("link", { name: `Abrir tarefa ${task.title}` });
  expect(window.location.pathname).toBe("/tarefas");
  expect(window.location.search).toContain("q=relat%C3%B3rio");
  expect(taskService.searchTasks).toHaveBeenCalledWith(expect.objectContaining({ q: "relatório", status: 0, userId: user.id, sort: "priorityDesc", page: 2 }));
  expect((screen.getByRole("searchbox", { name: "Buscar por título ou descrição" }) as HTMLInputElement).value).toBe("relatório");
  expect(screen.getByRole("button", { name: /Ocultar filtros/ }).getAttribute("aria-expanded")).toBe("true");
});

test("filtros recolhíveis, paginação e voltar do navegador restauram a URL", async () => {
  goTo("/tarefas");
  vi.mocked(taskService.searchTasks).mockImplementation(async (query) => taskPage([task], { page: query.page, totalCount: 11, totalPages: 2 }));
  render(<App />);
  const interaction = userEvent.setup();
  await screen.findByRole("link", { name: `Abrir tarefa ${task.title}` });
  expect(screen.queryByRole("combobox", { name: "Estado" })).toBeNull();
  await interaction.click(screen.getByRole("button", { name: "Mais filtros" }));
  await interaction.type(screen.getByRole("searchbox", { name: "Buscar por título ou descrição" }), "relatório");
  await interaction.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "0");
  await interaction.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  expect(window.location.search).toContain("q=relat%C3%B3rio");
  expect(window.location.search).toContain("status=0");
  await interaction.click(screen.getByRole("button", { name: "Próxima" }));
  await waitFor(() => expect(window.location.search).toContain("page=2"));
  await act(async () => {
    goTo("/tarefas?q=voltar&sort=dueAsc");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await waitFor(() => expect(taskService.searchTasks).toHaveBeenCalledWith(expect.objectContaining({ q: "voltar", sort: "dueAsc", page: 1 })));
  expect((screen.getByRole("searchbox", { name: "Buscar por título ou descrição" }) as HTMLInputElement).value).toBe("voltar");
});

test("lista compacta abre detalhe e volta para os mesmos filtros", async () => {
  goTo("/tarefas?q=relatorio&status=0");
  vi.mocked(taskService.searchTasks).mockResolvedValue(taskPage([task]));
  render(<App />);
  const interaction = userEvent.setup();
  await interaction.click(await screen.findByRole("link", { name: `Abrir tarefa ${task.title}` }));
  expect(window.location.pathname).toBe(`/tarefas/${task.id}`);
  expect(document.title).toBe("Detalhes da tarefa | Task Flow");
  expect(await screen.findByRole("button", { name: `Concluir tarefa ${task.title}` })).toBeTruthy();
  await interaction.click(screen.getByRole("link", { name: "← Voltar às tarefas" }));
  expect(window.location.pathname).toBe("/tarefas");
  expect(window.location.search).toContain("q=relatorio");
  expect(window.location.search).toContain("status=0");
});

test("criação de responsável mantém o rascunho e seleciona a pessoa criada", async () => {
  goTo("/tarefas/nova");
  render(<App />);
  const interaction = userEvent.setup();
  await interaction.type(screen.getByRole("textbox", { name: "Título da tarefa" }), "Planejar entrega");
  await interaction.type(screen.getByRole("textbox", { name: "Descrição" }), "Revisar as etapas");
  await interaction.click(screen.getByRole("button", { name: "Cadastrar pessoa" }));
  const dialog = screen.getByRole("dialog", { name: "Cadastrar pessoa" });
  expect(document.activeElement).toBe(within(dialog).getByRole("textbox", { name: "Nome completo" }));
  await interaction.type(within(dialog).getByRole("textbox", { name: "Nome completo" }), otherUser.name);
  await interaction.type(within(dialog).getByRole("textbox", { name: "E-mail" }), otherUser.email);
  await interaction.click(within(dialog).getByRole("button", { name: "Cadastrar pessoa" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((screen.getByRole("textbox", { name: "Título da tarefa" }) as HTMLInputElement).value).toBe("Planejar entrega");
  expect((screen.getByRole("textbox", { name: "Descrição" }) as HTMLTextAreaElement).value).toBe("Revisar as etapas");
  expect((screen.getByRole("combobox", { name: "Responsável" }) as HTMLSelectElement).value).toBe(otherUser.id);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cadastrar pessoa" }));
  await interaction.click(screen.getByRole("button", { name: "Criar tarefa" }));
  await waitFor(() => expect(taskService.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: "Planejar entrega", description: "Revisar as etapas", userId: otherUser.id })));
  await waitFor(() => expect(window.location.pathname).toBe(`/tarefas/${task.id}`));
});

test("diálogo pode ser fechado com Escape e mantém o formulário", async () => {
  goTo("/tarefas/nova");
  render(<App />);
  const interaction = userEvent.setup();
  await interaction.type(screen.getByRole("textbox", { name: "Título da tarefa" }), "Rascunho");
  await interaction.click(screen.getByRole("button", { name: "Cadastrar pessoa" }));
  await interaction.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((screen.getByRole("textbox", { name: "Título da tarefa" }) as HTMLInputElement).value).toBe("Rascunho");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cadastrar pessoa" }));
});

test("ação de cadastrar pessoa no resumo navega para o formulário com foco", async () => {
  render(<App />);
  const interaction = userEvent.setup();
  const link = screen.getByRole("link", { name: "Cadastrar pessoa" });
  expect(link.getAttribute("href")).toBe("/pessoas?cadastrar=1");
  await interaction.click(link);
  expect(window.location.pathname + window.location.search).toBe("/pessoas?cadastrar=1");
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Nome completo" }));
});
test("link direto para cadastro de pessoa abre o formulário com foco e permite fechá-lo", async () => {
  goTo("/pessoas?cadastrar=1");
  render(<App />);
  const interaction = userEvent.setup();
  const name = screen.getByRole("textbox", { name: "Nome completo" });
  expect(document.activeElement).toBe(name);
  expect(screen.getByRole("button", { name: "Fechar cadastro" }).getAttribute("aria-expanded")).toBe("true");

  await interaction.click(screen.getByRole("button", { name: "Fechar cadastro" }));
  expect(window.location.search).toBe("");
  expect(screen.queryByRole("textbox", { name: "Nome completo" })).toBeNull();

  await interaction.click(screen.getByRole("button", { name: "Cadastrar pessoa" }));
  expect(window.location.search).toBe("?cadastrar=1");
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Nome completo" }));
});
test("diretório mantém cadastro recolhido até pedido e atualiza busca após criação", async () => {
  goTo("/pessoas");
  vi.mocked(userService.searchUsers).mockImplementation(async (q) => userPage(q ? [otherUser] : [user]));
  render(<App />);
  const interaction = userEvent.setup();
  await screen.findByText(user.email);
  expect(screen.queryByRole("textbox", { name: "Nome completo" })).toBeNull();
  await interaction.click(screen.getByRole("button", { name: /Cadastrar pessoa/ }));
  await interaction.type(screen.getByRole("textbox", { name: "Nome completo" }), otherUser.name);
  await interaction.type(screen.getByRole("textbox", { name: "E-mail" }), otherUser.email);
  await interaction.click(within(screen.getByRole("form", { name: "Cadastrar pessoa" })).getByRole("button", { name: "Cadastrar pessoa" }));
  await screen.findByText(otherUser.email);
  expect(screen.queryByRole("textbox", { name: "Nome completo" })).toBeNull();
  const notice = screen.getByText(`${otherUser.name} foi cadastrado.`);
  expect(document.activeElement).toBe(notice);
});

test("detalhe trata conflito atualizando a versão antes da nova tentativa", async () => {
  goTo(`/tarefas/${task.id}`);
  const refreshed = { ...task, rowVersion: "AQIDBAUGBwk=" };
  vi.mocked(taskService.getTask).mockResolvedValueOnce(task).mockResolvedValue(refreshed);
  vi.mocked(taskService.updateStatus).mockRejectedValueOnce(axiosError(409)).mockResolvedValueOnce();
  render(<App />);
  const interaction = userEvent.setup();
  await interaction.click(await screen.findByRole("button", { name: `Concluir tarefa ${task.title}` }));
  await waitFor(() => expect(taskService.getTask).toHaveBeenCalledTimes(2));
  expect((await screen.findByRole("alert")).textContent).toContain("alterada em outra sessão");
  await waitFor(() => expect((screen.getByRole("button", { name: `Concluir tarefa ${task.title}` }) as HTMLButtonElement).disabled).toBe(false));
  await interaction.click(screen.getByRole("button", { name: `Concluir tarefa ${task.title}` }));
  await waitFor(() => expect(taskService.updateStatus).toHaveBeenNthCalledWith(2, task.id, refreshed.rowVersion, 2));
});

test("conflito de edição preserva o rascunho sem sobrescrever outra sessão", async () => {
  goTo(`/tarefas/${task.id}`);
  const refreshed = { ...task, title: "Título alterado em outra sessão", description: "Descrição de outra sessão", rowVersion: "AQIDBAUGBwk=" };
  vi.mocked(taskService.getTask).mockResolvedValueOnce(task).mockResolvedValue(refreshed);
  vi.mocked(taskService.updateTask).mockRejectedValueOnce(axiosError(409)).mockResolvedValueOnce();
  render(<App />);
  const interaction = userEvent.setup();
  await interaction.click(await screen.findByRole("button", { name: `Editar tarefa ${task.title}` }));
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Título" }));
  await interaction.clear(screen.getByRole("textbox", { name: "Título" }));
  await interaction.type(screen.getByRole("textbox", { name: "Título" }), "Meu rascunho");
  await interaction.clear(screen.getByRole("textbox", { name: "Descrição" }));
  await interaction.type(screen.getByRole("textbox", { name: "Descrição" }), "Descrição ainda não salva");
  await interaction.click(screen.getByRole("button", { name: "Salvar alterações" }));
  await waitFor(() => expect(taskService.getTask).toHaveBeenCalledTimes(2));
  expect((await screen.findByRole("alert")).textContent).toContain("alterada em outra sessão");
  expect(vi.mocked(taskService.updateTask).mock.calls).toHaveLength(1);
  expect(taskService.updateTask).toHaveBeenNthCalledWith(1, task.id, task.rowVersion, expect.objectContaining({ title: "Meu rascunho", description: "Descrição ainda não salva" }));
  expect((screen.getByRole("textbox", { name: "Título" }) as HTMLInputElement).value).toBe("Meu rascunho");
  expect((screen.getByRole("textbox", { name: "Descrição" }) as HTMLTextAreaElement).value).toBe("Descrição ainda não salva");
  await waitFor(() => expect((screen.getByRole("button", { name: "Salvar alterações" }) as HTMLButtonElement).disabled).toBe(true));
  expect(screen.getByText(/Copie o que desejar antes de cancelar/)).toBeTruthy();
  await interaction.click(screen.getByRole("button", { name: "Salvar alterações" }));
  expect(taskService.updateTask).toHaveBeenCalledTimes(1);

  await interaction.click(screen.getByRole("button", { name: "Cancelar" }));
  await interaction.click(await screen.findByRole("button", { name: `Editar tarefa ${refreshed.title}` }));
  expect((screen.getByRole("textbox", { name: "Título" }) as HTMLInputElement).value).toBe(refreshed.title);
  expect((screen.getByRole("textbox", { name: "Descrição" }) as HTMLTextAreaElement).value).toBe(refreshed.description);
  await interaction.clear(screen.getByRole("textbox", { name: "Título" }));
  await interaction.type(screen.getByRole("textbox", { name: "Título" }), "Título conciliado");
  await interaction.click(screen.getByRole("button", { name: "Salvar alterações" }));
  await waitFor(() => expect(taskService.updateTask).toHaveBeenNthCalledWith(2, task.id, refreshed.rowVersion, expect.objectContaining({ title: "Título conciliado", description: refreshed.description })));
});

test("falha ao recarregar após conflito mantém o rascunho bloqueado até nova edição", async () => {
  goTo(`/tarefas/${task.id}`);
  const refreshed = { ...task, title: "Título recuperado", rowVersion: "AQIDBAUGBwk=" };
  vi.mocked(taskService.getTask).mockResolvedValueOnce(task).mockRejectedValueOnce(axiosError(500)).mockResolvedValue(refreshed);
  vi.mocked(taskService.updateTask).mockRejectedValueOnce(axiosError(409)).mockResolvedValueOnce();
  render(<App />);
  const interaction = userEvent.setup();
  await interaction.click(await screen.findByRole("button", { name: `Editar tarefa ${task.title}` }));
  await interaction.clear(screen.getByRole("textbox", { name: "Título" }));
  await interaction.type(screen.getByRole("textbox", { name: "Título" }), "Rascunho preservado");
  await interaction.click(screen.getByRole("button", { name: "Salvar alterações" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Falha ao carregar tarefa"));
  expect(screen.getByRole("alert").textContent).toContain("As ações ficam bloqueadas");
  expect((screen.getByRole("textbox", { name: "Título" }) as HTMLInputElement).value).toBe("Rascunho preservado");
  expect((screen.getByRole("button", { name: "Salvar alterações" }) as HTMLButtonElement).disabled).toBe(true);
  await interaction.click(screen.getByRole("button", { name: "Salvar alterações" }));
  expect(taskService.updateTask).toHaveBeenCalledTimes(1);
  await interaction.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" }).hasAttribute("disabled")).toBe(false));
  expect((screen.getByRole("textbox", { name: "Título" }) as HTMLInputElement).value).toBe("Rascunho preservado");
  expect((screen.getByRole("button", { name: "Salvar alterações" }) as HTMLButtonElement).disabled).toBe(true);
  expect(taskService.updateTask).toHaveBeenCalledTimes(1);
  await interaction.click(screen.getByRole("button", { name: "Cancelar" }));
  await interaction.click(screen.getByRole("button", { name: `Editar tarefa ${refreshed.title}` }));
  expect((screen.getByRole("textbox", { name: "Título" }) as HTMLInputElement).value).toBe(refreshed.title);
});

test("conflito de estado com recarga falha mantém ações bloqueadas até retry", async () => {
  goTo(`/tarefas/${task.id}`);
  const refreshed = { ...task, rowVersion: "AQIDBAUGBwk=" };
  vi.mocked(taskService.getTask).mockResolvedValueOnce(task).mockRejectedValueOnce(axiosError(500)).mockResolvedValue(refreshed);
  vi.mocked(taskService.updateStatus).mockRejectedValueOnce(axiosError(409)).mockResolvedValueOnce();
  render(<App />);
  const interaction = userEvent.setup();
  await interaction.click(await screen.findByRole("button", { name: `Concluir tarefa ${task.title}` }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Falha ao carregar tarefa"));
  const complete = screen.getByRole("button", { name: `Concluir tarefa ${task.title}` });
  expect((complete as HTMLButtonElement).disabled).toBe(true);
  await interaction.click(complete);
  expect(taskService.updateStatus).toHaveBeenCalledTimes(1);
  await interaction.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await waitFor(() => expect((complete as HTMLButtonElement).disabled).toBe(false));
  await interaction.click(complete);
  await waitFor(() => expect(taskService.updateStatus).toHaveBeenNthCalledWith(2, task.id, refreshed.rowVersion, 2));
});

test("recarga 404 após conflito remove a tarefa obsoleta e oferece retorno", async () => {
  goTo(`/tarefas/${task.id}`);
  vi.mocked(taskService.getTask).mockResolvedValueOnce(task).mockRejectedValueOnce(axiosError(404));
  vi.mocked(taskService.updateStatus).mockRejectedValueOnce(axiosError(409));
  render(<App />);
  const interaction = userEvent.setup();
  await interaction.click(await screen.findByRole("button", { name: `Concluir tarefa ${task.title}` }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Tarefa não encontrada"));
  expect(screen.queryByRole("button", { name: `Concluir tarefa ${task.title}` })).toBeNull();
  expect(screen.getByRole("link", { name: "Ver lista de tarefas" }).getAttribute("href")).toBe("/tarefas");
});

test("troca de taskId seguida de erro não mostra ações da tarefa anterior", async () => {
  goTo(`/tarefas/${task.id}`);
  const anotherTaskId = "44444444-4444-4444-4444-444444444444";
  vi.mocked(taskService.getTask).mockImplementation(async (id) => {
    if (id === task.id) return task;
    throw axiosError(500);
  });
  const view = render(<BrowserRouter><TaskDetailPage taskId={task.id} /></BrowserRouter>);
  await screen.findByRole("button", { name: `Concluir tarefa ${task.title}` });
  view.rerender(<BrowserRouter><TaskDetailPage taskId={anotherTaskId} /></BrowserRouter>);
  expect(screen.queryByRole("button", { name: `Concluir tarefa ${task.title}` })).toBeNull();
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Falha ao carregar tarefa"));
  expect(screen.getByRole("link", { name: "Ver lista de tarefas" })).toBeTruthy();
});

test("detalhe mostra tarefa removida com caminho de retorno", async () => {
  goTo(`/tarefas/${task.id}`);
  vi.mocked(taskService.getTask).mockRejectedValue(axiosError(404));
  render(<App />);
  expect((await screen.findByRole("alert")).textContent).toContain("Tarefa não encontrada");
  expect(screen.getByRole("link", { name: "Ver lista de tarefas" }).getAttribute("href")).toBe("/tarefas");
});

test("exclusão no detalhe retorna à lista com seus filtros", async () => {
  goTo(`/tarefas/${task.id}?from=%3Fq%3Drelatorio`);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.mocked(taskService.deleteTask).mockResolvedValue();
  render(<App />);
  const interaction = userEvent.setup();
  await interaction.click(await screen.findByRole("button", { name: `Excluir tarefa ${task.title}` }));
  await waitFor(() => expect(taskService.deleteTask).toHaveBeenCalledWith(task.id, task.rowVersion));
  await waitFor(() => expect(window.location.pathname).toBe("/tarefas"));
  expect(window.location.search).toBe("?q=relatorio");
  vi.restoreAllMocks();
});

test("checklist no detalhe usa a versão atualizada após criar uma subtarefa", async () => {
  goTo(`/tarefas/${task.id}`);
  const item: Subtask = { id: "55555555-5555-5555-5555-555555555555", taskId: task.id, title: "Conferir tabelas", isCompleted: false, createdAt: task.createdAt };
  const refreshed = { ...task, rowVersion: "AQIDBAUGBwk=" };
  let subtasks: Subtask[] = [];
  vi.mocked(taskService.getTask).mockResolvedValueOnce(task).mockResolvedValue(refreshed);
  vi.mocked(taskService.getSubtasks).mockImplementation(async () => [...subtasks]);
  vi.mocked(taskService.createSubtask).mockImplementation(async () => { subtasks = [item]; return item; });
  vi.mocked(taskService.updateSubtask).mockImplementation(async (_id, _sid, _version, changes) => {
    subtasks = subtasks.map((subtask) => ({ ...subtask, ...changes }));
  });
  render(<App />);
  const interaction = userEvent.setup();
  await interaction.click(await screen.findByRole("button", { name: `Abrir checklist de ${task.title}` }));
  await interaction.type(screen.getByRole("textbox", { name: "Nova subtarefa" }), item.title);
  await interaction.click(screen.getByRole("button", { name: "Adicionar" }));
  await screen.findByText("0 de 1 concluídas");
  await waitFor(() => expect(taskService.getTask).toHaveBeenCalledTimes(2));
  await interaction.click(screen.getByRole("checkbox", { name: item.title }));
  await screen.findByText("1 de 1 concluídas");
  expect(taskService.createSubtask).toHaveBeenCalledWith(task.id, task.rowVersion, item.title);
  expect(taskService.updateSubtask).toHaveBeenCalledWith(task.id, item.id, refreshed.rowVersion, { isCompleted: true });
});

test("conflito ao editar subtarefa preserva rascunho sem sobrescrever outra sessão", async () => {
  goTo(`/tarefas/${task.id}`);
  const item: Subtask = { id: "55555555-5555-5555-5555-555555555555", taskId: task.id,
    title: "Conferir tabelas", isCompleted: false, createdAt: task.createdAt };
  const changed = { ...item, title: "Conferir valores atualizados" };
  const refreshed = { ...task, rowVersion: "AQIDBAUGBwk=" };
  let reads = 0;
  vi.mocked(taskService.getTask).mockResolvedValueOnce(task).mockResolvedValue(refreshed);
  vi.mocked(taskService.getSubtasks).mockImplementation(async () => ++reads === 1 ? [item] : [changed]);
  vi.mocked(taskService.updateSubtask).mockRejectedValueOnce(axiosError(409)).mockResolvedValueOnce();
  render(<App />);
  const interaction = userEvent.setup();
  await interaction.click(await screen.findByRole("button", { name: `Abrir checklist de ${task.title}` }));
  await interaction.click(await screen.findByRole("button", { name: `Editar subtarefa ${item.title}` }));
  await interaction.clear(screen.getByRole("textbox", { name: "Editar subtarefa" }));
  await interaction.type(screen.getByRole("textbox", { name: "Editar subtarefa" }), "Meu rascunho");
  await interaction.click(screen.getByRole("button", { name: "Salvar", exact: true }));
  await waitFor(() => expect(taskService.getTask).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(taskService.getSubtasks).toHaveBeenCalledTimes(2));
  expect(taskService.updateSubtask).toHaveBeenNthCalledWith(1, task.id, item.id, task.rowVersion, { title: "Meu rascunho" });
  expect((screen.getByRole("textbox", { name: "Editar subtarefa" }) as HTMLInputElement).value).toBe("Meu rascunho");
  expect((screen.getByRole("button", { name: "Salvar", exact: true }) as HTMLButtonElement).disabled).toBe(true);
  await interaction.click(screen.getByRole("button", { name: "Salvar", exact: true }));
  expect(taskService.updateSubtask).toHaveBeenCalledTimes(1);

  await waitFor(() => expect((screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled).toBe(false));
  await interaction.click(screen.getByRole("button", { name: "Cancelar" }));
  await interaction.click(screen.getByRole("button", { name: `Editar subtarefa ${changed.title}` }));
  expect((screen.getByRole("textbox", { name: "Editar subtarefa" }) as HTMLInputElement).value).toBe(changed.title);
  await interaction.clear(screen.getByRole("textbox", { name: "Editar subtarefa" }));
  await interaction.type(screen.getByRole("textbox", { name: "Editar subtarefa" }), "Título conciliado");
  await interaction.click(screen.getByRole("button", { name: "Salvar", exact: true }));
  await waitFor(() => expect(taskService.updateSubtask).toHaveBeenNthCalledWith(2, task.id, item.id, refreshed.rowVersion, { title: "Título conciliado" }));
});

test("ação da tarefa espera a mutação da checklist e a recarga da versão", async () => {
  goTo(`/tarefas/${task.id}`);
  const item: Subtask = { id: "55555555-5555-5555-5555-555555555555", taskId: task.id, title: "Conferir tabelas", isCompleted: false, createdAt: task.createdAt };
  const create = deferred<Subtask>();
  const reload = deferred<Task>();
  const refreshed = { ...task, rowVersion: "AQIDBAUGBwk=" };
  vi.mocked(taskService.getTask).mockResolvedValueOnce(task).mockImplementation(() => reload.promise);
  vi.mocked(taskService.createSubtask).mockImplementation(() => create.promise);
  vi.mocked(taskService.updateStatus).mockResolvedValue();
  render(<App />);
  const interaction = userEvent.setup();
  await interaction.click(await screen.findByRole("button", { name: `Abrir checklist de ${task.title}` }));
  await interaction.type(screen.getByRole("textbox", { name: "Nova subtarefa" }), item.title);
  await interaction.click(screen.getByRole("button", { name: "Adicionar" }));
  await waitFor(() => expect(taskService.createSubtask).toHaveBeenCalledTimes(1));
  const complete = screen.getByRole("button", { name: `Concluir tarefa ${task.title}` });
  expect((complete as HTMLButtonElement).disabled).toBe(true);
  await interaction.click(complete);
  expect(taskService.updateStatus).not.toHaveBeenCalled();
  await act(async () => { create.resolve(item); await create.promise; });
  await waitFor(() => expect(taskService.getTask).toHaveBeenCalledTimes(2));
  expect((complete as HTMLButtonElement).disabled).toBe(true);
  await act(async () => { reload.resolve(refreshed); await reload.promise; });
  await waitFor(() => expect((complete as HTMLButtonElement).disabled).toBe(false));
  await interaction.click(complete);
  await waitFor(() => expect(taskService.updateStatus).toHaveBeenCalledWith(task.id, refreshed.rowVersion, 2));
});

test("navegação entre seções atualiza título e foco do conteúdo", async () => {
  render(<App />);
  const interaction = userEvent.setup();
  const nav = screen.getByRole("navigation", { name: "Navegação principal" });
  await interaction.click(within(nav).getByRole("link", { name: "Tarefas" }));
  expect(window.location.pathname).toBe("/tarefas");
  expect(document.title).toBe("Tarefas | Task Flow");
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Tarefas", level: 1 }));

  await interaction.click(within(nav).getByRole("link", { name: "Pessoas" }));
  expect(window.location.pathname).toBe("/pessoas");
  expect(document.title).toBe("Pessoas | Task Flow");
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Pessoas", level: 1 }));

  await act(async () => {
    goTo("/tarefas-inexistente");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(await screen.findByRole("heading", { name: "Página não encontrada", level: 1 })).toBeTruthy();
  expect(document.title).toBe("Página não encontrada | Task Flow");
  expect(within(nav).getByRole("link", { name: "Tarefas" }).getAttribute("aria-current")).toBeNull();
});
