import type { DashboardData, UploadBatch } from "../types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const getUploads = () => request<UploadBatch[]>("/api/uploads");
export const getDashboard = (id: number, params: URLSearchParams) =>
  request<DashboardData>(`/api/dashboard/${id}?${params.toString()}`);
export const uploadWorkbook = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return request<UploadBatch>("/api/uploads", { method: "POST", body: form });
};
