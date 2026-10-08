import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CakeSlice, CircleHelp, FileText, Lightbulb, Moon, ShieldCheck, Sun, UploadCloud } from "lucide-react";
import { Dashboard, type DashboardFilters } from "./components/Dashboard";
import { ProductViewer } from "./components/ProductViewer";
import { RepeatDemand } from "./components/RepeatDemand";
import { OrderShop } from "./components/OrderShop";
import { StaffPortal } from "./components/StaffPortal";
import { UploadPanel } from "./components/UploadPanel";
import { getDashboard, getUploads, uploadWorkbook } from "./services/api";
import type { UploadBatch } from "./types";

const emptyFilters: DashboardFilters = { date_from: "", date_to: "", item: "", day: "", time_from: "", time_to: "" };
type WorkspaceView = "dashboard" | "report" | "suggestions" | "products" | "repeat" | "shop" | "staff";
const viewDetails: Record<WorkspaceView, { title: string; subtitle: string }> = {
  dashboard: { title: "Sales overview", subtitle: "Your bakery’s performance at a glance" },
  report: { title: "Analytical report", subtitle: "Explore sales patterns across products, dates, and times" },
  suggestions: { title: "Sales suggestions", subtitle: "Practical ideas based on the sales data you uploaded" },
  products: { title: "Product viewer", subtitle: "Open an item to explore its individual sales performance" },
  repeat: { title: "Repeat item demand", subtitle: "See how often each product sells across your sales history" },
  shop: { title: "Order for pickup", subtitle: "Choose bakery favourites and send a pickup request" },
  staff: { title: "Staff portal", subtitle: "Manage menu prices, pickup orders, and customer feedback" },
};
const queryParams = (filters: DashboardFilters, granularity: string) => {
  const params = new URLSearchParams({ granularity });
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params;
};

