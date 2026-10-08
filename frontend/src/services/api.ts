import type { DashboardData, UploadBatch } from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
export const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(url), { credentials: "include", ...options });
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

export interface StoreProduct { id: number; item_name: string; current_price: number; available: boolean; }
export interface OrderLine { product_id: number; quantity: number; }
export interface OrderDraft { customer_name: string; customer_phone: string; pickup_at: string | null; items: OrderLine[]; }
export interface StoreOrder { id: number; public_code: string; customer_name: string; customer_phone: string; pickup_at: string | null; channel: string; status: string; payment_status: string; total: number; created_at: string; items: { product_name: string; quantity: number; unit_price: number; line_total: number }[]; }
export interface FeedbackSummary { responses: { id: number; product_name: string; rating: number; comment: string; source: string; created_at: string }[]; suggestions: { item: string; kind: string; title: string; detail: string }[]; total_responses: number; }

export const getRepeatDemand = (id: number) => request<{ upload_id: number; span_days: number; items: { item: string; transactions: number; active_days: number; sales_per_week: number; average_days_between_sales: number | null; last_sale_date: string }[] }>(`/api/analytics/repeat-demand/${id}`);
export const getStoreProducts = () => request<StoreProduct[]>("/api/store/products");
export const placeCustomerOrder = (order: OrderDraft) => request<StoreOrder>("/api/store/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) });
export const trackCustomerOrder = (code: string) => request<{ public_code: string; status: string; payment_status: string; pickup_at: string | null; total: number; items: { product_name: string; quantity: number; line_total: number }[] }>(`/api/store/orders/${encodeURIComponent(code)}`);
export const submitOrderFeedback = (code: string, feedback: { product_name: string; rating: number; comment: string }) => request<{ status: string }>(`/api/store/orders/${encodeURIComponent(code)}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(feedback) });
export const getStaffSession = () => request<{ username: string }>("/api/staff/session");
export const loginStaff = (username: string, password: string) => request<{ username: string }>("/api/staff/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
export const logoutStaff = () => request<{ status: string }>("/api/staff/logout", { method: "POST" });
export const getStaffProducts = () => request<StoreProduct[]>("/api/staff/products");
export const saveStaffProduct = (product: Omit<StoreProduct, "id">) => request<StoreProduct>("/api/staff/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(product) });
export const saveStaffProductsBulk = (products: (Omit<StoreProduct, "id"> & { id?: number })[]) => request<StoreProduct[]>("/api/staff/products/bulk", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products }) });
export const getStaffOrders = () => request<StoreOrder[]>("/api/staff/orders");
export const createStaffOrder = (order: OrderDraft & { payment_status: "pending" | "paid" }) => request<StoreOrder>("/api/staff/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) });
export const updateStaffOrder = (id: number, update: { status: string; payment_status?: string }) => request<StoreOrder>(`/api/staff/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) });
export const getStaffFeedback = () => request<FeedbackSummary>("/api/staff/feedback");
export const importStaffFeedback = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return request<{ imported: number; rejected: number }>("/api/staff/feedback/import", { method: "POST", body: form });
};
