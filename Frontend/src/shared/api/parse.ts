export type Data = Record<string, unknown>;

export function object(value: unknown, label: string): Data {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Resposta de ${label} inválida.`);
  return value as Data;
}

export function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Resposta de ${label} inválida.`);
  return value;
}

export function count(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`Resposta de ${label} inválida.`);
  return value as number;
}

export function date(value: unknown, label: string): string {
  const text = string(value, label);
  if (Number.isNaN(Date.parse(text))) throw new Error(`Resposta de ${label} inválida.`);
  return text;
}

export function parsePage<T>(value: unknown, label: string, parseItem: (item: unknown) => T) {
  const data = object(value, label);
  if (!Array.isArray(data.items)) throw new Error(`Resposta de ${label} inválida.`);
  const page = count(data.page, label);
  const pageSize = count(data.pageSize, label);
  if (page < 1 || pageSize < 1) throw new Error(`Resposta de ${label} inválida.`);
  return {
    items: data.items.map(parseItem), page, pageSize,
    totalCount: count(data.totalCount, label), totalPages: count(data.totalPages, label),
  };
}
