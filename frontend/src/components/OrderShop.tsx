import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { getStoreProducts, placeCustomerOrder, submitOrderFeedback, trackCustomerOrder, type StoreOrder } from "../services/api";
import { getProductPhoto } from "../data/productPhotos";

const money = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

export function OrderShop() {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [rating, setRating] = useState(5);
  const [feedbackProduct, setFeedbackProduct] = useState("");
  const [comment, setComment] = useState("");
  const [feedbackDone, setFeedbackDone] = useState(false);
  const products = useQuery({ queryKey: ["store-products"], queryFn: getStoreProducts });
  const tracking = useQuery({ queryKey: ["store-order", order?.public_code], queryFn: () => trackCustomerOrder(order!.public_code), enabled: Boolean(order?.public_code), refetchInterval: 30000 });
  const orderMutation = useMutation({ mutationFn: placeCustomerOrder, onSuccess: (created) => { setOrder(created); setFeedbackProduct(created.items[0]?.product_name ?? ""); setQuantities({}); } });
  const feedbackMutation = useMutation({ mutationFn: () => submitOrderFeedback(order!.public_code, { product_name: feedbackProduct, rating, comment }), onSuccess: () => setFeedbackDone(true) });
  const selectedProducts = useMemo(() => (products.data ?? []).filter((product) => quantities[product.id]), [products.data, quantities]);
  const total = selectedProducts.reduce((sum, product) => sum + product.current_price * quantities[product.id], 0);

  if (order) {
    const status = tracking.data?.status ?? order.status;
    return <section className="customer-order-confirmation card">
      <span className="section-eyebrow">ORDER RECEIVED</span><h2>Thank you, {order.customer_name}.</h2><p>Your pickup request is with the bakery. Keep this order code to check its status.</p>
      <div className="order-public-code">{order.public_code}</div>
      <div className="order-status-summary"><div><span>Order status</span><strong>{status.replace(/_/g, " ")}</strong></div><div><span>Payment</span><strong>{tracking.data?.payment_status === "paid" ? "Confirmed paid" : "Awaiting bakery confirmation"}</strong></div><div><span>Pickup</span><strong>{tracking.data?.pickup_at ? new Date(tracking.data.pickup_at).toLocaleString() : "Time to be confirmed"}</strong></div></div>
      <div className="order-confirmation-items">{(tracking.data?.items ?? order.items).map((item) => <div key={item.product_name}><span>{item.quantity} × {item.product_name}</span><strong>{money(item.line_total)}</strong></div>)}</div>
      {status === "completed" && !feedbackDone && <form className="feedback-form" onSubmit={(event) => { event.preventDefault(); feedbackMutation.mutate(); }}><h3>How was your order?</h3><label>Rate an item<select value={feedbackProduct} onChange={(event) => setFeedbackProduct(event.target.value)}>{order.items.map((item) => <option key={item.product_name}>{item.product_name}</option>)}</select></label><div className="rating-picker" aria-label={`Rating: ${rating} out of 5`}>{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value} stars`} className={value <= rating ? "rated" : ""} onClick={() => setRating(value)}><Star size={18} fill={value <= rating ? "currentColor" : "none"}/></button>)}</div><label>Feedback<textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} placeholder="Share what you liked or what we could improve…"/></label>{feedbackMutation.isError && <p className="error-text">{feedbackMutation.error.message}</p>}<button className="button button-primary" disabled={feedbackMutation.isPending}>Send feedback</button></form>}
      {feedbackDone && <p className="inline-note">Thank you. Your feedback has been shared with the bakery.</p>}
      <button className="button button-outline" onClick={() => { setOrder(null); setFeedbackDone(false); }}>Back to menu</button>
    </section>;
  }

  return <div className="storefront-layout">
    <section className="storefront-main"><div className="storefront-heading"><span className="section-eyebrow">FRESH FROM FLORA BAKES</span><h2>Order for pickup</h2><p>Choose your favourites and send a pickup request to the bakery.</p></div>
      {products.isLoading && <div className="loading-panel card"><p>Loading today’s menu…</p></div>}
      {products.isError && <div className="state-card card"><h2>Menu couldn’t load</h2><p>{products.error.message}</p><button className="button button-outline" onClick={() => void products.refetch()}>Try again</button></div>}
      {!products.isLoading && products.data?.length === 0 && <div className="state-card card"><h2>Menu coming soon</h2><p>The bakery hasn’t published products yet. Please check back later.</p></div>}
      <div className="store-product-grid">{products.data?.map((product) => {
        const photo = getProductPhoto(product.item_name);
        return <article className="store-product-card card" key={product.id}><img src={photo.url} alt={`Illustrative ${photo.label} photo`} loading="lazy"/><div className="store-product-copy"><h3>{product.item_name}</h3><strong>{money(product.current_price)}</strong><div className="quantity-control"><button aria-label={`Remove one ${product.item_name}`} disabled={!quantities[product.id]} onClick={() => setQuantities((current) => ({ ...current, [product.id]: Math.max((current[product.id] ?? 0) - 1, 0) }))}><Minus size={14}/></button><span>{quantities[product.id] ?? 0}</span><button aria-label={`Add one ${product.item_name}`} onClick={() => setQuantities((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))}><Plus size={14}/></button></div></div></article>;
      })}</div>
    </section>
    <aside className="store-order-card card"><div className="store-order-title"><ShoppingBag size={18}/><h3>Your pickup order</h3></div>
      {selectedProducts.map((product) => <div className="cart-line" key={product.id}><span>{quantities[product.id]} × {product.item_name}</span><strong>{money(product.current_price * quantities[product.id])}</strong></div>)}
      <div className="cart-total"><span>Estimated total</span><strong>{money(total)}</strong></div>
      <form onSubmit={(event) => { event.preventDefault(); orderMutation.mutate({ customer_name: customerName, customer_phone: phone, pickup_at: pickupAt || null, items: selectedProducts.map((product) => ({ product_id: product.id, quantity: quantities[product.id] })) }); }}>
        <label>Your name<input required maxLength={160} value={customerName} onChange={(event) => setCustomerName(event.target.value)}/></label>
        <label>Phone number<input required type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)}/></label>
        <label>Preferred pickup time<input type="datetime-local" value={pickupAt} onChange={(event) => setPickupAt(event.target.value)}/></label>
        <p className="payment-disclaimer">Payment is not collected online. The bakery will confirm payment with you.</p>
        {orderMutation.isError && <p className="error-text">{orderMutation.error.message}</p>}
        <button className="button button-primary" disabled={!selectedProducts.length || orderMutation.isPending}>{orderMutation.isPending ? "Sending request…" : "Place pickup request"}</button>
      </form>
    </aside>
  </div>;
}
