import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CakeSlice, Clock3, Receipt, TrendingUp } from "lucide-react";
import { getDashboard } from "../services/api";
import type { DashboardData, UploadBatch } from "../types";
import type { DashboardFilters } from "./Dashboard";

type ProductPhoto = { url: string; source: string; label: string };

const photos: { category: string; photo: ProductPhoto }[] = [
  { category: "cake", photo: { url: "https://images.unsplash.com/photo-1582577829927-897c60e62d52?auto=format&fit=crop&w=1000&q=82", source: "https://unsplash.com/photos/chocolate-cake-on-white-table-cloth-gZS7mJOTNCo", label: "cake" } },
  { category: "cupcake", photo: { url: "https://images.unsplash.com/photo-1680310765701-c292e765296b?auto=format&fit=crop&w=1000&q=82", source: "https://unsplash.com/es/fotos/una-variedad-de-cupcakes-y-muffins-estan-en-exhibicion-yI_jyVkbFVM", label: "cupcakes" } },
  { category: "bread", photo: { url: "https://images.unsplash.com/photo-1675725291010-cb1020860cb2?auto=format&fit=crop&w=1000&q=82", source: "https://unsplash.com/photos/a-loaf-of-bread-sitting-on-top-of-a-wooden-cutting-board--ee84xVMlOA", label: "bread" } },
  { category: "croissant", photo: { url: "https://images.unsplash.com/photo-1747459707225-65744d0ae6be?auto=format&fit=crop&w=1000&q=82", source: "https://unsplash.com/photos/freshly-baked-croissants-sit-on-a-tray-7Yl_Qhxfgok", label: "croissants" } },
  { category: "roll", photo: { url: "https://images.unsplash.com/photo-1668015826833-9aeafb608ccd?auto=format&fit=crop&w=1000&q=82", source: "https://unsplash.com/ja/photos/H1i3PJUzbRg", label: "cinnamon rolls" } },
  { category: "cookie", photo: { url: "https://images.unsplash.com/photo-1657418830273-40c19cfff4d7?auto=format&fit=crop&w=1000&q=82", source: "https://unsplash.com/photos/a-group-of-cookies-7QGrloNqx6w", label: "cookies" } },
];
const fallbackPhoto = photos[3].photo;
const getPhoto = (name: string) => {
  const normalized = name.toLowerCase();
  const category = /cupcake|muffin/.test(normalized) ? "cupcake"
    : /croissant|danish|puff|pastry/.test(normalized) ? "croissant"
      : /cookie|biscuit/.test(normalized) ? "cookie"
      : /bread|loaf|baguette|sourdough|bun/.test(normalized) ? "bread"
        : /roll|cinnamon/.test(normalized) ? "roll"
          : /cake|torte/.test(normalized) ? "cake" : "";
  return photos.find((entry) => entry.category === category)?.photo ?? fallbackPhoto;
};
const decimal = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
const integer = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

