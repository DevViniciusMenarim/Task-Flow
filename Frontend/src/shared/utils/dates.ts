export function formatDueDate(value?: string | null): string {
  if (!value) return "Sem prazo";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Prazo inválido";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function toIsoDueDate(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // Date normalizes invalid calendar days and nonexistent local times during DST.
  return toDateTimeLocal(date.toISOString()) === value ? date.toISOString() : null;
}

export function localDayStart(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date.toISOString();
}

export function localDayAfter(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) return null;
  const date = new Date(year, month - 1, day + 1);
  return date.toISOString();
}
