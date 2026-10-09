import { TaskForm } from "../components/TaskForm";
import { AppLink } from "../../../shared/ui/AppLink";
import { PageHeading } from "../../../shared/ui/PageHeading";

export function NewTaskPage() {
  return (
    <div className="narrow-page">
      <AppLink className="back-link" to="/tarefas">← Voltar às tarefas</AppLink>
      <PageHeading eyebrow="Planejamento" title="Nova tarefa" description="Defina o trabalho, escolha um responsável e ajuste a prioridade ou o prazo." />
      <TaskForm />
    </div>
  );
}
