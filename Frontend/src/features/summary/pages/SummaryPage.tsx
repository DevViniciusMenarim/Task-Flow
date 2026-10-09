import { useState } from "react";
import { useDueSummary } from "../../tasks/hooks/useTaskData";
import { AppLink } from "../../../shared/ui/AppLink";
import { TaskCreateLink } from "../../tasks/components/TaskCreateLink";
import { RetryButton } from "../../../shared/ui/RetryButton";

export function SummaryPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { summary, error } = useDueSummary(refreshKey);

  return (
    <div className="summary-page">
      <section className="page-intro" aria-labelledby="intro-title">
        <div className="intro-copy">
          <p className="eyebrow">Seu trabalho em movimento</p>
          <h1 id="intro-title" tabIndex={-1}>Organize o dia.<br /><span>Avance com clareza.</span></h1>
          <p className="intro-description">Acompanhe os prazos e encontre rapidamente o próximo passo.</p>
        </div>
      </section>
      <section className="panel summary-actions" aria-labelledby="summary-actions-title">
        <h2 id="summary-actions-title">Ações rápidas</h2>
        <div className="summary-action-grid">
          <TaskCreateLink />
          <AppLink className="button-secondary" to="/tarefas">Ver tarefas</AppLink>
          <AppLink className="button-primary" to="/pessoas?cadastrar=1">Cadastrar pessoa</AppLink>
          <AppLink className="button-secondary" to="/pessoas">Ver pessoas</AppLink>
        </div>
      </section>
      <section className="summary-content" aria-labelledby="summary-title">
        <div className="section-heading"><div><span className="section-kicker">Visão rápida</span><h2 id="summary-title">Prazos das tarefas ativas</h2></div></div>
        {!summary && !error && <p className="loading-state" role="status">Carregando prazos...</p>}
        {error && <div className="load-error" role="alert"><p>{error}</p><RetryButton onClick={() => setRefreshKey((key) => key + 1)} /></div>}
        <div className="due-stats">
          <div className="due-stat overdue"><span>Atrasadas</span><strong>{summary?.overdue ?? "—"}</strong></div>
          <div className="due-stat today"><span>Vencem hoje</span><strong>{summary?.today ?? "—"}</strong></div>
          <div className="due-stat week"><span>Próximos 7 dias</span><strong>{summary?.week ?? "—"}</strong></div>
        </div>
      </section>
    </div>
  );
}
