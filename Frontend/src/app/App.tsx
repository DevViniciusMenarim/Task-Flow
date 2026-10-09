import { useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router";
import { TaskList } from "../features/tasks/components/TaskList";
import { UserList } from "../features/people/components/UserList";
import { AppLink } from "../shared/ui/AppLink";
import { readTaskQuery, taskQuerySearch } from "../features/tasks/hooks/useTaskQuery";
import { NewTaskPage } from "../features/tasks/pages/NewTaskPage";
import { SummaryPage } from "../features/summary/pages/SummaryPage";
import { TaskDetailPage } from "../features/tasks/pages/TaskDetailPage";

const taskQueryKeys = ["q", "status", "userId", "priority", "dueFrom", "dueTo", "sort", "page"];

function TaskDetailRoute() {
  const { taskId = "" } = useParams();
  return <TaskDetailPage key={taskId} taskId={taskId} />;
}

function NotFoundPage() {
  return <div className="narrow-page empty-state"><h1 tabIndex={-1}>Página não encontrada</h1><p>O endereço informado não existe.</p><AppLink to="/">Voltar ao resumo</AppLink></div>;
}

function AppContent() {
  const location = useLocation();
  const route = location.pathname;
  const taskId = /^\/tarefas\/([^/]+)$/.exec(route)?.[1] ?? null;
  const legacyTaskQuery = route === "/" && taskQueryKeys.some((key) => new URLSearchParams(location.search).has(key));
  const mainRef = useRef<HTMLElement>(null);
  const lastRoute = useRef(route);

  useEffect(() => {
    const title = route === "/" && !legacyTaskQuery ? "Resumo" : route === "/tarefas" || legacyTaskQuery ? "Tarefas" : route === "/tarefas/nova" ? "Nova tarefa" : route === "/pessoas" ? "Pessoas" : taskId ? "Detalhes da tarefa" : "Página não encontrada";
    document.title = title + " | Task Flow";
    if (lastRoute.current !== route) {
      const opensPersonForm = route === "/pessoas" && new URLSearchParams(location.search).get("cadastrar") === "1";
      if (!opensPersonForm) mainRef.current?.querySelector<HTMLElement>("h1")?.focus();
      if (window.scrollY > 0) window.scrollTo(0, 0);
      lastRoute.current = route;
    }
  }, [route, taskId, legacyTaskQuery, location.search]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="app-header">
        <div className="header-inner">
          <AppLink className="brand" to="/" aria-label="Task Flow, resumo">
            <span className="brand-mark" aria-hidden="true"><img src="/task-flow-icon.png" alt="" width="48" height="48" /></span>
            <span className="brand-copy"><strong>Task Flow</strong></span>
          </AppLink>
          <nav className="main-nav" aria-label="Navegação principal">
            <AppLink to="/" aria-current={route === "/" && !legacyTaskQuery ? "page" : undefined}>Resumo</AppLink>
            <AppLink to="/tarefas" aria-current={route === "/tarefas" || route === "/tarefas/nova" || taskId !== null || legacyTaskQuery ? "page" : undefined}>Tarefas</AppLink>
            <AppLink to="/pessoas" aria-current={route === "/pessoas" ? "page" : undefined}>Pessoas</AppLink>
          </nav>
        </div>
      </header>
      <main id="conteudo" ref={mainRef} className="page-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={legacyTaskQuery
            ? <Navigate to={"/tarefas" + taskQuerySearch(readTaskQuery(location.search))} replace />
            : <SummaryPage />} />
          <Route path="/tarefas" element={<TaskList />} />
          <Route path="/tarefas/nova" element={<NewTaskPage />} />
          <Route path="/tarefas/:taskId" element={<TaskDetailRoute />} />
          <Route path="/pessoas" element={<UserList />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return <BrowserRouter><AppContent /></BrowserRouter>;
}
