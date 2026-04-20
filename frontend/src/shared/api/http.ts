const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.auth !== false && typeof window !== "undefined") {
    const token = window.localStorage.getItem("crm-token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new ApiError(
      payload.error ?? "Falha na comunicação com a API.",
      response.status,
      payload.details,
    );
  }

  return payload as T;
}
