import { useEffect, useState } from "react";
import type { User } from "../types";
import { userService } from "../services/userService";
import { UserForm } from "./UserForm";

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <UserForm onUserCreated={fetchUsers} />

      <h2>Usuários Cadastrados</h2>

      {users.length === 0 ? (
        <p>Nenhum usuário encontrado.</p>
      ) : (
        <ul style={{ listStyleType: "none", padding: 0, marginTop: "15px" }}>
          {users.map((user) => (
            <li
              key={user.id}
              style={{
                background: "#fff",
                padding: "10px",
                margin: "10px 0",
                borderRadius: "5px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <strong>Nome:</strong> {user.name} <br />
              <strong>E-mail:</strong> {user.email} <br />
              <small style={{ color: "#666" }}>
                ID: {user.id.substring(0, 8)}...
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
