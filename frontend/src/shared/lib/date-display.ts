function formatUtcDateParts(date: Date) {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return { year, month, day };
}

export function extractIsoDate(value?: string | null) {
  if (!value) return "";

  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const { year, month, day } = formatUtcDateParts(parsed);
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(value?: string | null) {
  const isoDate = extractIsoDate(value);
  if (!isoDate) {
    return value ? String(value) : "-";
  }

  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}
