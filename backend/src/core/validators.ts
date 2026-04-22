import { BRAZILIAN_STATES } from "./constants";
import { AppError } from "./errors";
import { canonicalTextKey, normalizeText } from "./formatters";

const APP_TIMEZONE = "America/Fortaleza";
const APP_OFFSET = "-03:00";

export function requireFields(data: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = data[field];
    if (value == null) {
      throw new AppError(`Campo obrigatorio ausente: ${field}.`);
    }
    if (typeof value === "string" && normalizeText(value) === "") {
      throw new AppError(`Campo obrigatorio vazio: ${field}.`);
    }
  }
}

export function validateEnum(value: string, allowed: Set<string>, fieldName: string): string {
  const candidateKey = canonicalTextKey(value);
  for (const option of allowed) {
    if (canonicalTextKey(option) === candidateKey) {
      return option;
    }
  }
  throw new AppError(`Valor invalido para ${fieldName}.`);
}

export function parseDate(value: unknown, fieldName: string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  throw new AppError(`Data invalida para ${fieldName}. Use YYYY-MM-DD.`);
}

export function parseDateTime(value: unknown, fieldName: string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value !== "string") {
    throw new AppError(`Data/hora invalida para ${fieldName}. Use ISO 8601.`);
  }

  const normalized = value.trim().replace(/Z$/, "+00:00");

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T00:00:00${APP_OFFSET}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00${APP_OFFSET}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}${APP_OFFSET}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2})$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Data/hora invalida para ${fieldName}. Use ISO 8601.`);
  }

  return parsed.toISOString();
}

export function extractDatePart(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("Data invalida.");
  }

  return parsed.toISOString().slice(0, 10);
}

export function todayInAppTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
  }).format(new Date());
}

export function ensureNotFuture(value: string, fieldName: string) {
  if (value > todayInAppTimezone()) {
    throw new AppError(`${fieldName} nao pode estar no futuro.`);
  }
}

export function ensurePositiveNumber(value: unknown, fieldName: string): number {
  const number = Number(value);
  if (Number.isNaN(number)) {
    throw new AppError(`${fieldName} deve ser numerico.`);
  }
  if (number <= 0) {
    throw new AppError(`${fieldName} deve ser maior que zero.`);
  }
  return Math.round(number * 100) / 100;
}

export function validateState(value: string): string {
  const state = normalizeText(value).toUpperCase();
  if (!BRAZILIAN_STATES.has(state)) {
    throw new AppError("UF invalida.");
  }
  return state;
}

export function validateEmail(value: string) {
  const pattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!pattern.test(value)) {
    throw new AppError("E-mail invalido.");
  }
}

export function validatePassword(value: string) {
  if (!normalizeText(value)) {
    throw new AppError("Senha nao pode ser vazia.");
  }
  if (value.length < 8) {
    throw new AppError("Senha deve ter pelo menos 8 caracteres.");
  }
}
