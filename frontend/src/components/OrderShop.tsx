import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { getStoreProducts, placeCustomerOrder, type PublicStoreOrder } from "../services/api";
import { CustomerOrderStatus } from "./CustomerOrderStatus";
import { readCustomerOrderCodes, saveCustomerOrderCodes } from "../data/customerOrders";
import { getProductPhoto } from "../data/productPhotos";

const money = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

export function OrderShop() {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [savedCodes, setSavedCodes] = useState(readCustomerOrderCodes);
  const [activeCode, setActiveCode] = useState(() => savedCodes[0] ?? "");
  const [codeInput, setCodeInput] = useState("");
  const [placedCode, setPlacedCode] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  useEffect(() => saveCustomerOrderCodes(savedCodes), [savedCodes]);
  const rememberOrder = useCallback((code: string) => {
    setSavedCodes((current) => current.includes(code) ? current : [code, ...current].slice(0, 20));
  }, []);
  const products = useQuery({ queryKey: ["store-products"], queryFn: getStoreProducts });
  const orderMutation = useMutation({
    mutationFn: placeCustomerOrder,
    onSuccess: (created) => {
      const { public_code, status, payment_status, pickup_at, total, items } = created;
      queryClient.setQueryData<PublicStoreOrder>(["store-order", public_code], {
        public_code, status, payment_status, pickup_at, total,
        items: items.map(({ product_name, quantity, line_total }) => ({ product_name, quantity, line_total })),
      });
      rememberOrder(public_code);
      setActiveCode(public_code);
      setPlacedCode(public_code);
      setCodeInput("");
      setQuantities({});
      setPickupAt("");
      requestAnimationFrame(() => {
        menuRef.current?.focus({ preventScroll: true });
        menuRef.current?.scrollIntoView({ block: "start" });
      });
    },
  });
  const selectedProducts = useMemo(() => (products.data ?? []).filter((product) => quantities[product.id]), [products.data, quantities]);
  const total = selectedProducts.reduce((sum, product) => sum + product.current_price * quantities[product.id], 0);

  return <div className="customer-order-page" ref={menuRef} tabIndex={-1} aria-label="Menu and your orders">
    {placedCode && <p className="customer-order-success" role="status">Your order has been placed. You can order again below and follow order <strong>{placedCode}</strong> in Your orders.</p>}
    <section className="customer-order-tracker card" id="customer-orders" aria-labelledby="customer-orders-heading">
      <div className="customer-tracker-heading"><div><span className="section-eyebrow">FOLLOW YOUR PICKUP</span><h2 id="customer-orders-heading">Your orders</h2><p>Check an order without leaving the menu.</p></div><a href="#customer-menu" className="button button-outline">Browse menu</a></div>
      <div className="customer-tracking-controls">
        {savedCodes.length > 0 && <label>Recent orders on this browser<select value={savedCodes.includes(activeCode) ? activeCode : ""} onChange={(event) => setActiveCode(event.target.value)}><option value="" disabled>Select an order</option>{savedCodes.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>}
        <form onSubmit={(event) => { event.preventDefault(); const code = codeInput.trim(); if (code) { setActiveCode(code); if (code === activeCode) void queryClient.invalidateQueries({ queryKey: ["store-order", code] }); } }}><label>Track with an order code<input required maxLength={80} value={codeInput} onChange={(event) => setCodeInput(event.target.value)} placeholder="Enter your order code" autoComplete="off" autoCapitalize="none" spellCheck={false}/></label><button className="button button-primary" disabled={!codeInput.trim()}>Track order</button></form>
      </div>
      {activeCode ? <CustomerOrderStatus key={activeCode} code={activeCode} onFound={rememberOrder}/> : <p className="customer-status-note">Place an order and its status will appear here. Save your order code to track it from another device.</p>}
      {savedCodes.length > 0 && <button type="button" className="customer-forget-orders" onClick={() => { setSavedCodes([]); setActiveCode(""); setPlacedCode(""); }}>Clear saved order codes from this browser</button>}
    </section>
    <div className="storefront-layout" id="customer-menu">
      <section className="storefront-main"><div className="storefront-heading"><span className="section-eyebrow">FRESH FROM FLORA BAKES</span><h2>Order for pickup</h2><p>Choose your favourites and send a pickup request to the bakery.</p></div>
        {products.isLoading && <div className="loading-panel card"><p>Loading today’s menu…</p></div>}
        {products.isError && <div className="state-card card"><h2>Menu couldn’t load</h2><p>{products.error.message}</p><button className="button button-outline" onClick={() => void products.refetch()}>Try again</button></div>}
        {!products.isLoading && products.data?.length === 0 && <div className="state-card card"><h2>Menu coming soon</h2><p>The bakery hasn’t published products yet. Please check back later.</p></div>}
        <div className="store-product-grid">{products.data?.map((product) => {
          const photo = getProductPhoto(product.item_name);
          return <article className="store-product-card card" key={product.id}><img src={photo.url} alt={`Representative ${photo.label} image`} loading="lazy"/><div className="store-product-copy"><h3>{product.item_name}</h3><strong>{money(product.current_price)}</strong><div className="quantity-control"><button aria-label={`Remove one ${product.item_name}`} disabled={!quantities[product.id]} onClick={() => setQuantities((current) => ({ ...current, [product.id]: Math.max((current[product.id] ?? 0) - 1, 0) }))}><Minus size={14}/></button><span>{quantities[product.id] ?? 0}</span><button aria-label={`Add one ${product.item_name}`} onClick={() => setQuantities((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))}><Plus size={14}/></button></div></div></article>;
        })}</div>
        <p className="product-image-note"><a href="/images/products/credits.html" target="_blank" rel="noreferrer">Product image credits</a></p>
      </section>
      <aside className="store-order-card card"><div className="store-order-title"><ShoppingBag size={18}/><h3>Your pickup order</h3></div>
        {selectedProducts.map((product) => <div className="cart-line" key={product.id}><span>{quantities[product.id]} × {product.item_name}</span><strong>{money(product.current_price * quantities[product.id])}</strong></div>)}
        <div className="cart-total"><span>Estimated total</span><strong>{money(total)}</strong></div>
        <form onSubmit={(event) => { event.preventDefault(); if (!selectedProducts.length || orderMutation.isPending) return; orderMutation.mutate({ customer_name: customerName, customer_phone: phone, pickup_at: pickupAt || null, items: selectedProducts.map((product) => ({ product_id: product.id, quantity: quantities[product.id] })) }); }}>
          <label>Your name<input required maxLength={160} value={customerName} onChange={(event) => setCustomerName(event.target.value)}/></label>
          <label>Phone number<input required type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)}/></label>
          <label>Preferred pickup time<input type="datetime-local" value={pickupAt} onChange={(event) => setPickupAt(event.target.value)}/></label>
          <p className="payment-disclaimer">Payment is not collected online. The bakery will confirm payment with you.</p>
          {orderMutation.isError && <p className="error-text">{orderMutation.error.message}</p>}
          <button className="button button-primary" disabled={!selectedProducts.length || orderMutation.isPending}>{orderMutation.isPending ? "Sending request…" : "Place pickup request"}</button>
        </form>
      </aside>
    </div>
  </div>;
}
