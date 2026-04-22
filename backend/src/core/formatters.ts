import { AppError } from "./errors";

export function normalizeText(value: unknown, fallback = ""): string {
  const baseValue = value == null ? fallback : String(value);
  return baseValue.replace(/\s+/g, " ").trim();
}

export function canonicalTextKey(value: unknown, fallback = ""): string {
  let text = normalizeText(value, fallback);

  while (text.includes("Ãƒ") || text.includes("Ã‚")) {
    try {
      const decoded = Buffer.from(text, "latin1").toString("utf8");
      if (decoded === text) {
        break;
      }
      text = decoded;
    } catch {
      break;
    }
  }

  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeEmail(value: string): string {
  return normalizeText(value).toLowerCase();
}

export function onlyDigits(value: string): string {
  return String(value).replace(/\D/g, "");
}

export function normalizePhone(value: string): string {
  let digits = onlyDigits(value);

  while (digits.length > 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length !== 11) {
    throw new AppError("Telefone deve conter 11 digitos com DDD.");
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