export function App() {
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("dashboard");
  const [justUploaded, setJustUploaded] = useState<UploadBatch | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [granularity, setGranularity] = useState("daily");
  const [showUploader, setShowUploader] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("flora-theme") === "dark");
  const [helpOpen, setHelpOpen] = useState(false);
  const uploads = useQuery({ queryKey: ["uploads"], queryFn: getUploads });
  const batch = uploads.data?.find((row) => row.id === selectedId) ?? (justUploaded?.id === selectedId ? justUploaded : null) ?? (selectedId === null ? uploads.data?.[0] : null) ?? null;

  useEffect(() => { if (batch && selectedId !== batch.id) setSelectedId(batch.id); }, [batch, selectedId]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; localStorage.setItem("flora-theme", dark ? "dark" : "light"); }, [dark]);
  const params = useMemo(() => queryParams(filters, granularity), [filters, granularity]);
  const dashboard = useQuery({ queryKey: ["dashboard", batch?.id, params.toString()], queryFn: () => getDashboard(batch!.id, params), enabled: Boolean(batch?.valid_records) && activeView !== "shop" && activeView !== "staff" });
  const upload = useMutation({ mutationFn: uploadWorkbook, onSuccess: async (uploaded) => { setJustUploaded(uploaded); setSelectedId(uploaded.id); setFilters(emptyFilters); setActiveView("dashboard"); setShowUploader(true); await client.invalidateQueries({ queryKey: ["uploads"] }); } });

  const doUpload = async (file: File): Promise<UploadBatch> => upload.mutateAsync(file);
  const refresh = () => { void client.invalidateQueries({ queryKey: ["dashboard", batch?.id] }); void client.invalidateQueries({ queryKey: ["uploads"] }); };

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Flora Bakes home"><span className="brand-mark"><CakeSlice size={21}/></span><span>flora<span className="brand-light">bakes</span><small>BAKERY INTELLIGENCE</small></span></a>
      <div className="sidebar-divider"/>
      <span className="side-label">WORKSPACE</span>
      <button className={`nav-item ${activeView === "dashboard" ? "nav-active" : ""}`} onClick={() => setActiveView("dashboard")}><BarChart3 size={17}/> Dashboard</button>
      <button className={`nav-item ${activeView === "report" ? "nav-active" : ""}`} onClick={() => setActiveView("report")}><FileText size={17}/> Analytical report</button>
      <button className={`nav-item ${activeView === "suggestions" ? "nav-active" : ""}`} onClick={() => setActiveView("suggestions")}><Lightbulb size={17}/> Sales suggestions</button>
      <button className={`nav-item ${activeView === "products" ? "nav-active" : ""}`} onClick={() => setActiveView("products")}><CakeSlice size={17}/> Product viewer</button>
      <button className={`nav-item ${activeView === "repeat" ? "nav-active" : ""}`} onClick={() => setActiveView("repeat")}><BarChart3 size={17}/> Repeat item demand</button>
      <button className={`nav-item ${activeView === "shop" ? "nav-active" : ""}`} onClick={() => setActiveView("shop")}><UploadCloud size={17}/> Order for pickup</button>
      <button className={`nav-item ${activeView === "staff" ? "nav-active" : ""}`} onClick={() => setActiveView("staff")}><ShieldCheck size={17}/> Staff portal</button>
      <button className="nav-item" onClick={() => setShowUploader(true)}><UploadCloud size={17}/> Import sales</button>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="note-mark">✦</span><strong>Good things<br/>are baking.</strong><p>Make every sales decision with a little more clarity.</p></div><span className="sidebar-version">FLORA BAKES <i/> SALES STUDIO</span></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{viewDetails[activeView].title}</strong></div><div className="topbar-actions"><div className="batch-select-wrap"><span>DATASET</span><select aria-label="Choose upload dataset" value={batch?.id ?? ""} onChange={(event) => { setSelectedId(Number(event.target.value)); setFilters(emptyFilters); }}><option value="" disabled>Select dataset</option>{uploads.data?.map((entry) => <option value={entry.id} key={entry.id}>{entry.original_filename}</option>)}</select></div><button className="icon-button top-icon" onClick={() => setDark((value) => !value)} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button top-icon" onClick={() => setHelpOpen((value) => !value)} aria-label="Show upload requirements"><CircleHelp size={18}/></button><button className="button button-primary top-upload" onClick={() => setShowUploader((value) => !value)}><UploadCloud size={16}/> Upload data</button></div></header>
      <motion.div className="page-content" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
        <section className="page-heading"><div><div className="heading-kicker"><span className="heading-flower">✿</span> A FRESH LOOK AT YOUR BUSINESS</div><h1>{viewDetails[activeView].title}<span>.</span></h1><p>{viewDetails[activeView].subtitle}</p></div><div className="heading-date">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date())}</div></section>
        {helpOpen && <div className="help-banner"><strong>Workbook format</strong><span>Required: Item Name, Sale Date, Sales Price and Sales Time. Column capitalization and common aliases are accepted. The weekday is recalculated from the sale date.</span><button className="text-button" onClick={() => setHelpOpen(false)}>Got it</button></div>}
        {showUploader && <UploadPanel onUpload={doUpload} onClose={() => setShowUploader(false)}/>}
        {uploads.isLoading && <div className="loading-panel card"><div className="skeleton wide"/><div className="skeleton"/><p>Preparing your sales workspace…</p></div>}
        {uploads.isError && <div className="state-card card"><h2>We couldn’t load your datasets</h2><p>{uploads.error.message}</p><button className="button button-outline" onClick={() => void uploads.refetch()}>Try again</button></div>}
        {batch && batch.valid_records === 0 && !showUploader && <div className="state-card card"><h2>This workbook needs a few fixes</h2><p>No valid sales rows were found. Open the upload report, correct the listed rows, and upload the workbook again.</p><button className="button button-outline" onClick={() => setShowUploader(true)}>Review upload report</button></div>}
        {!uploads.isLoading && !uploads.isError && !batch && activeView !== "shop" && activeView !== "staff" && <section className="welcome-card"><div className="welcome-copy"><span className="section-eyebrow">YOUR BAKERY, IN BETTER FOCUS</span><h2>A little data.<br/><em>A lot more clarity.</em></h2><p>Start with your sales workbook. Flora Bakes will validate every row, keep duplicates visible, and turn your real sales into a clear view of your business.</p><button className="button button-primary" onClick={() => setShowUploader(true)}>Upload your first workbook <ArrowRight size={16}/></button><small>Excel .xlsx or .xls · Up to 20 MB</small></div><div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-center"><CakeSlice size={48}/><span>fresh<br/>insights</span></div><div className="art-float float-top"><span>✦</span> Real sales data</div><div className="art-float float-bottom"><span>↗</span> Better decisions</div></div></section>}
        {upload.isError && <div className="global-error" role="alert">{upload.error.message}</div>}
        {activeView === "shop" && <OrderShop/>}
        {activeView === "staff" && <StaffPortal/>}
        {activeView !== "shop" && activeView !== "staff" && batch && <>{dashboard.isLoading && <div className="loading-panel card"><div className="skeleton wide"/><div className="skeleton"/><p>Crunching the numbers…</p></div>}{dashboard.isError && <div className="state-card card"><h2>Analytics couldn’t load</h2><p>{dashboard.error.message}</p><button className="button button-outline" onClick={() => void dashboard.refetch()}>Retry dashboard</button></div>}{dashboard.data && (activeView === "products" ? <ProductViewer batch={batch} data={dashboard.data} filters={filters}/> : activeView === "repeat" ? <RepeatDemand uploadId={batch.id}/> : activeView === "dashboard" || activeView === "report" || activeView === "suggestions" ? <Dashboard data={dashboard.data} batch={batch} onRefresh={refresh} filters={filters} onFiltersChange={setFilters} granularity={granularity} onGranularityChange={setGranularity} view={activeView}/> : null)}</>}
      </motion.div>
    </main>
  </div>;
}
