import type { DashboardData, UploadBatch } from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
export const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(url), options);
  const responseText = await response.text();
  let body: { detail?: string } | null = null;

  if (responseText) {
    try {
      body = JSON.parse(responseText) as { detail?: string };
    } catch {
      // Keep non-JSON responses readable (for example, a proxy's HTML 404 page).
    }
  }

  if (!response.ok) {
    throw new Error(body?.detail ?? `Request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ""})`);
  }

  if (!responseText) return undefined as T;
  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error("The server returned an invalid response. Please try again.");
  }
}

export const getUploads = () => request<UploadBatch[]>("/api/uploads");
export const getDashboard = (id: number, params: URLSearchParams) =>
  request<DashboardData>(`/api/dashboard/${id}?${params.toString()}`);
export const uploadWorkbook = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return request<UploadBatch>("/api/uploads", { method: "POST", body: form });
};
