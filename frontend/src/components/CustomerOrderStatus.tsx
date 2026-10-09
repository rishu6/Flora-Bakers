import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RefreshCw, Star } from "lucide-react";
import { submitOrderFeedback, trackCustomerOrder } from "../services/api";

const money = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
const statusLabels: Record<string, string> = {
  new: "Order received", confirmed: "Confirmed", preparing: "Preparing", ready: "Ready for pickup", completed: "Completed", cancelled: "Cancelled",
};
const statusMessages: Record<string, string> = {
  new: "Your pickup request is with the bakery. We’ll confirm it shortly.",
  confirmed: "The bakery has confirmed your order.",
  preparing: "Your treats are being prepared.",
  ready: "Your order is ready to collect from the bakery.",
  completed: "Your order has been collected. Thank you for ordering with us.",
  cancelled: "This order was cancelled. Contact the bakery if you need help.",
};

export function CustomerOrderStatus({ code, onFound }: { code: string; onFound: (code: string) => void }) {
  const [rating, setRating] = useState(5);
  const [feedbackProduct, setFeedbackProduct] = useState("");
  const [comment, setComment] = useState("");
  const [feedbackDone, setFeedbackDone] = useState(false);
  const tracking = useQuery({
    queryKey: ["store-order", code],
    queryFn: () => trackCustomerOrder(code),
    retry: false,
    refetchInterval: (query) => query.state.error ? false : 30000,
  });
  useEffect(() => {
    if (tracking.isSuccess) onFound(code);
  }, [code, tracking.isSuccess, onFound]);
  const order = tracking.data;
  const selectedProduct = feedbackProduct || order?.items[0]?.product_name || "";
  const feedback = useMutation({
    mutationFn: () => submitOrderFeedback(code, { product_name: selectedProduct, rating, comment }),
    onSuccess: () => setFeedbackDone(true),
  });

  return <div className="customer-status-detail">
    <div className="customer-status-toolbar"><div><span className="section-eyebrow">ORDER CODE</span><code className="order-public-code">{code}</code></div><button type="button" className="button button-outline" disabled={tracking.isFetching} onClick={() => void tracking.refetch()}><RefreshCw size={16}/> {tracking.isFetching ? "Updating…" : "Refresh status"}</button></div>
    {tracking.isPending && <p role="status">Loading your order status…</p>}
    {tracking.isError && <p className="error-text" role="alert">{order ? "Status couldn’t update. Showing the last available update. " : "Order couldn’t load. Check your order code and try again. "}{tracking.error.message}</p>}
    {order && <>
      <div className="order-status-summary" aria-live="polite"><div><span>Order status</span><strong>{statusLabels[order.status] ?? order.status.replace(/_/g, " ")}</strong></div><div><span>Payment</span><strong>{order.payment_status === "paid" ? "Confirmed paid" : order.payment_status === "refunded" ? "Refunded" : "Awaiting bakery confirmation"}</strong></div><div><span>Pickup</span><strong>{order.pickup_at ? new Date(order.pickup_at).toLocaleString() : "Time to be confirmed"}</strong></div></div>
      <p>{statusMessages[order.status]}</p>
      <div className="order-confirmation-items">{order.items.map((item, index) => <div key={`${item.product_name}-${index}`}><span>{item.quantity} × {item.product_name}</span><strong>{money(item.line_total)}</strong></div>)}</div>
      <div className="cart-total"><strong>Order total</strong><strong>{money(order.total)}</strong></div>
      <p className="customer-status-note">Status updates automatically every 30 seconds while this page is open.</p>
      {order.status === "completed" && !feedbackDone && <form className="feedback-form" onSubmit={(event) => { event.preventDefault(); if (!feedback.isPending) feedback.mutate(); }}><h3>How was your order?</h3><label>Rate an item<select value={selectedProduct} onChange={(event) => setFeedbackProduct(event.target.value)}>{order.items.map((item, index) => <option key={`${item.product_name}-${index}`} value={item.product_name}>{item.product_name}</option>)}</select></label><div className="rating-picker" aria-label={`Rating: ${rating} out of 5`}>{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value} stars`} aria-pressed={value === rating} className={value <= rating ? "rated" : ""} onClick={() => setRating(value)}><Star size={18} fill={value <= rating ? "currentColor" : "none"}/></button>)}</div><label>Feedback<textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} placeholder="Share what you liked or what we could improve…"/></label>{feedback.isError && <p className="error-text" role="alert">{feedback.error.message}</p>}<button className="button button-primary" disabled={!selectedProduct || feedback.isPending}>{feedback.isPending ? "Sending…" : "Send feedback"}</button></form>}
      {feedbackDone && <p className="inline-note" role="status">Thank you. Your feedback has been shared with the bakery.</p>}
    </>}
  </div>;
}
