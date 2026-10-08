import { useQuery } from "@tanstack/react-query";
import { Repeat2, TrendingUp } from "lucide-react";
import { getRepeatDemand } from "../services/api";

const count = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

export function RepeatDemand({ uploadId }: { uploadId: number }) {
  const query = useQuery({ queryKey: ["repeat-demand", uploadId], queryFn: () => getRepeatDemand(uploadId) });
  if (query.isLoading) return <div className="loading-panel card"><div className="skeleton wide"/><p>Analyzing repeat item demand…</p></div>;
  if (query.isError) return <section className="state-card card"><h2>Repeat demand couldn’t load</h2><p>{query.error.message}</p><button className="button button-outline" onClick={() => void query.refetch()}>Try again</button></section>;
  const items = query.data?.items ?? [];
  return <section className="repeat-demand">
    <div className="repeat-demand-intro card"><span className="insight-icon"><Repeat2 size={19}/></span><div><h2>Which items sell repeatedly?</h2><p>Sales frequency is calculated from this workbook’s transaction rows over {query.data?.span_days ?? 0} days.</p></div></div>
    <div className="repeat-demand-grid">{items.map((item, index) => <article className="repeat-item-card card" key={item.item}>
      <div className="repeat-item-head"><span className="product-rank">{String(index + 1).padStart(2, "0")}</span><h3>{item.item}</h3><TrendingUp size={16}/></div>
      <div className="repeat-item-rate"><strong>{item.sales_per_week}</strong><span>sales per week</span></div>
      <div className="repeat-item-facts"><div><span>Transactions</span><strong>{count(item.transactions)}</strong></div><div><span>Active sales days</span><strong>{count(item.active_days)}</strong></div><div><span>Avg. gap between sales</span><strong>{item.average_days_between_sales == null ? "Not enough history" : `${item.average_days_between_sales} days`}</strong></div></div>
      <small>Last recorded sale: {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${item.last_sale_date}T12:00:00`))}</small>
    </article>)}</div>
    {!items.length && <section className="state-card card"><h2>No sales rows yet</h2><p>Upload valid item sales to see repeat demand.</p></section>}
    <p className="repeat-demand-note">This measures item sales frequency from uploaded rows. The current workbook does not include customer or order IDs, so it cannot identify returning customers.</p>
  </section>;
}
