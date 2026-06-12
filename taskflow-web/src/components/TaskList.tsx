import { useEffect, useState } from "react";
import type { Task } from "../types";
import { taskService } from "../services/taskService";
import { TaskForm } from "./TaskForm";

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const fetchTasks = async () => {
    try {
      const data = await taskService.getAllTasks();
      setTasks(data);
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // --- Ações do CRUD ---
  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
      await taskService.deleteTask(id);
      fetchTasks(); // Recarrega a lista
    }
  };

  const handleComplete = async (id: string) => {
    await taskService.updateStatus(id, 2);
    fetchTasks(); // Recarrega a lista
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Sem prazo";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "📌 Pendente";
      case 1:
        return "⚙️ Em Andamento";
      case 2:
        return "✅ Concluída";
      default:
        return "Desconhecido";
    }
  };

  return (
    <div style={{ padding: "20px", flex: 1 }}>
      <TaskForm onTaskCreated={fetchTasks} />

      <h2>Quadro de Tarefas</h2>

      {tasks.length === 0 ? (
        <p>Nenhuma tarefa encontrada.</p>
      ) : (
        <div style={{ display: "grid", gap: "15px", marginTop: "15px" }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                background: "#fff",
                padding: "15px",
                borderRadius: "8px",
                borderLeft:
                  task.status === 2 ? "5px solid #28a745" : "5px solid #007bff", // Fica verde se concluída
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                opacity: task.status === 2 ? 0.7 : 1,
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>
                {task.title}
              </h3>
              <p
                style={{
                  color: "#555",
                  marginBottom: "15px",
                  fontSize: "14px",
                }}
              >
                {task.description}
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "12px",
                  color: "#777",
                }}
              >
                <span>
                  <strong>Prazo:</strong> {formatDate(task.dueDate)} |{" "}
                  <span style={{ fontWeight: "bold" }}>
                    {getStatusText(task.status)}
                  </span>
                </span>

                {/* Botões de Ação */}
                <div>
                  {task.status !== 2 && (
                    <button
                      onClick={() => handleComplete(task.id)}
                      style={{
                        background: "#28a745",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        marginRight: "5px",
                      }}
                    >
                      ✓ Concluir
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(task.id)}
                    style={{
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