function DetailMetric({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return <article className="product-detail-metric card"><span className="product-detail-icon">{icon}</span><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

interface Props { batch: UploadBatch; data: DashboardData; filters: DashboardFilters; }

export function ProductViewer({ batch, data, filters }: Props) {
  const products = data.products;
  const [selectedItem, setSelectedItem] = useState("");
  const selected = products.find((product) => product.item === selectedItem) ?? products[0];

  useEffect(() => {
    if (products.length && !products.some((product) => product.item === selectedItem)) setSelectedItem(products[0].item);
  }, [products, selectedItem]);

  const params = useMemo(() => {
    const query = new URLSearchParams({ granularity: "daily", item: selected?.item ?? "" });
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== "item" && value) query.set(key, value);
    });
    return query;
  }, [filters, selected?.item]);
  const detail = useQuery({
    queryKey: ["product-analysis", batch.id, params.toString()],
    queryFn: () => getDashboard(batch.id, params),
    enabled: Boolean(selected),
  });
  const photo = selected ? getPhoto(selected.item) : fallbackPhoto;
  const selectedData = detail.data;
  const bestDay = selectedData?.sales_by_day.reduce((best, row) => row.revenue > (best?.revenue ?? -1) ? row : best, selectedData.sales_by_day[0]);
  const peakPeriod = selectedData?.sales_by_time.reduce((best, row) => row.revenue > (best?.revenue ?? -1) ? row : best, selectedData.sales_by_time[0]);

  if (!products.length) return <section className="state-card card"><h2>No product details available</h2><p>Upload a workbook with valid sales records to see product analysis.</p></section>;

  return <section className="product-viewer">
    <aside className="product-picker card" aria-label="Choose a product">
      <div className="product-picker-heading"><span className="muted-label">PRODUCT CATALOG</span><strong>{products.length} items</strong></div>
      <div className="product-picker-list">{products.map((product, index) => {
        const itemPhoto = getPhoto(product.item);
        return <button key={product.item} className={`product-picker-row ${selected?.item === product.item ? "selected" : ""}`} onClick={() => setSelectedItem(product.item)}>
          <img src={itemPhoto.url} alt="" loading="lazy"/><span className="product-picker-copy"><strong>{product.item}</strong><small>{integer(product.transactions)} sales</small></span><span className="product-picker-revenue">{decimal(product.revenue)}</span><span className="product-picker-rank">{String(index + 1).padStart(2, "0")}</span>
        </button>;
      })}</div>
    </aside>

    <div className="product-detail-main">
      <article className="product-hero card">
        <img className="product-hero-image" src={photo.url} alt={`Illustrative ${photo.label} bakery photo`} />
        <div className="product-hero-shade"/>
        <div className="product-hero-copy"><span className="product-hero-kicker"><CakeSlice size={14}/> PRODUCT ANALYSIS</span><h2>{selected?.item}</h2><p>{integer(selected?.transactions ?? 0)} transactions in this dataset</p><a href={photo.source} target="_blank" rel="noreferrer">Illustrative {photo.label} photo · Unsplash</a></div>
      </article>

      {detail.isLoading && <div className="loading-panel card"><div className="skeleton wide"/><p>Loading product analysis…</p></div>}
      {detail.isError && <div className="state-card card"><h2>Product analysis couldn’t load</h2><p>{detail.error.message}</p><button className="button button-outline" onClick={() => void detail.refetch()}>Try again</button></div>}
      {selectedData && <>
        <div className="product-detail-metrics">
          <DetailMetric icon={<TrendingUp size={17}/>} label="Revenue" value={decimal(selected?.revenue ?? 0)} note={`${(selected?.revenue_share ?? 0).toFixed(1)}% of selected sales`}/>
          <DetailMetric icon={<Receipt size={17}/>} label="Transactions" value={integer(selected?.transactions ?? 0)} note="Recorded sales for this item"/>
          <DetailMetric icon={<CakeSlice size={17}/>} label="Average sale" value={decimal(selected?.average_sale ?? 0)} note="Revenue per transaction"/>
          <DetailMetric icon={<Clock3 size={17}/>} label="Top sales period" value={peakPeriod?.period ?? "—"} note={bestDay ? `Best day: ${bestDay.day}` : "No sales pattern available"}/>
        </div>

        <article className="card chart-card product-trend-card"><div className="chart-title"><div><span className="muted-label">ITEM REVENUE</span><h3>{selected?.item} over time</h3></div><span className="product-status">{selected?.status}</span></div>
          <ResponsiveContainer width="100%" height={245}><AreaChart data={selectedData.trends}><defs><linearGradient id="productRevenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b56d50" stopOpacity={0.23}/><stop offset="100%" stopColor="#b56d50" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5"/><XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} minTickGap={24}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} tickFormatter={integer}/><Tooltip formatter={(value) => [decimal(Number(value)), "Revenue"]} contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }}/><Area type="monotone" dataKey="revenue" stroke="#a75f44" strokeWidth={2.4} fill="url(#productRevenueFill)"/></AreaChart></ResponsiveContainer>
          {!selectedData.trends.length && <div className="chart-empty">No sales match the selected filters.</div>}
        </article>

        <article className="card chart-card product-days-card"><div className="chart-title"><div><span className="muted-label">DEMAND PATTERN</span><h3>Sales by day of week</h3></div></div>
          <ResponsiveContainer width="100%" height={230}><BarChart data={selectedData.sales_by_day} margin={{ left: 0, right: 12 }}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5"/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} tickFormatter={(value) => value.slice(0, 3)}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} tickFormatter={integer}/><Tooltip formatter={(value) => [decimal(Number(value)), "Revenue"]} contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }}/><Bar dataKey="revenue" fill="#8b9878" radius={[5, 5, 0, 0]} barSize={25}/></BarChart></ResponsiveContainer>
          <p className="product-pattern-note">{bestDay ? `${bestDay.day} is the strongest day for ${selected?.item} in this dataset.` : "Upload more sales to reveal this product’s weekly pattern."}</p>
        </article>
      </>}
      <p className="product-image-note">Product photos are generic category illustrations; they may not depict the exact item sold.</p>
    </div>
  </section>;
}
