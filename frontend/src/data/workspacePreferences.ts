import type { DashboardFilters } from "../components/Dashboard";

export type WorkspaceView = "dashboard" | "report" | "suggestions" | "products" | "repeat" | "shop" | "staff";
interface WorkspacePreferences {
  selectedId: number | null;
  activeView: WorkspaceView;
  filters: DashboardFilters;
  granularity: string;
}

const KEY = "flora-bakes-workspace";
const views: WorkspaceView[] = ["dashboard", "report", "suggestions", "products", "repeat", "shop", "staff"];
export const emptyFilters: DashboardFilters = { date_from: "", date_to: "", item: "", day: "", time_from: "", time_to: "" };

export function readStoredValue(key: string): string | null {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

export function writeStoredValue(key: string, value: string): void {
  try { localStorage.setItem(key, value); }
  catch { /* Server data still loads when browser storage is unavailable. */ }
}

export function readWorkspacePreferences(): WorkspacePreferences {
  const defaults: WorkspacePreferences = { selectedId: null, activeView: "dashboard", filters: { ...emptyFilters }, granularity: "daily" };
  try {
    const raw: unknown = JSON.parse(readStoredValue(KEY) ?? "null");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
    const saved = raw as Record<string, unknown>;
    const source = saved.filters && typeof saved.filters === "object" ? saved.filters as Record<string, unknown> : {};
    const text = (key: string) => typeof source[key] === "string" ? source[key] as string : "";
    const date = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(text(key)) ? text(key) : "";
    const time = (key: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(key)) ? text(key) : "";
    return {
      selectedId: typeof saved.selectedId === "number" && Number.isSafeInteger(saved.selectedId) && saved.selectedId > 0 ? saved.selectedId : null,
      activeView: views.includes(saved.activeView as WorkspaceView) ? saved.activeView as WorkspaceView : "dashboard",
      granularity: ["daily", "weekly", "monthly"].includes(saved.granularity as string) ? saved.granularity as string : "daily",
      filters: {
        date_from: date("date_from"), date_to: date("date_to"),
        time_from: time("time_from"), time_to: time("time_to"),
        item: text("item").length <= 200 ? text("item") : "",
        day: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(text("day")) ? text("day") : "",
      },
    };
  } catch { return defaults; }
}

export function saveWorkspacePreferences(preferences: WorkspacePreferences): void {
  // Remember navigation and filters only. Workbooks and sales rows remain on the server.
  writeStoredValue(KEY, JSON.stringify(preferences));
}
