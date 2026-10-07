import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, CalendarDays, CakeSlice, Clock3, Coffee, Download, Package, Receipt, RotateCw, Sparkles, TrendingUp } from "lucide-react";
import type { DashboardData, UploadBatch } from "../types";

const palette = ["#b56d50", "#dcaa76", "#78866c", "#d28878", "#927360", "#e4c99f", "#65715b", "#bb8971", "#b9a38b", "#8a9a85"];
const number = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
const decimal = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

function CardTitle({ eyebrow, title, aside }: { eyebrow?: string; title: string; aside?: ReactNode }) {
  return <div className="chart-title"><div>{eyebrow && <span className="muted-label">{eyebrow}</span>}<h3>{title}</h3></div>{aside}</div>;
}

function AnimatedValue({ value, precision }: { value: number; precision: number }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 85, damping: 22, mass: 0.7 });
  const formatted = useTransform(spring, (current) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: precision, minimumFractionDigits: precision }).format(current));
  useEffect(() => { motionValue.set(value); }, [motionValue, value]);
  return <motion.strong className="metric-value">{formatted}</motion.strong>;
}

function Metric({ title, value, note, icon, accent, precision = 0 }: { title: string; value: string | number; note: string; icon: ReactNode; accent: string; precision?: number }) {
  return <article className="metric-card card"><div className={`metric-icon ${accent}`}>{icon}</div><span className="metric-label">{title}</span>{typeof value === "number" ? <AnimatedValue value={value} precision={precision}/> : <strong className="metric-value" title={value}>{value}</strong>}<span className="metric-note">{note}</span></article>;
}

