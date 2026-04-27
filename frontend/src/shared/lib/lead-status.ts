function normalizeLeadStatus(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ÃƒÆ’Ã†â€™ÃƒÆ’Ã¢â‚¬Å¡]/g, "")
    .toLowerCase()
    .trim();
}

export type LeadStatusTone = "inactive" | "new" | "prospection" | "client" | "neutral";

export function getLeadStatusTone(value: string): LeadStatusTone {
  const normalized = normalizeLeadStatus(value);
  const lowered = value.toLowerCase();

  if (normalized.includes("inativo") || lowered.includes("inativo")) return "inactive";
  if (normalized.includes("cliente") || lowered.includes("cliente")) return "client";
  if (normalized.includes("novo") || lowered.includes("novo")) return "new";
  if (normalized.includes("prospec") || lowered.includes("prospec")) return "prospection";
  return "neutral";
}

export function getLeadStatusEmoji(value: string) {
  switch (getLeadStatusTone(value)) {
    case "inactive":
      return "\u{1F534}";
    case "new":
      return "\u{1F535}";
    case "prospection":
      return "\u{1F7E1}";
    case "client":
      return "\u{1F7E2}";
    default:
      return "\u{26AA}";
  }
}
