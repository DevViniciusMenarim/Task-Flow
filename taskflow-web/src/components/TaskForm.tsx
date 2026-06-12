import { useState, useEffect } from "react";
import { userService } from "../services/userService";
import { taskService } from "../services/taskService";
import type { User, CreateTaskDTO } from "../types";

interface TaskFormProps {
  onTaskCreated: () => void;
}

export function TaskForm({ onTaskCreated }: TaskFormProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    userService.getAllUsers().then(setUsers).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      alert("Por favor, selecione um usuário!");
      return;
    }

    const newTask: CreateTaskDTO = {
      title,
      description,
      userId,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    };

    try {
      await taskService.createTask(newTask);

      // Limpa o formulário
      setTitle("");
      setDescription("");
      setDueDate("");

      onTaskCreated();
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      alert("Erro ao criar tarefa. Verifique o terminal/console.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Nova Tarefa</h3>

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <input
          required
          type="text"
          placeholder="Título da tarefa"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 1, padding: "8px" }}
        />
        <select
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ flex: 1, padding: "8px" }}
        >
          <option value="">Selecione um Usuário...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <input
          required
          type="text"
          placeholder="Descrição rápida"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ flex: 2, padding: "8px" }}
        />
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ flex: 1, padding: "8px" }}
        />
      </div>

      <button
        type="submit"
        style={{
          background: "#28a745",
          color: "#fff",
          border: "none",
          padding: "10px 15px",
          borderRadius: "5px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        + Adicionar Tarefa
      </button>
    </form>
  );
}