export interface DashboardFilters { date_from: string; date_to: string; item: string; day: string; time_from: string; time_to: string; }
interface Props { data: DashboardData; batch: UploadBatch; onRefresh: () => void; filters: DashboardFilters; onFiltersChange: (filters: DashboardFilters) => void; granularity: string; onGranularityChange: (value: string) => void; }
export function Dashboard({ data, batch, onRefresh, filters, onFiltersChange, granularity, onGranularityChange }: Props) {
  const [measure, setMeasure] = useState<"revenue" | "transactions">("revenue");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"revenue" | "transactions" | "item">("revenue");
  const [showAllShare, setShowAllShare] = useState(false);
  const s = data.summary;
  const filteredProducts = useMemo(() => data.products.filter((row) => row.item.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "item" ? a.item.localeCompare(b.item) : b[sort] - a[sort]), [data.products, search, sort]);
  const trendItems = data.trends;
  const shareRows = showAllShare ? data.item_share : data.item_share.slice(0, 7);

  return <div className="dashboard-content">
    <div className="dashboard-toolbar"><div className="dataset-pill"><span className="status-dot"/>{batch.original_filename}<span className="dataset-count">{batch.valid_records.toLocaleString()} rows</span></div><div className="toolbar-actions"><button className="button button-quiet" onClick={onRefresh}><RotateCw size={15}/> Refresh</button><a className="button button-quiet" href={`/api/reports/${batch.id}.csv`}><Download size={15}/> Export report</a></div></div>
    <section className="filter-bar card" aria-label="Dashboard filters">
      <label>From<input type="date" value={filters.date_from} onChange={(e) => onFiltersChange({ ...filters, date_from: e.target.value })}/></label>
      <label>To<input type="date" value={filters.date_to} onChange={(e) => onFiltersChange({ ...filters, date_to: e.target.value })}/></label>
      <label>Item<select value={filters.item} onChange={(e) => onFiltersChange({ ...filters, item: e.target.value })}><option value="">All items</option>{data.available_items.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Day<select value={filters.day} onChange={(e) => onFiltersChange({ ...filters, day: e.target.value })}><option value="">All days</option>{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => <option key={day}>{day}</option>)}</select></label>
      <label>Time from<input type="time" value={filters.time_from} onChange={(e) => onFiltersChange({ ...filters, time_from: e.target.value })}/></label>
      <label>Time to<input type="time" value={filters.time_to} onChange={(e) => onFiltersChange({ ...filters, time_to: e.target.value })}/></label>
      <button className="text-button clear-filter" onClick={() => onFiltersChange({ date_from: "", date_to: "", item: "", day: "", time_from: "", time_to: "" })}>Clear</button>
    </section>
    <section className="metrics-grid" aria-label="Sales key performance indicators">
      <Metric title="Total sales" value={s.total_sales} precision={2} note="Revenue in this selection" icon={<TrendingUp size={18}/>} accent="metric-peach"/>
      <Metric title="Transactions" value={s.total_transactions} note="Valid sales records" icon={<Receipt size={18}/>} accent="metric-sage"/>
      <Metric title="Average sale" value={s.average_sale_value} precision={2} note="Per transaction" icon={<ArrowUpRight size={18}/>} accent="metric-gold"/>
      <Metric title="Best-selling item" value={s.best_selling_item ?? "—"} note="Highest revenue" icon={<CakeSlice size={18}/>} accent="metric-rose"/>
      <Metric title="Best sales day" value={s.best_sales_day ?? "—"} note="Highest day revenue" icon={<CalendarDays size={18}/>} accent="metric-sage"/>
      <Metric title="Peak sales hour" value={s.peak_sales_hour ?? "—"} note="Highest hourly revenue" icon={<Clock3 size={18}/>} accent="metric-peach"/>
      <Metric title="Lowest performer" value={s.lowest_performing_item ?? "—"} note="Lowest item revenue" icon={<ArrowDownRight size={18}/>} accent="metric-gold"/>
      <Metric title="Strongest period" value={s.best_sales_period ?? "—"} note="Morning, afternoon, evening or night" icon={<Coffee size={18}/>} accent="metric-rose"/>
    </section>

    <section className="card chart-card trend-card">
      <CardTitle eyebrow="REVENUE OVER TIME" title="Sales trend" aside={<div className="segmented">{["daily", "weekly", "monthly"].map((value) => <button key={value} className={granularity === value ? "active" : ""} onClick={() => onGranularityChange(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>}/>
      <div className="chart-legend"><span><i className="legend-dot brown-dot"/>Revenue</span><span><i className="legend-dot peach-dot"/>Transactions</span></div>
      <ResponsiveContainer width="100%" height={270}><AreaChart data={trendItems}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b56d50" stopOpacity={0.22}/><stop offset="100%" stopColor="#b56d50" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5"/><XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} minTickGap={28}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(value) => number(value)}/><Tooltip formatter={(value, name) => [number(Number(value)), name === "revenue" ? "Revenue" : "Transactions"]} contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }}/><Area type="monotone" dataKey="revenue" stroke="#a75f44" strokeWidth={2.5} fill="url(#revenueFill)" activeDot={{ r: 5 }}/></AreaChart></ResponsiveContainer>
      {data.trends.length === 0 && <div className="chart-empty">No sales match these filters.</div>}
    </section>

    <section className="two-column">
      <article className="card chart-card"><CardTitle eyebrow="PRODUCT RANKING" title="Top selling items" aside={<div className="segmented">{(["revenue", "transactions"] as const).map((value) => <button key={value} className={measure === value ? "active" : ""} onClick={() => setMeasure(value)}>{value === "revenue" ? "Revenue" : "Sales"}</button>)}</div>}/>
        <ResponsiveContainer width="100%" height={Math.max(260, Math.min(data.top_items.length, 10) * 38)}><BarChart data={data.top_items} layout="vertical" margin={{ left: 8, right: 24 }}><CartesianGrid horizontal={false} stroke="var(--line)"/><XAxis type="number" hide/><YAxis type="category" dataKey="item" width={130} tickLine={false} axisLine={false} tick={{ fill: "var(--text)", fontSize: 12 }}/><Tooltip formatter={(value) => [number(Number(value)), measure === "revenue" ? "Revenue" : "Transactions"]} contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }}/><Bar dataKey={measure} fill="#b56d50" radius={[0, 6, 6, 0]} barSize={17}/></BarChart></ResponsiveContainer>
        {!data.top_items.length && <div className="chart-empty">No product data for this selection.</div>}</article>
      <article className="card chart-card"><CardTitle eyebrow="REVENUE MIX" title="Sales share by item"/>
        {data.item_share.length ? <><div className="donut-wrap"><ResponsiveContainer width="100%" height={210}><PieChart><Pie data={data.item_share} dataKey="revenue" nameKey="item" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">{data.item_share.map((row, index) => <Cell key={row.item} fill={palette[index % palette.length]}/>)}</Pie><Tooltip formatter={(value) => [decimal(Number(value)), "Revenue"]} contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }}/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{number(data.item_share.length)}</strong><span>products</span></div></div><div className="share-list">{shareRows.map((row, index) => <div className="share-row" key={row.item}><span className="share-name"><i style={{ background: palette[index % palette.length] }}/>{row.item}</span><span>{decimal(row.revenue)}</span><strong>{row.share.toFixed(1)}%</strong></div>)}</div>{data.item_share.length > 7 && <button className="text-button" onClick={() => setShowAllShare((value) => !value)}>{showAllShare ? "Show less" : `Show all ${data.item_share.length} items`}</button>}</> : <div className="chart-empty">No sales share to display.</div>}</article>
    </section>

    <section className="two-column">
      <article className="card chart-card"><CardTitle eyebrow="WEEKLY RHYTHM" title="Sales by day"/>
        <ResponsiveContainer width="100%" height={245}><BarChart data={data.sales_by_day}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5"/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} tickFormatter={(value) => value.slice(0, 3)}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} tickFormatter={(value) => number(value)}/><Tooltip formatter={(value, name) => [number(Number(value)), name === "revenue" ? "Revenue" : "Transactions"]} contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }}/><Bar dataKey={measure} radius={[5, 5, 0, 0]} barSize={25}>{data.sales_by_day.map((entry) => <Cell key={entry.day} fill={entry.day === s.best_sales_day ? "#a75f44" : "#dfc7b1"}/>)}</Bar></BarChart></ResponsiveContainer></article>
      <article className="card chart-card"><CardTitle eyebrow="DAILY DEMAND" title="Sales by time"/>
        <div className="peak-callout"><Clock3 size={16}/><span>Peak hour</span><strong>{s.peak_sales_hour ?? "—"}</strong><span className="callout-divider"/><span>Quietest</span><strong>{s.lowest_sales_hour ?? "—"}</strong></div>
        <ResponsiveContainer width="100%" height={190}><AreaChart data={data.hourly_sales}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5"/><XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} interval={2}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} tickFormatter={number}/><Tooltip formatter={(value) => [number(Number(value)), "Revenue"]} contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }}/><Area type="monotone" dataKey="revenue" stroke="#77866d" strokeWidth={2.4} fill="#77866d" fillOpacity={0.13}/></AreaChart></ResponsiveContainer>
        <div className="period-strip">{data.sales_by_time.map((row) => <div key={row.period}><span>{row.period}</span><strong>{decimal(row.revenue)}</strong><small>{row.transactions} sales</small></div>)}</div></article>
    </section>

    <section className="card table-card"><CardTitle eyebrow="AT A GLANCE" title="Product performance" aside={<input className="search-input" aria-label="Search products" placeholder="Search products…" value={search} onChange={(event) => setSearch(event.target.value)}/>}/>
      <div className="table-scroll"><table><thead><tr><th><button onClick={() => setSort("item")}>Item</button></th><th><button onClick={() => setSort("transactions")}>Sales</button></th><th><button onClick={() => setSort("revenue")}>Revenue</button></th><th>Share</th><th>Avg. sale</th><th>Status</th></tr></thead><tbody>{filteredProducts.map((row, index) => <tr key={row.item}><td><span className="product-rank">{String(index + 1).padStart(2, "0")}</span><strong>{row.item}</strong></td><td>{number(row.transactions)}</td><td>{decimal(row.revenue)}</td><td><span className="share-meter"><i style={{ width: `${row.revenue_share}%` }}/></span>{row.revenue_share.toFixed(1)}%</td><td>{decimal(row.average_sale)}</td><td><span className={`badge badge-${row.status.toLowerCase()}`}>{row.status}</span></td></tr>)}{filteredProducts.length === 0 && <tr><td colSpan={6} className="table-empty">No matching products.</td></tr>}</tbody></table></div></section>

    <section className="two-column insight-grid">
      <article className="card insight-card"><div className="insight-heading"><div className="insight-icon"><Sparkles size={18}/></div><div><span className="muted-label">PATTERNS IN YOUR DATA</span><h3>Business insights</h3></div></div>{data.insights.length ? <ul className="insight-list">{data.insights.map((insight) => <li key={insight}>{insight}</li>)}</ul> : <p className="empty-copy">Upload sales rows to see data-driven patterns.</p>}</article>
      <article className="card recommendation-card"><div className="insight-heading"><div className="insight-icon recommendation-icon"><Package size={18}/></div><div><span className="muted-label">A FEW IDEAS TO CONSIDER</span><h3>Recommendations for Flora Bakes</h3></div></div>{data.recommendations.length ? <ol className="recommendation-list">{data.recommendations.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol> : <p className="empty-copy">More product history will help surface practical recommendations.</p>}</article>
    </section>

    <section className="card waste-card"><div className="waste-heading"><div className="insight-heading"><div className="insight-icon waste-icon"><Package size={18}/></div><div><span className="muted-label">PRODUCTION VISIBILITY</span><h3>Waste analysis</h3></div></div></div>{data.waste.available ? <><div className="waste-content"><div className="waste-stat"><span>Total waste quantity</span><strong>{decimal(data.waste.total_quantity)}</strong></div><div className="waste-stat"><span>Waste cost</span><strong>{decimal(data.waste.total_cost)}</strong></div><div className="waste-stat"><span>Waste percentage</span><strong>{data.waste.waste_percentage == null ? "—" : `${data.waste.waste_percentage.toFixed(1)}%`}</strong></div></div><div className="two-column waste-charts"><article><h4>Top wasted items</h4><ResponsiveContainer width="100%" height={200}><BarChart data={data.waste.by_item.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 18 }}><CartesianGrid horizontal={false} stroke="var(--line)"/><XAxis type="number" hide/><YAxis type="category" dataKey="item" width={125} tickLine={false} axisLine={false} tick={{ fill: "var(--text)", fontSize: 10 }}/><Tooltip formatter={(value) => [decimal(Number(value)), "Waste quantity"]} contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }}/><Bar dataKey="quantity" fill="#c28b64" radius={[0, 5, 5, 0]} barSize={15}/></BarChart></ResponsiveContainer></article><article><h4>Waste by day</h4><ResponsiveContainer width="100%" height={200}><BarChart data={data.waste.by_day}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 9 }} tickFormatter={(value) => value.slice(0, 3)}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 9 }}/><Tooltip formatter={(value) => [decimal(Number(value)), "Waste quantity"]} contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }}/><Bar dataKey="quantity" fill="#8b9878" radius={[5, 5, 0, 0]} barSize={20}/></BarChart></ResponsiveContainer></article><article><h4>Waste trend</h4><ResponsiveContainer width="100%" height={200}><LineChart data={data.waste.trend}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 9 }} minTickGap={24}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 9 }}/><Tooltip formatter={(value) => [decimal(Number(value)), "Waste quantity"]} contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }}/><Line type="monotone" dataKey="quantity" stroke="#a75f44" strokeWidth={2} dot={false} activeDot={{ r: 4 }}/></LineChart></ResponsiveContainer></article></div><p className="waste-note">{data.waste.percentage_note}</p></> : <div className="waste-empty"><strong>Waste analysis unavailable</strong><p>Your uploaded sales file does not contain usable waste information. Add Waste Quantity or Waste Cost values to enable waste analytics.</p></div>}</section>
    <footer className="dashboard-footer">Analyzing {batch.valid_records.toLocaleString()} valid records from {batch.original_filename}<span>Flora Bakes · Sales intelligence</span></footer>
  </div>;
}
