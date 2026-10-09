import { useRef, useState } from "react";
import { getApiErrorMessage } from "../../../shared/api/client";
import { userService } from "../api/userService";
import type { CreateUserDTO, User } from "../types";

interface UserFormProps {
  onUserCreated: (user: User) => void;
}

export function UserForm({ onUserCreated }: UserFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const newUser: CreateUserDTO = { name: name.trim(), email: email.trim() };
    if (!newUser.name || !newUser.email) {
      setError("Informe nome e e-mail.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const created = await userService.createUser(newUser);
      onUserCreated(created);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Falha ao cadastrar pessoa.", {
        conflict: "Já existe uma pessoa com este e-mail.",
      }));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form className="panel form-panel user-create-form" aria-label="Cadastrar pessoa" onSubmit={handleSubmit}>
      <div className="form-stack">
        <label htmlFor="user-name">Nome completo</label>
        <input
          id="user-name"
          autoFocus
          required
          type="text"
          maxLength={100}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label htmlFor="user-email">E-mail</label>
        <input
          id="user-email"
          required
          type="email"
          maxLength={150}
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button-primary" disabled={submitting}>
        {submitting ? "Cadastrando..." : "Cadastrar pessoa"}
      </button>
    </form>
  );
}
