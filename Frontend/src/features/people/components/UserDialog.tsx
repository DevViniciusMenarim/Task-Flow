import { useEffect, useRef } from "react";
import type { User } from "../types";
import { UserForm } from "./UserForm";

interface UserDialogProps {
  onClose: () => void;
  onCreated: (user: User) => void;
}

export function UserDialog({ onClose, onCreated }: UserDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    // jsdom does not implement showModal; browsers use the native modal top layer.
    if (typeof element.showModal === "function") element.showModal();
    else element.setAttribute("open", "");
    element.querySelector<HTMLInputElement>("#user-name")?.focus();
    return () => {
      if (typeof element.close === "function" && element.open) element.close();
      else element.removeAttribute("open");
    };
  }, []);

  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  return (
    <dialog ref={dialog} className="person-dialog" aria-label="Cadastrar pessoa" onCancel={handleCancel} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}>
      <div className="dialog-heading"><h2>Cadastrar pessoa</h2><button type="button" className="button-secondary" aria-label="Fechar cadastro de pessoa" onClick={onClose}>Fechar</button></div>
      <UserForm onUserCreated={onCreated} />
    </dialog>
  );
}
